use crate::{
    error::{AppError, MessageValues},
    process::hide_console,
    toolchain::Toolchain,
};
use serde::Serialize;
use std::{
    collections::HashMap,
    io::Write,
    net::{Ipv4Addr, Ipv6Addr},
    process::{Child, Command, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

const DEVICE_SCAN_TIMEOUT: Duration = Duration::from_secs(10);
const ADB_OPERATION_TIMEOUT: Duration = Duration::from_secs(20);
const POLL_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub serial: String,
    pub state: String,
    pub model: Option<String>,
    pub product: Option<String>,
    pub device: Option<String>,
    pub transport_id: Option<String>,
    pub connection: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_values: Option<MessageValues>,
}

fn adb_command(toolchain: &Toolchain) -> Command {
    let mut command = Command::new(&toolchain.adb);
    command.current_dir(&toolchain.directory);
    hide_console(&mut command);
    command
}

pub fn list_devices(toolchain: &Toolchain) -> Result<Vec<Device>, AppError> {
    let mut command = adb_command(toolchain);
    command
        .args(["devices", "-l"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let child = command.spawn().map_err(|error| {
        AppError::new("backend.error.runAdb").with_value("details", error.to_string())
    })?;
    let output = wait_with_output_timeout(child, DEVICE_SCAN_TIMEOUT, "adb devices")?;

    if !output.status.success() {
        return Err(command_error(&output.stderr));
    }

    Ok(parse_devices(&String::from_utf8_lossy(&output.stdout)))
}

fn wait_with_output_timeout(
    mut child: Child,
    timeout: Duration,
    operation: &str,
) -> Result<Output, AppError> {
    let deadline = Instant::now() + timeout;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => {
                return child.wait_with_output().map_err(|error| {
                    AppError::new("backend.error.waitOperation")
                        .with_value("operation", operation.to_owned())
                        .with_value("details", error.to_string())
                });
            }
            Ok(None) if Instant::now() < deadline => thread::sleep(POLL_INTERVAL),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(AppError::new("backend.error.operationTimeout")
                    .with_value("operation", operation.to_owned())
                    .with_value("seconds", timeout.as_secs().to_string()));
            }
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(AppError::new("backend.error.readOperation")
                    .with_value("operation", operation.to_owned())
                    .with_value("details", error.to_string()));
            }
        }
    }
}

pub fn pair_device(
    toolchain: &Toolchain,
    address: &str,
    pairing_code: &str,
) -> Result<OperationResult, AppError> {
    validate_address(address)?;
    validate_pairing_code(pairing_code)?;

    let mut child = adb_command(toolchain)
        .args(["pair", address])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            AppError::new("backend.error.startPair").with_value("details", error.to_string())
        })?;

    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| AppError::new("backend.error.pairingInput"))?;
    stdin
        .write_all(format!("{pairing_code}\n").as_bytes())
        .map_err(|error| {
            AppError::new("backend.error.writePairingCode").with_value("details", error.to_string())
        })?;
    drop(stdin);

    let output = wait_with_output_timeout(child, ADB_OPERATION_TIMEOUT, "adb pair")?;
    Ok(output_result(
        output.status.success(),
        &output.stdout,
        &output.stderr,
    ))
}

pub fn connect_device(toolchain: &Toolchain, address: &str) -> Result<OperationResult, AppError> {
    validate_address(address)?;
    run_operation(toolchain, &["connect", address], "adb connect")
}

pub fn disconnect_device(
    toolchain: &Toolchain,
    address: &str,
) -> Result<OperationResult, AppError> {
    validate_address(address)?;
    run_operation(toolchain, &["disconnect", address], "adb disconnect")
}

