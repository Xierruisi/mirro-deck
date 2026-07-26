use crate::{
    adb::Device,
    i18n::{self, AppLanguage},
};
use std::sync::Mutex;
use tauri::{
    App, AppHandle, Emitter, Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

const TRAY_ID: &str = "mirrodeck-tray";
const SHOW_APP_ID: &str = "show-app";
const ADD_DEVICE_ID: &str = "add-device";
const QUIT_APP_ID: &str = "quit-app";
const ADD_DEVICE_EVENT: &str = "tray-add-device";

#[derive(Clone, Copy, Debug, Default)]
struct ConnectionSummary {
    connected: usize,
    unauthorized: usize,
    offline: usize,
    active_sessions: usize,
}

#[derive(Clone, Copy, Debug, Default)]
enum TrayConnectionState {
    #[default]
    Detecting,
    ScanFailed,
    Summary(ConnectionSummary),
}

#[derive(Clone, Copy, Debug)]
struct TrayContent {
    language: AppLanguage,
    connection: TrayConnectionState,
}

pub struct TrayState {
    status_item: MenuItem<tauri::Wry>,
    add_device_item: MenuItem<tauri::Wry>,
    show_app_item: MenuItem<tauri::Wry>,
    quit_app_item: MenuItem<tauri::Wry>,
    content: Mutex<TrayContent>,
}

type TrayMenuItems = (
    Menu<tauri::Wry>,
    MenuItem<tauri::Wry>,
    MenuItem<tauri::Wry>,
    MenuItem<tauri::Wry>,
);

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let language = AppLanguage::from_system_locale();
    let content = TrayContent {
        language,
        connection: TrayConnectionState::Detecting,
    };
    let (status_text, tooltip) = render_content(content);
    let status_item =
        MenuItem::with_id(app, "connection-status", status_text, false, None::<&str>)?;
    let (menu, add_device_item, show_app_item, quit_app_item) =
        create_menu(app, &status_item, language)?;

    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip(tooltip)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_APP_ID => show_main_window(app),
            ADD_DEVICE_ID => {
                show_main_window(app);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit(ADD_DEVICE_EVENT, ());
                }
            }
            QUIT_APP_ID => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    #[cfg(target_os = "macos")]
    {
        tray = tray.icon_as_template(true);
    }

    tray.build(app)?;
    app.manage(TrayState {
        status_item,
        add_device_item,
        show_app_item,
        quit_app_item,
        content: Mutex::new(content),
    });
    Ok(())
}

pub fn set_app_language(app: &AppHandle, language: AppLanguage) {
    let Some(state) = app.try_state::<TrayState>() else {
        return;
    };
    let Ok(mut content) = state.content.lock() else {
        return;
    };
    if content.language == language {
        return;
    }
    content.language = language;
    apply_content(app, &state, *content);
}

pub fn update_connection_status(app: &AppHandle, devices: &[Device], active_sessions: usize) {
    let summary = ConnectionSummary {
        connected: devices
            .iter()
            .filter(|device| device.state == "device")
            .count(),
        unauthorized: devices
            .iter()
            .filter(|device| device.state == "unauthorized")
            .count(),
        offline: devices
            .iter()
            .filter(|device| device.state == "offline")
            .count(),
        active_sessions,
    };
    update_connection(app, TrayConnectionState::Summary(summary));
}

pub fn update_connection_error(app: &AppHandle) {
    update_connection(app, TrayConnectionState::ScanFailed);
}

fn update_connection(app: &AppHandle, connection: TrayConnectionState) {
    let Some(state) = app.try_state::<TrayState>() else {
        return;
    };
    let Ok(mut content) = state.content.lock() else {
        return;
    };
    content.connection = connection;
    apply_content(app, &state, *content);
}

fn create_menu(
    app: &App,
    status_item: &MenuItem<tauri::Wry>,
    language: AppLanguage,
) -> tauri::Result<TrayMenuItems> {
    let show_app = MenuItem::with_id(
        app,
        SHOW_APP_ID,
        i18n::show_app(language),
        true,
        None::<&str>,
    )?;
    let add_device = MenuItem::with_id(
        app,
        ADD_DEVICE_ID,
        i18n::add_device(language),
        true,
        None::<&str>,
    )?;
    let quit_app = MenuItem::with_id(
        app,
        QUIT_APP_ID,
        i18n::quit_app(language),
        true,
        None::<&str>,
    )?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[
            status_item,
            &separator_one,
            &add_device,
            &show_app,
            &separator_two,
            &quit_app,
        ],
    )?;

    Ok((menu, add_device, show_app, quit_app))
}

fn apply_content(app: &AppHandle, state: &TrayState, content: TrayContent) {
    let (status_text, tooltip) = render_content(content);
    let _ = state.status_item.set_text(status_text);
    let _ = state
        .add_device_item
        .set_text(i18n::add_device(content.language));
    let _ = state
        .show_app_item
        .set_text(i18n::show_app(content.language));
    let _ = state
        .quit_app_item
        .set_text(i18n::quit_app(content.language));
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

fn render_content(content: TrayContent) -> (String, String) {
    let language = content.language;
    let body = match content.connection {
        TrayConnectionState::Detecting => i18n::detecting_devices(language).to_owned(),
        TrayConnectionState::ScanFailed => i18n::scan_failed(language).to_owned(),
        TrayConnectionState::Summary(summary) => connection_status_body(language, summary),
    };
    let separator = match language {
        AppLanguage::SimplifiedChinese | AppLanguage::Japanese => "：",
        _ => ": ",
    };
    (
        format!("{}{separator}{body}", i18n::connection_status(language)),
        format!("MirroDeck · {body}"),
    )
}

fn connection_status_body(language: AppLanguage, summary: ConnectionSummary) -> String {
    let mut details = if summary.connected > 0 {
        vec![i18n::connected_devices(language, summary.connected)]
    } else if summary.unauthorized > 0 {
        vec![i18n::awaiting_authorization(language, summary.unauthorized)]
    } else if summary.offline > 0 {
        vec![i18n::offline_devices(language, summary.offline)]
    } else {
        vec![i18n::no_devices(language).to_owned()]
    };

    if summary.active_sessions > 0 {
        details.push(i18n::mirroring_sessions(language, summary.active_sessions));
    }
    if summary.connected > 0 && summary.unauthorized > 0 {
        details.push(i18n::awaiting_authorization(language, summary.unauthorized));
    }
    if (summary.connected > 0 || summary.unauthorized > 0) && summary.offline > 0 {
        details.push(i18n::offline_devices(language, summary.offline));
    }

    details.join(" · ")
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_no_connected_device_in_english() {
        let content = TrayContent {
            language: AppLanguage::English,
            connection: TrayConnectionState::Summary(ConnectionSummary::default()),
        };
        assert_eq!(
            render_content(content).0,
            "Connection status: No devices connected"
        );
    }

    #[test]
    fn reports_connection_details_in_simplified_chinese() {
        let content = TrayContent {
            language: AppLanguage::SimplifiedChinese,
            connection: TrayConnectionState::Summary(ConnectionSummary {
                connected: 1,
                unauthorized: 1,
                offline: 1,
                active_sessions: 1,
            }),
        };
        assert_eq!(
            render_content(content).0,
            "连接状态：已连接 1 台设备 · 1 台正在投屏 · 正在等待 1 台设备授权 · 1 台设备离线"
        );
    }
}
