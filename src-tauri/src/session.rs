use crate::{
    error::{AppError, MessageValues},
    process::hide_console,
    toolchain::Toolchain,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Read},
    process::{Child, Command, Stdio},
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};

static SESSION_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub serial: String,
    pub max_size: Option<u32>,
    pub max_fps: Option<u32>,
    pub video_bitrate_mbps: Option<u32>,
    pub video_codec: String,
    pub audio: bool,
    pub control: bool,
    pub turn_screen_off: bool,
    pub stay_awake: bool,
    pub fullscreen: bool,
    pub always_on_top: bool,
    pub borderless: bool,
    pub keyboard_mode: String,
    pub record_path: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub device_serial: String,
    pub started_at_ms: u128,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEvent {
    pub event_type: String,
    pub session_id: String,
    pub device_serial: String,
    pub level: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_values: Option<MessageValues>,
    pub exit_code: Option<i32>,
    pub timestamp_ms: u128,
}

trait SessionEventSink: Clone + Send + 'static {
    fn send(&self, event: SessionEvent);
}

impl SessionEventSink for AppHandle {
    fn send(&self, event: SessionEvent) {
        let _ = self.emit("session-event", event);
    }
}

struct SessionEntry {
    child: Arc<Mutex<Child>>,
    device_serial: String,
    started_at_ms: u128,
}

#[derive(Clone, Default)]
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, SessionEntry>>>,
}

impl SessionManager {
    pub fn start(
        &self,
        app: AppHandle,
        toolchain: Toolchain,
        request: StartSessionRequest,
    ) -> Result<SessionInfo, AppError> {
        self.start_with_sink(app, toolchain, request)
    }

    fn start_with_sink<S: SessionEventSink>(
        &self,
        sink: S,
        toolchain: Toolchain,
        request: StartSessionRequest,
    ) -> Result<SessionInfo, AppError> {
        let arguments = build_arguments(&request)?;
        let serial = request.serial.trim().to_owned();
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| AppError::new("backend.error.sessionState"))?;
        if sessions
            .values()
            .any(|session| session.device_serial == serial)
        {
            return Err(AppError::new("backend.error.sessionExists"));
        }

        let mut command = Command::new(&toolchain.scrcpy);
        command
            .args(&arguments)
            .current_dir(&toolchain.directory)
            .env("ADB", &toolchain.adb)
            .env("SCRCPY_SERVER_PATH", &toolchain.server)
            .env("SCRCPY_ICON_DIR", &toolchain.directory)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        hide_console(&mut command);

        let mut child = command.spawn().map_err(|error| {
            AppError::new("backend.error.startScrcpy").with_value("details", error.to_string())
        })?;
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let started_at_ms = now_ms();
        let session_id = format!(
            "session-{started_at_ms}-{}",
            SESSION_SEQUENCE.fetch_add(1, Ordering::Relaxed)
        );
        let child = Arc::new(Mutex::new(child));

        sessions.insert(
            session_id.clone(),
            SessionEntry {
                child: Arc::clone(&child),
                device_serial: serial.clone(),
                started_at_ms,
            },
        );
        drop(sessions);

        sink.send(SessionEvent {
            event_type: "started".to_owned(),
            session_id: session_id.clone(),
            device_serial: serial.clone(),
            level: "info".to_owned(),
            message: None,
            message_key: Some("backend.session.started".to_owned()),
            message_values: Some(MessageValues::from([(
                "arguments".to_owned(),
                arguments.join(" "),
            )])),
            exit_code: None,
            timestamp_ms: now_ms(),
        });

        if let Some(stdout) = stdout {
            spawn_log_reader(
                sink.clone(),
                session_id.clone(),
                serial.clone(),
                "info",
                stdout,
            );
        }
        if let Some(stderr) = stderr {
            spawn_log_reader(
                sink.clone(),
                session_id.clone(),
                serial.clone(),
                "stderr",
                stderr,
            );
        }
        self.spawn_exit_watcher(sink, session_id.clone(), serial.clone(), child);

