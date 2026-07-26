use crate::{error::AppError, process::hide_console};
use serde::Serialize;
use std::{path::PathBuf, process::Command};
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug)]
pub struct Toolchain {
    pub directory: PathBuf,
    pub scrcpy: PathBuf,
    pub adb: PathBuf,
    pub server: PathBuf,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolchainInfo {
    pub available: bool,
    pub platform: String,
    pub directory: Option<String>,
    pub scrcpy_version: Option<String>,
    pub error: Option<AppError>,
}

pub fn platform_key() -> &'static str {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return "macos-aarch64";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return "macos-x86_64";
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return "windows-x86_64";
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    return "windows-aarch64";
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return "linux-x86_64";

    #[allow(unreachable_code)]
    "unsupported"
}

impl Toolchain {
    pub fn locate(app: &AppHandle) -> Result<Self, AppError> {
        let key = platform_key();
        if key == "unsupported" {
            return Err(
                AppError::new("backend.error.unsupportedToolchain").with_value(
                    "platform",
                    format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
                ),
            );
        }

        let mut candidates = Vec::new();
        if let Ok(resources) = app.path().resource_dir() {
            candidates.push(resources.join("toolchains").join(key));
        }
        candidates.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join("toolchains")
                .join(key),
        );

        let executable_suffix = if cfg!(windows) { ".exe" } else { "" };
        for directory in candidates {
            let toolchain = Self {
                scrcpy: directory.join(format!("scrcpy{executable_suffix}")),
                adb: directory.join(format!("adb{executable_suffix}")),
                server: directory.join("scrcpy-server"),
                directory,
            };

            if toolchain.scrcpy.is_file() && toolchain.adb.is_file() && toolchain.server.is_file() {
                return Ok(toolchain);
            }
        }

        Err(AppError::new("backend.error.missingToolchain").with_value("platform", key.to_owned()))
    }

    pub fn info(app: &AppHandle) -> ToolchainInfo {
        match Self::locate(app) {
            Ok(toolchain) => {
                let mut command = Command::new(&toolchain.scrcpy);
                command
                    .arg("--version")
                    .current_dir(&toolchain.directory)
                    .env("ADB", &toolchain.adb)
                    .env("SCRCPY_SERVER_PATH", &toolchain.server)
                    .env("SCRCPY_ICON_DIR", &toolchain.directory);
                hide_console(&mut command);

                match command.output() {
                    Ok(output) if output.status.success() => ToolchainInfo {
                        available: true,
                        platform: platform_key().to_owned(),
                        directory: Some(toolchain.directory.display().to_string()),
                        scrcpy_version: parse_scrcpy_version(&output.stdout),
                        error: None,
                    },
                    Ok(output) => {
                        let details = command_failure_details(
                            &output.stdout,
                            &output.stderr,
                            &output.status.to_string(),
                        );
                        ToolchainInfo {
                            available: false,
                            platform: platform_key().to_owned(),
                            directory: Some(toolchain.directory.display().to_string()),
                            scrcpy_version: None,
                            error: Some(
                                AppError::new("backend.error.runScrcpy")
                                    .with_value("details", details),
                            ),
                        }
                    }
                    Err(error) => ToolchainInfo {
                        available: false,
                        platform: platform_key().to_owned(),
                        directory: Some(toolchain.directory.display().to_string()),
                        scrcpy_version: None,
                        error: Some(
                            AppError::new("backend.error.runScrcpy")
                                .with_value("details", error.to_string()),
                        ),
                    },
                }
            }
            Err(error) => ToolchainInfo {
                available: false,
                platform: platform_key().to_owned(),
                directory: None,
                scrcpy_version: None,
                error: Some(error),
            },
        }
    }
}

fn parse_scrcpy_version(stdout: &[u8]) -> Option<String> {
    String::from_utf8_lossy(stdout)
        .lines()
        .find(|line| line.trim_start().starts_with("scrcpy"))
        .map(str::trim)
        .map(ToOwned::to_owned)
}

fn command_failure_details(stdout: &[u8], stderr: &[u8], status: &str) -> String {
    let stderr = String::from_utf8_lossy(stderr).trim().to_owned();
    if !stderr.is_empty() {
        return stderr;
    }

    let stdout = String::from_utf8_lossy(stdout).trim().to_owned();
    if !stdout.is_empty() {
        stdout
    } else {
        status.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_the_scrcpy_version_line() {
        assert_eq!(
            parse_scrcpy_version(
                b"scrcpy 3.3 <https://github.com/Genymobile/scrcpy>\nDependencies:\n"
            )
            .as_deref(),
            Some("scrcpy 3.3 <https://github.com/Genymobile/scrcpy>")
        );
        assert_eq!(
            parse_scrcpy_version(b"header\n   scrcpy 3.2.1  \nfooter\n").as_deref(),
            Some("scrcpy 3.2.1")
        );
        assert_eq!(parse_scrcpy_version(b"version unavailable\n"), None);
    }

    #[test]
    fn chooses_stderr_then_stdout_then_exit_status_for_failures() {
        assert_eq!(
            command_failure_details(b"stdout\n", b"  stderr\n", "exit status: 1"),
            "stderr"
        );
        assert_eq!(
            command_failure_details(b"  stdout\n", b" \n", "exit status: 1"),
            "stdout"
        );
        assert_eq!(
            command_failure_details(b"", b"", "exit status: 7"),
            "exit status: 7"
        );
    }
}
