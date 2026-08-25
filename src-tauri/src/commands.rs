use crate::{
    AppState,
    adb::{self, Device, OperationResult},
    error::AppError,
    session::{SessionInfo, SessionManager, StartSessionRequest},
    toolchain::{Toolchain, ToolchainInfo},
};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn get_toolchain_info(app: AppHandle) -> ToolchainInfo {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || Toolchain::info(&app))
        .await
        .unwrap_or_else(|error| ToolchainInfo {
            available: false,
            platform: crate::toolchain::platform_key().to_owned(),
            directory: None,
            scrcpy_version: None,
            error: Some(
                AppError::new("backend.error.toolchainTask")
                    .with_value("details", error.to_string()),
            ),
        })
}

#[tauri::command]
pub fn set_app_language(app: AppHandle, language: String) -> String {
    let language = crate::i18n::AppLanguage::from_tag(&language);
    crate::tray::set_app_language(&app, language);
    language.as_tag().to_owned()
}

#[tauri::command]
pub async fn list_devices(app: AppHandle) -> Result<Vec<Device>, AppError> {
    let worker_app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let toolchain = Toolchain::locate(&worker_app)?;
        adb::list_devices(&toolchain)
    })
    .await
    .map_err(|error| {
        AppError::new("backend.error.deviceScanTask").with_value("details", error.to_string())
    })?;

    match &result {
        Ok(devices) => {
            let active_sessions = app
                .state::<AppState>()
                .sessions
                .list()
                .map(|sessions| sessions.len())
                .unwrap_or_default();
            crate::tray::update_connection_status(&app, devices, active_sessions);
        }
        Err(_) => crate::tray::update_connection_error(&app),
    }

    result
}

#[tauri::command]
pub async fn scan_lan_devices(app: AppHandle) -> Result<Vec<Device>, AppError> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let toolchain = Toolchain::locate(&worker_app)?;
        adb::scan_lan_devices(&toolchain)
    })
    .await
    .map_err(|error| {
        AppError::new("backend.error.lanScanTask").with_value("details", error.to_string())
    })?
}

#[tauri::command]
pub async fn pair_device(
    app: AppHandle,
    address: String,
    pairing_code: String,
) -> Result<OperationResult, AppError> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let toolchain = Toolchain::locate(&app)?;
        adb::pair_device(&toolchain, &address, &pairing_code)
    })
    .await
    .map_err(|error| {
        AppError::new("backend.error.pairTask").with_value("details", error.to_string())
    })?
}

#[tauri::command]
pub async fn connect_device(app: AppHandle, address: String) -> Result<OperationResult, AppError> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let toolchain = Toolchain::locate(&app)?;
        adb::connect_device(&toolchain, &address)
    })
    .await
    .map_err(|error| {
        AppError::new("backend.error.connectTask").with_value("details", error.to_string())
    })?
}

#[tauri::command]
pub async fn disconnect_device(
    app: AppHandle,
    address: String,
) -> Result<OperationResult, AppError> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let toolchain = Toolchain::locate(&app)?;
        adb::disconnect_device(&toolchain, &address)
    })
    .await
    .map_err(|error| {
        AppError::new("backend.error.disconnectTask").with_value("details", error.to_string())
    })?
}

#[tauri::command]
pub async fn restart_adb_server(app: AppHandle) -> Result<OperationResult, AppError> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let toolchain = Toolchain::locate(&app)?;
        adb::restart_server(&toolchain)
    })
    .await
    .map_err(|error| {
        AppError::new("backend.error.restartTask").with_value("details", error.to_string())
    })?
}

#[tauri::command]
pub fn start_session(
    app: AppHandle,
    state: State<'_, AppState>,
    request: StartSessionRequest,
) -> Result<SessionInfo, AppError> {
    let toolchain = Toolchain::locate(&app)?;
    state.sessions.start(app, toolchain, request)
}

#[tauri::command]
pub fn stop_session(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), AppError> {
    state.sessions.stop(&app, &session_id)
}

#[tauri::command]
pub fn list_sessions(state: State<'_, AppState>) -> Result<Vec<SessionInfo>, AppError> {
    state.sessions.list()
}

pub fn stop_all_sessions(manager: &SessionManager) {
    manager.stop_all();
}