        Ok(SessionInfo {
            id: session_id,
            device_serial: serial,
            started_at_ms,
        })
    }

    pub fn stop(&self, app: &AppHandle, session_id: &str) -> Result<(), AppError> {
        self.stop_with_sink(app.clone(), session_id)
    }

    fn stop_with_sink<S: SessionEventSink>(
        &self,
        sink: S,
        session_id: &str,
    ) -> Result<(), AppError> {
        let (child, serial) = {
            let sessions = self
                .sessions
                .lock()
                .map_err(|_| AppError::new("backend.error.sessionState"))?;
            let session = sessions
                .get(session_id)
                .ok_or_else(|| AppError::new("backend.error.sessionNotFound"))?;
            (Arc::clone(&session.child), session.device_serial.clone())
        };

        child
            .lock()
            .map_err(|_| AppError::new("backend.error.scrcpyProcess"))?
            .kill()
            .map_err(|error| {
                AppError::new("backend.error.stopScrcpy").with_value("details", error.to_string())
            })?;

        sink.send(SessionEvent {
            event_type: "stopping".to_owned(),
            session_id: session_id.to_owned(),
            device_serial: serial,
            level: "info".to_owned(),
            message: None,
            message_key: Some("backend.session.stopping".to_owned()),
            message_values: None,
            exit_code: None,
            timestamp_ms: now_ms(),
        });
        Ok(())
    }

    pub fn list(&self) -> Result<Vec<SessionInfo>, AppError> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| AppError::new("backend.error.sessionState"))?;
        Ok(sessions
            .iter()
            .map(|(id, session)| SessionInfo {
                id: id.clone(),
                device_serial: session.device_serial.clone(),
                started_at_ms: session.started_at_ms,
            })
            .collect())
    }

    pub fn stop_all(&self) {
        let children = match self.sessions.lock() {
            Ok(sessions) => sessions
                .values()
                .map(|session| Arc::clone(&session.child))
                .collect::<Vec<_>>(),
            Err(_) => return,
        };
        for child in children {
            if let Ok(mut child) = child.lock() {
                let _ = child.kill();
            }
        }
    }

    fn spawn_exit_watcher<S: SessionEventSink>(
        &self,
        sink: S,
        session_id: String,
        serial: String,
        child: Arc<Mutex<Child>>,
    ) {
        let manager = self.clone();
        thread::spawn(move || {
            loop {
                let result = match child.lock() {
                    Ok(mut child) => child.try_wait(),
                    Err(_) => {
                        if let Ok(mut sessions) = manager.sessions.lock() {
                            sessions.remove(&session_id);
                        }
                        sink.send(SessionEvent {
                            event_type: "error".to_owned(),
                            session_id: session_id.clone(),
                            device_serial: serial.clone(),
                            level: "error".to_owned(),
                            message: None,
                            message_key: Some("backend.session.processStatus".to_owned()),
                            message_values: None,
                            exit_code: None,
                            timestamp_ms: now_ms(),
                        });
                        break;
                    }
                };

                match result {
                    Ok(Some(status)) => {
                        if let Ok(mut sessions) = manager.sessions.lock() {
                            sessions.remove(&session_id);
                        }
                        let message_key = if status.success() {
                            "backend.session.ended"
                        } else {
                            "backend.session.abnormalExit"
                        };
                        let message_values = (!status.success()).then(|| {
                            MessageValues::from([("details".to_owned(), status.to_string())])
                        });
                        sink.send(SessionEvent {
                            event_type: "exited".to_owned(),
                            session_id: session_id.clone(),
                            device_serial: serial.clone(),
                            level: if status.success() { "info" } else { "error" }.to_owned(),
                            message: None,
                            message_key: Some(message_key.to_owned()),
                            message_values,
                            exit_code: status.code(),
                            timestamp_ms: now_ms(),
                        });
                        break;
                    }
                    Ok(None) => thread::sleep(Duration::from_millis(200)),
                    Err(error) => {
                        if let Ok(mut sessions) = manager.sessions.lock() {
                            sessions.remove(&session_id);
                        }
                        sink.send(SessionEvent {
                            event_type: "error".to_owned(),
                            session_id: session_id.clone(),
                            device_serial: serial.clone(),
                            level: "error".to_owned(),
                            message: None,
                            message_key: Some("backend.session.readStatus".to_owned()),
                            message_values: Some(MessageValues::from([(
                                "details".to_owned(),
                                error.to_string(),
                            )])),
                            exit_code: None,
                            timestamp_ms: now_ms(),
                        });
                        break;
                    }
                }
            }
        });
    }
}

