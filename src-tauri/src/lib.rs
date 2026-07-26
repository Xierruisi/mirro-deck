mod adb;
mod commands;
mod error;
mod i18n;
mod process;
mod session;
mod toolchain;
mod tray;

use session::SessionManager;

pub struct AppState {
    sessions: SessionManager,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sessions = SessionManager::default();
    let sessions_for_exit = sessions.clone();
    let app = tauri::Builder::default()
        .manage(AppState { sessions })
        .setup(|app| {
            tray::setup(app)?;
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_toolchain_info,
            commands::list_devices,
            commands::pair_device,
            commands::connect_device,
            commands::disconnect_device,
            commands::restart_adb_server,
            commands::start_session,
            commands::stop_session,
            commands::list_sessions,
            commands::set_app_language,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            commands::stop_all_sessions(&sessions_for_exit);
        }
    });
}