pub fn restart_server(toolchain: &Toolchain) -> Result<OperationResult, AppError> {
    let mut command = adb_command(toolchain);
    command
        .arg("kill-server")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let child = command.spawn().map_err(|error| {
        AppError::new("backend.error.stopAdb").with_value("details", error.to_string())
    })?;
    let kill = wait_with_output_timeout(child, ADB_OPERATION_TIMEOUT, "adb kill-server")?;
    if !kill.status.success() {
        return Ok(output_result(false, &kill.stdout, &kill.stderr));
    }
    run_operation(toolchain, &["start-server"], "adb start-server")
}

fn run_operation(
    toolchain: &Toolchain,
    arguments: &[&str],
    name: &str,
) -> Result<OperationResult, AppError> {
    let mut command = adb_command(toolchain);
    command
        .args(arguments)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let child = command.spawn().map_err(|error| {
        AppError::new("backend.error.runOperation")
            .with_value("operation", name.to_owned())
            .with_value("details", error.to_string())
    })?;
    let output = wait_with_output_timeout(child, ADB_OPERATION_TIMEOUT, name)?;
    Ok(output_result(
        output.status.success(),
        &output.stdout,
        &output.stderr,
    ))
}

fn output_result(success: bool, stdout: &[u8], stderr: &[u8]) -> OperationResult {
    let stdout = String::from_utf8_lossy(stdout).trim().to_owned();
    let stderr = String::from_utf8_lossy(stderr).trim().to_owned();
    let message = match (stdout.is_empty(), stderr.is_empty()) {
        (false, false) => Some(format!("{stdout}\n{stderr}")),
        (false, true) => Some(stdout),
        (true, false) => Some(stderr),
        (true, true) => None,
    };
    let message_key = message.is_none().then(|| {
        if success {
            "backend.operation.completed"
        } else {
            "backend.operation.failed"
        }
        .to_owned()
    });
    OperationResult {
        success,
        message,
        message_key,
        message_values: None,
    }
}

fn command_error(stderr: &[u8]) -> AppError {
    let message = String::from_utf8_lossy(stderr).trim().to_owned();
    if message.is_empty() {
        AppError::new("backend.error.adbDevices")
    } else {
        AppError::new("backend.error.runAdb").with_value("details", message)
    }
}

pub fn validate_address(address: &str) -> Result<(), AppError> {
    if address.is_empty() || address.len() > 255 || address != address.trim() {
        return Err(AppError::new("backend.error.invalidAddress"));
    }
    if address.chars().any(char::is_whitespace)
        || !address.chars().all(|char| {
            char.is_ascii_alphanumeric() || matches!(char, '.' | ':' | '-' | '[' | ']' | '%' | '_')
        })
    {
        return Err(AppError::new("backend.error.unsupportedAddress"));
    }

    let (host, port) = if let Some(bracketed) = address.strip_prefix('[') {
        let (host, port) = bracketed
            .split_once("]:")
            .ok_or_else(|| AppError::new("backend.error.invalidAddress"))?;
        if host.is_empty() || port.contains(':') || port.contains(']') {
            return Err(AppError::new("backend.error.invalidAddress"));
        }
        validate_ipv6_host(host)?;
        (host, port)
    } else {
        let (host, port) = address
            .rsplit_once(':')
            .ok_or_else(|| AppError::new("backend.error.invalidAddress"))?;
        if host.is_empty() || host.contains(':') || port.contains(':') {
            return Err(AppError::new("backend.error.invalidAddress"));
        }
        validate_network_host(host)?;
        (host, port)
    };

    debug_assert!(!host.is_empty());
    if port.is_empty()
        || !port.bytes().all(|byte| byte.is_ascii_digit())
        || port.parse::<u16>().ok().filter(|port| *port != 0).is_none()
    {
        return Err(AppError::new("backend.error.invalidAddress"));
    }
    Ok(())
}

fn validate_ipv6_host(host: &str) -> Result<(), AppError> {
    let (address, zone) = host
        .split_once('%')
        .map_or((host, None), |(address, zone)| (address, Some(zone)));
    if address.parse::<Ipv6Addr>().is_err()
        || zone.is_some_and(|zone| {
            zone.is_empty()
                || !zone
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
        })
    {
        return Err(AppError::new("backend.error.invalidAddress"));
    }
    Ok(())
}