pub fn build_arguments(request: &StartSessionRequest) -> Result<Vec<String>, AppError> {
    let serial = request.serial.trim();
    if serial.is_empty()
        || serial.len() > 255
        || serial
            .chars()
            .any(|character| character.is_whitespace() || character.is_control())
    {
        return Err(AppError::new("backend.error.invalidSerial"));
    }

    let mut arguments = vec![format!("--serial={serial}")];
    if let Some(max_size) = request.max_size {
        if !(240..=8192).contains(&max_size) {
            return Err(AppError::new("backend.error.invalidMaxSize"));
        }
        arguments.push(format!("--max-size={max_size}"));
    }
    if let Some(max_fps) = request.max_fps {
        if !(1..=240).contains(&max_fps) {
            return Err(AppError::new("backend.error.invalidFps"));
        }
        arguments.push(format!("--max-fps={max_fps}"));
    }
    if let Some(bitrate) = request.video_bitrate_mbps {
        if !(1..=100).contains(&bitrate) {
            return Err(AppError::new("backend.error.invalidBitrate"));
        }
        arguments.push(format!("--video-bit-rate={bitrate}M"));
    }

    match request.video_codec.as_str() {
        "h264" => {}
        "h265" | "av1" | "vp8" | "vp9" => {
            arguments.push(format!("--video-codec={}", request.video_codec))
        }
        _ => return Err(AppError::new("backend.error.unsupportedCodec")),
    }
    match request.keyboard_mode.as_str() {
        "default" => {}
        "uhid" => arguments.push("--keyboard=uhid".to_owned()),
        "disabled" => arguments.push("--keyboard=disabled".to_owned()),
        _ => return Err(AppError::new("backend.error.unsupportedKeyboard")),
    }

    if !request.audio {
        arguments.push("--no-audio".to_owned());
    }
    if !request.control {
        arguments.push("--no-control".to_owned());
    }
    if request.turn_screen_off {
        arguments.push("--turn-screen-off".to_owned());
    }
    if request.stay_awake {
        arguments.push("--stay-awake".to_owned());
    }
    if request.fullscreen {
        arguments.push("--fullscreen".to_owned());
    }
    if request.always_on_top {
        arguments.push("--always-on-top".to_owned());
    }
    if request.borderless {
        arguments.push("--window-borderless".to_owned());
    }
    if let Some(record_path) = request
        .record_path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
    {
        arguments.push(format!("--record={record_path}"));
    }

    arguments.push(format!("--window-title=MirroDeck · {serial}"));
    Ok(arguments)
}