fn validate_network_host(host: &str) -> Result<(), AppError> {
    if host
        .bytes()
        .all(|byte| byte.is_ascii_digit() || byte == b'.')
    {
        return host
            .parse::<Ipv4Addr>()
            .map(|_| ())
            .map_err(|_| AppError::new("backend.error.invalidAddress"));
    }

    let host = host.strip_suffix('.').unwrap_or(host);
    if host.is_empty()
        || host.split('.').any(|label| {
            label.is_empty()
                || label.len() > 63
                || !label
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
                || !label
                    .as_bytes()
                    .first()
                    .is_some_and(u8::is_ascii_alphanumeric)
                || !label
                    .as_bytes()
                    .last()
                    .is_some_and(u8::is_ascii_alphanumeric)
        })
    {
        return Err(AppError::new("backend.error.invalidAddress"));
    }
    Ok(())
}

fn validate_pairing_code(pairing_code: &str) -> Result<(), AppError> {
    if pairing_code.len() == 6 && pairing_code.bytes().all(|byte| byte.is_ascii_digit()) {
        Ok(())
    } else {
        Err(AppError::new("backend.error.invalidPairingCode"))
    }
}

pub fn parse_devices(output: &str) -> Vec<Device> {
    output
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty()
                || line.starts_with("List of devices attached")
                || line.starts_with('*')
            {
                return None;
            }

            let mut columns = line.split_whitespace();
            let serial = columns.next()?.to_owned();
            let state = columns.next().unwrap_or("unknown").to_owned();
            let fields: HashMap<&str, &str> = columns
                .filter_map(|column| column.split_once(':'))
                .collect();

            let connection = if serial.starts_with("emulator-") {
                "emulator"
            } else if serial.contains(':') {
                "tcpip"
            } else {
                "usb"
            };

            Some(Device {
                serial,
                state,
                model: fields.get("model").map(|value| value.replace('_', " ")),
                product: fields.get("product").map(|value| (*value).to_owned()),
                device: fields.get("device").map(|value| (*value).to_owned()),
                transport_id: fields.get("transport_id").map(|value| (*value).to_owned()),
                connection: connection.to_owned(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_devices_states_metadata_and_connection_types() {
        let output = concat!(
            "List of devices attached\r\n",
            "* daemon started successfully\r\n",
            "R58M123 device usb:1-1 product:beyond model:Galaxy_S10 ",
            "device:beyond transport_id:1\r\n",
            "192.168.1.4:5555 unauthorized transport_id:2\r\n",
            "emulator-5554 offline\r\n",
            "[fe80::1%en0]:4321 device model:Pixel_8_Pro malformed\r\n",
            "SERIAL_ONLY\r\n",
        );
        let devices = parse_devices(output);

        assert_eq!(devices.len(), 5);
        assert_eq!(devices[0].serial, "R58M123");
        assert_eq!(devices[0].state, "device");
        assert_eq!(devices[0].model.as_deref(), Some("Galaxy S10"));
        assert_eq!(devices[0].product.as_deref(), Some("beyond"));
        assert_eq!(devices[0].device.as_deref(), Some("beyond"));
        assert_eq!(devices[0].transport_id.as_deref(), Some("1"));
        assert_eq!(devices[0].connection, "usb");
        assert_eq!(devices[1].state, "unauthorized");
        assert_eq!(devices[1].connection, "tcpip");
        assert_eq!(devices[2].connection, "emulator");
        assert_eq!(devices[3].model.as_deref(), Some("Pixel 8 Pro"));
        assert_eq!(devices[3].connection, "tcpip");
        assert_eq!(devices[4].state, "unknown");
        assert_eq!(devices[4].connection, "usb");
    }

    #[test]
    fn accepts_supported_network_addresses() {
        for address in [
            "192.168.1.2:5555",
            "localhost:1",
            "android-device.local:65535",
            "android-device.local.:05555",
            "[::1]:5555",
            "[2001:db8::42]:4321",
            "[fe80::1%en0]:5555",
            "[fe80::1%usb_ethernet-2.1]:5555",
        ] {
            assert!(
                validate_address(address).is_ok(),
                "{address} should be accepted"
            );
        }
    }

    #[test]
    fn rejects_structurally_invalid_network_addresses() {
        for address in [
            "",
            "missing-port",
            ":5555",
            "host:",
            "host:0",
            "host:65536",
            "host:not-a-port",
            "host:12:34",
            " host:5555",
            "host:5555 ",
            "999.1.1.1:5555",
            "1.2.3:5555",
            "bad..host:5555",
            "-host:5555",
            "host-:5555",
            "[::1]",
            "[]:5555",
            "[::1]:",
            "[::1]:65536",
            "[invalid]:5555",
            "[fe80::1%]:5555",
            "[fe80::1%en0%extra]:5555",
            "fe80::1:5555",
        ] {
            assert_eq!(
                validate_address(address).unwrap_err().key,
                "backend.error.invalidAddress",
                "{address} should be rejected as invalid"
            );
        }
    }

    #[test]
    fn rejects_unsupported_address_characters() {
        for address in [
            "127.0.0.1:5555;rm",
            "host name:5555",
            "host/other:5555",
            "host\t:5555",
            "höst:5555",
        ] {
            assert_eq!(
                validate_address(address).unwrap_err().key,
                "backend.error.unsupportedAddress",
                "{address:?} should be rejected as unsupported"
            );
        }
    }

    #[test]
    fn enforces_address_and_hostname_length_limits() {
        let long_address = format!("{}:5555", "a".repeat(251));
        assert_eq!(
            validate_address(&long_address).unwrap_err().key,
            "backend.error.invalidAddress"
        );

        let long_label = format!("{}.local:5555", "a".repeat(64));
        assert_eq!(
            validate_address(&long_label).unwrap_err().key,
            "backend.error.invalidAddress"
        );
    }

    #[test]
    fn accepts_only_six_ascii_pairing_digits() {
        assert!(validate_pairing_code("000000").is_ok());
        assert!(validate_pairing_code("123456").is_ok());

        for code in ["", "12345", "1234567", "12 456", "１２３４５６", "abcdef"] {
            assert_eq!(
                validate_pairing_code(code).unwrap_err().key,
                "backend.error.invalidPairingCode",
                "{code:?} should be rejected"
            );
        }
    }

    #[test]
    fn returns_localization_keys_only_when_adb_has_no_output() {
        let completed = output_result(true, b"", b"");
        assert_eq!(
            completed.message_key.as_deref(),
            Some("backend.operation.completed")
        );
        assert!(completed.message.is_none());

        let failed = output_result(false, b"", b"");
        assert_eq!(
            failed.message_key.as_deref(),
            Some("backend.operation.failed")
        );
        assert!(failed.message.is_none());
    }

    #[test]
    fn preserves_raw_adb_output_without_a_localization_key() {
        let result = output_result(true, b"connected to 192.168.1.2:5555\n", b"diagnostic\n");

        assert_eq!(
            result.message.as_deref(),
            Some("connected to 192.168.1.2:5555\ndiagnostic")
        );
        assert!(result.message_key.is_none());
    }

    #[test]
    fn reports_specific_and_fallback_adb_command_errors() {
        let specific = command_error(b"  permission denied\n");
        assert_eq!(specific.key, "backend.error.runAdb");
        assert_eq!(
            specific.values.get("details").map(String::as_str),
            Some("permission denied")
        );

        assert_eq!(command_error(b" \n").key, "backend.error.adbDevices");
    }
}