fn spawn_log_reader<R: Read + Send + 'static, S: SessionEventSink>(
    sink: S,
    session_id: String,
    serial: String,
    level: &'static str,
    reader: R,
) {
    thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            if line.trim().is_empty() {
                continue;
            }
            sink.send(SessionEvent {
                event_type: "log".to_owned(),
                session_id: session_id.clone(),
                device_serial: serial.clone(),
                level: level.to_owned(),
                message: Some(line),
                message_key: None,
                message_values: None,
                exit_code: None,
                timestamp_ms: now_ms(),
            });
        }
    });
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::{Barrier, atomic::AtomicU64},
        time::Instant,
    };

    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(1);

    fn minimal_request(serial: &str) -> StartSessionRequest {
        StartSessionRequest {
            serial: serial.to_owned(),
            max_size: None,
            max_fps: None,
            video_bitrate_mbps: None,
            video_codec: "h264".to_owned(),
            audio: true,
            control: true,
            turn_screen_off: false,
            stay_awake: false,
            fullscreen: false,
            always_on_top: false,
            borderless: false,
            keyboard_mode: "default".to_owned(),
            record_path: None,
        }
    }

    fn request() -> StartSessionRequest {
        StartSessionRequest {
            serial: "R58M123".to_owned(),
            max_size: Some(1920),
            max_fps: Some(60),
            video_bitrate_mbps: Some(12),
            video_codec: "h265".to_owned(),
            audio: false,
            control: true,
            turn_screen_off: true,
            stay_awake: true,
            fullscreen: false,
            always_on_top: true,
            borderless: false,
            keyboard_mode: "uhid".to_owned(),
            record_path: Some("/tmp/recording.mp4".to_owned()),
        }
    }

    #[test]
    fn builds_structured_scrcpy_arguments() {
        assert_eq!(
            build_arguments(&request()).unwrap(),
            [
                "--serial=R58M123",
                "--max-size=1920",
                "--max-fps=60",
                "--video-bit-rate=12M",
                "--video-codec=h265",
                "--keyboard=uhid",
                "--no-audio",
                "--turn-screen-off",
                "--stay-awake",
                "--always-on-top",
                "--record=/tmp/recording.mp4",
                "--window-title=MirroDeck · R58M123",
            ]
        );
    }

    #[test]
    fn builds_minimal_arguments_and_trims_the_serial() {
        let request = minimal_request("  R58M123  ");
        assert_eq!(
            build_arguments(&request).unwrap(),
            ["--serial=R58M123", "--window-title=MirroDeck · R58M123"]
        );
    }

    #[test]
    fn validates_numeric_option_boundaries() {
        for value in [240, 8192] {
            let mut request = minimal_request("serial");
            request.max_size = Some(value);
            assert!(build_arguments(&request).is_ok());
        }
        for value in [0, 1, 239, 8193, u32::MAX] {
            let mut request = minimal_request("serial");
            request.max_size = Some(value);
            assert_eq!(
                build_arguments(&request).unwrap_err().key,
                "backend.error.invalidMaxSize"
            );
        }

        for value in [1, 240] {
            let mut request = minimal_request("serial");
            request.max_fps = Some(value);
            assert!(build_arguments(&request).is_ok());
        }
        for value in [0, 241, u32::MAX] {
            let mut request = minimal_request("serial");
            request.max_fps = Some(value);
            assert_eq!(
                build_arguments(&request).unwrap_err().key,
                "backend.error.invalidFps"
            );
        }

        for value in [1, 100] {
            let mut request = minimal_request("serial");
            request.video_bitrate_mbps = Some(value);
            assert!(build_arguments(&request).is_ok());
        }
        for value in [0, 101, u32::MAX] {
            let mut request = minimal_request("serial");
            request.video_bitrate_mbps = Some(value);
            assert_eq!(
                build_arguments(&request).unwrap_err().key,
                "backend.error.invalidBitrate"
            );
        }
    }

    #[test]
    fn supports_only_known_scrcpy_video_codecs() {
        for codec in ["h264", "h265", "av1", "vp8", "vp9"] {
            let mut request = minimal_request("serial");
            request.video_codec = codec.to_owned();
            let arguments = build_arguments(&request).unwrap();
            if codec == "h264" {
                assert!(
                    !arguments
                        .iter()
                        .any(|argument| argument.starts_with("--video-codec"))
                );
            } else {
                assert!(arguments.contains(&format!("--video-codec={codec}")));
            }
        }

        for codec in ["", "H264", " h264", "hevc", "raw"] {
            let mut request = minimal_request("serial");
            request.video_codec = codec.to_owned();
            assert_eq!(
                build_arguments(&request).unwrap_err().key,
                "backend.error.unsupportedCodec"
            );
        }
    }

    #[test]
    fn maps_keyboard_modes_and_rejects_unknown_values() {
        for (mode, expected) in [
            ("default", None),
            ("uhid", Some("--keyboard=uhid")),
            ("disabled", Some("--keyboard=disabled")),
        ] {
            let mut request = minimal_request("serial");
            request.keyboard_mode = mode.to_owned();
            let arguments = build_arguments(&request).unwrap();
            assert_eq!(
                arguments
                    .iter()
                    .find(|argument| argument.starts_with("--keyboard"))
                    .map(String::as_str),
                expected
            );
        }

        for mode in ["", "Default", "aoa", "uhid "] {
            let mut request = minimal_request("serial");
            request.keyboard_mode = mode.to_owned();
            assert_eq!(
                build_arguments(&request).unwrap_err().key,
                "backend.error.unsupportedKeyboard"
            );
        }
    }

    #[test]
    fn maps_all_boolean_switches() {
        let mut request = minimal_request("serial");
        request.audio = false;
        request.control = false;
        request.turn_screen_off = true;
        request.stay_awake = true;
        request.fullscreen = true;
        request.always_on_top = true;
        request.borderless = true;

        let arguments = build_arguments(&request).unwrap();
        for argument in [
            "--no-audio",
            "--no-control",
            "--turn-screen-off",
            "--stay-awake",
            "--fullscreen",
            "--always-on-top",
            "--window-borderless",
        ] {
            assert!(
                arguments.iter().any(|candidate| candidate == argument),
                "missing {argument}"
            );
        }
    }

    #[test]
    fn omits_blank_record_paths_and_trims_non_blank_paths() {
        for path in [None, Some(""), Some("  \t")] {
            let mut request = minimal_request("serial");
            request.record_path = path.map(ToOwned::to_owned);
            assert!(
                !build_arguments(&request)
                    .unwrap()
                    .iter()
                    .any(|argument| argument.starts_with("--record="))
            );
        }

        let mut request = minimal_request("serial");
        request.record_path = Some("  relative recording.mp4  ".to_owned());
        assert!(
            build_arguments(&request)
                .unwrap()
                .contains(&"--record=relative recording.mp4".to_owned())
        );
    }

    #[test]
    fn rejects_empty_oversized_whitespace_and_control_serials() {
        for serial in [
            "",
            " \t ",
            "serial with space",
            "serial\nnext",
            "serial\0next",
        ] {
            assert_eq!(
                build_arguments(&minimal_request(serial)).unwrap_err().key,
                "backend.error.invalidSerial",
                "{serial:?} should be rejected"
            );
        }

        assert_eq!(
            build_arguments(&minimal_request(&"s".repeat(256)))
                .unwrap_err()
                .key,
            "backend.error.invalidSerial"
        );
        assert!(build_arguments(&minimal_request(&"s".repeat(255))).is_ok());
    }

    #[derive(Clone, Default)]
    struct TestSink {
        events: Arc<Mutex<Vec<SessionEvent>>>,
    }

    impl SessionEventSink for TestSink {
        fn send(&self, event: SessionEvent) {
            self.events.lock().unwrap().push(event);
        }
    }

    impl TestSink {
        fn has_event(&self, event_type: &str) -> bool {
            self.events
                .lock()
                .unwrap()
                .iter()
                .any(|event| event.event_type == event_type)
        }

        fn count_events(&self, event_type: &str) -> usize {
            self.events
                .lock()
                .unwrap()
                .iter()
                .filter(|event| event.event_type == event_type)
                .count()
        }
    }

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new() -> Self {
            let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "mirro-deck-session-test-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir_all(&path).unwrap();
            Self { path }
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[derive(Clone, Copy)]
    enum FakeProcess {
        LongRunning,
        Successful,
        Failed,
    }

    fn fake_toolchain(directory: &Path, process: FakeProcess) -> Toolchain {
        #[cfg(unix)]
        let (executable, contents) = {
            let contents = match process {
                FakeProcess::LongRunning => concat!(
                    "#!/bin/sh\n",
                    "printf 'stdout line\\n\\n'\n",
                    "printf 'stderr line\\n' >&2\n",
                    "exec sleep 30\n",
                ),
                FakeProcess::Successful => "#!/bin/sh\nprintf 'done\\n'\nexit 0\n",
                FakeProcess::Failed => "#!/bin/sh\nprintf 'failed\\n' >&2\nexit 7\n",
            };
            (directory.join("fake-scrcpy"), contents)
        };

        #[cfg(windows)]
        let (executable, contents) = {
            let contents = match process {
                FakeProcess::LongRunning => concat!(
                    "@echo off\r\n",
                    "echo stdout line\r\n",
                    "1>&2 echo stderr line\r\n",
                    "ping -n 31 127.0.0.1 >NUL\r\n",
                ),
                FakeProcess::Successful => "@echo off\r\necho done\r\nexit /b 0\r\n",
                FakeProcess::Failed => "@echo off\r\n1>&2 echo failed\r\nexit /b 7\r\n",
            };
            (directory.join("fake-scrcpy.cmd"), contents)
        };

        fs::write(&executable, contents).unwrap();
        #[cfg(unix)]
        {
            let mut permissions = fs::metadata(&executable).unwrap().permissions();
            permissions.set_mode(0o755);
            fs::set_permissions(&executable, permissions).unwrap();
        }

        Toolchain {
            directory: directory.to_owned(),
            scrcpy: executable,
            adb: directory.join("unused-adb"),
            server: directory.join("unused-server"),
        }
    }

    fn wait_for(description: &str, mut condition: impl FnMut() -> bool) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while Instant::now() < deadline {
            if condition() {
                return;
            }
            thread::sleep(Duration::from_millis(20));
        }
        panic!("timed out waiting for {description}");
    }

    #[test]
    fn session_manager_starts_lists_rejects_concurrent_duplicates_and_stops() {
        let directory = TestDirectory::new();
        let toolchain = fake_toolchain(&directory.path, FakeProcess::LongRunning);
        let manager = SessionManager::default();
        let sink = TestSink::default();
        let barrier = Arc::new(Barrier::new(3));

        let handles = (0..2)
            .map(|_| {
                let manager = manager.clone();
                let sink = sink.clone();
                let toolchain = toolchain.clone();
                let barrier = Arc::clone(&barrier);
                thread::spawn(move || {
                    barrier.wait();
                    manager.start_with_sink(sink, toolchain, minimal_request("  serial-1  "))
                })
            })
            .collect::<Vec<_>>();
        barrier.wait();
        let results = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect::<Vec<_>>();

        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter_map(|result| result.as_ref().err())
                .map(|error| error.key.as_str())
                .collect::<Vec<_>>(),
            ["backend.error.sessionExists"]
        );

        let info = results.into_iter().find_map(Result::ok).unwrap();
        assert_eq!(info.device_serial, "serial-1");
        let sessions = manager.list().unwrap();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].id, info.id);
        assert_eq!(sessions[0].device_serial, "serial-1");
        assert!(sessions[0].started_at_ms > 0);

        wait_for("stdout and stderr log events", || {
            let events = sink.events.lock().unwrap();
            events.iter().any(|event| {
                event.event_type == "log"
                    && event.level == "info"
                    && event.message.as_deref() == Some("stdout line")
            }) && events.iter().any(|event| {
                event.event_type == "log"
                    && event.level == "stderr"
                    && event.message.as_deref() == Some("stderr line")
            })
        });
        assert!(
            sink.events
                .lock()
                .unwrap()
                .iter()
                .filter_map(|event| event.message.as_deref())
                .all(|message| !message.trim().is_empty())
        );

        manager.stop_with_sink(sink.clone(), &info.id).unwrap();
        wait_for("stopped session cleanup", || {
            manager.list().unwrap().is_empty()
        });
        wait_for("stopping and exited events", || {
            sink.has_event("stopping") && sink.has_event("exited")
        });
    }

    #[test]
    fn session_manager_reports_unknown_sessions_and_spawn_failures() {
        let directory = TestDirectory::new();
        let manager = SessionManager::default();
        let sink = TestSink::default();

        assert_eq!(
            manager
                .stop_with_sink(sink.clone(), "missing")
                .unwrap_err()
                .key,
            "backend.error.sessionNotFound"
        );

        let toolchain = Toolchain {
            directory: directory.path.clone(),
            scrcpy: directory.path.join("does-not-exist"),
            adb: directory.path.join("unused-adb"),
            server: directory.path.join("unused-server"),
        };
        let error = manager
            .start_with_sink(sink.clone(), toolchain, minimal_request("serial"))
            .unwrap_err();
        assert_eq!(error.key, "backend.error.startScrcpy");
        assert!(error.values.contains_key("details"));
        assert!(manager.list().unwrap().is_empty());
        assert!(sink.events.lock().unwrap().is_empty());
    }

    #[test]
    fn session_manager_cleans_up_normal_and_abnormal_exits() {
        for (process, expected_key, expected_level, expected_code) in [
            (FakeProcess::Successful, "backend.session.ended", "info", 0),
            (
                FakeProcess::Failed,
                "backend.session.abnormalExit",
                "error",
                7,
            ),
        ] {
            let directory = TestDirectory::new();
            let toolchain = fake_toolchain(&directory.path, process);
            let manager = SessionManager::default();
            let sink = TestSink::default();
            let info = manager
                .start_with_sink(sink.clone(), toolchain, minimal_request("serial"))
                .unwrap();

            wait_for("process exit event", || sink.has_event("exited"));
            assert!(manager.list().unwrap().is_empty());
            let events = sink.events.lock().unwrap();
            let event = events
                .iter()
                .find(|event| event.event_type == "exited")
                .unwrap();
            assert_eq!(event.session_id, info.id);
            assert_eq!(event.device_serial, "serial");
            assert_eq!(event.message_key.as_deref(), Some(expected_key));
            assert_eq!(event.level, expected_level);
            assert_eq!(event.exit_code, Some(expected_code));
            assert_eq!(
                event.message_values.is_some(),
                matches!(process, FakeProcess::Failed)
            );
        }
    }

    #[test]
    fn session_manager_stop_all_terminates_every_process() {
        let directory = TestDirectory::new();
        let toolchain = fake_toolchain(&directory.path, FakeProcess::LongRunning);
        let manager = SessionManager::default();
        let sink = TestSink::default();

        for serial in ["serial-1", "serial-2"] {
            manager
                .start_with_sink(sink.clone(), toolchain.clone(), minimal_request(serial))
                .unwrap();
        }
        assert_eq!(manager.list().unwrap().len(), 2);

        manager.stop_all();
        wait_for("all session cleanup", || manager.list().unwrap().is_empty());
        wait_for("all exit events", || sink.count_events("exited") == 2);
    }
}
