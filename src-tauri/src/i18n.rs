#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum AppLanguage {
    #[default]
    English,
    SimplifiedChinese,
    Russian,
    Korean,
    Spanish,
    French,
    German,
    Japanese,
}

impl AppLanguage {
    pub fn from_tag(tag: &str) -> Self {
        let normalized = tag
            .trim()
            .split(['.', '@'])
            .next()
            .unwrap_or_default()
            .replace('_', "-")
            .to_ascii_lowercase();

        if normalized == "zh" || normalized.starts_with("zh-") {
            return Self::SimplifiedChinese;
        }

        match normalized.split('-').next().unwrap_or_default() {
            "en" => Self::English,
            "ru" => Self::Russian,
            "ko" => Self::Korean,
            "es" => Self::Spanish,
            "fr" => Self::French,
            "de" => Self::German,
            "ja" => Self::Japanese,
            _ => Self::English,
        }
    }

    pub fn from_system_locale() -> Self {
        ["LC_ALL", "LC_MESSAGES", "LANG"]
            .into_iter()
            .find_map(|name| {
                std::env::var(name)
                    .ok()
                    .filter(|value| !value.trim().is_empty())
            })
            .map_or(Self::English, |locale| Self::from_tag(&locale))
    }

    pub const fn as_tag(self) -> &'static str {
        match self {
            Self::English => "en",
            Self::SimplifiedChinese => "zh-CN",
            Self::Russian => "ru",
            Self::Korean => "ko",
            Self::Spanish => "es",
            Self::French => "fr",
            Self::German => "de",
            Self::Japanese => "ja",
        }
    }
}

pub fn show_app(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "Open MirroDeck",
        AppLanguage::SimplifiedChinese => "打开 MirroDeck",
        AppLanguage::Russian => "Открыть MirroDeck",
        AppLanguage::Korean => "MirroDeck 열기",
        AppLanguage::Spanish => "Abrir MirroDeck",
        AppLanguage::French => "Ouvrir MirroDeck",
        AppLanguage::German => "MirroDeck öffnen",
        AppLanguage::Japanese => "MirroDeck を開く",
    }
}

pub fn add_device(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "Add device…",
        AppLanguage::SimplifiedChinese => "添加设备…",
        AppLanguage::Russian => "Добавить устройство…",
        AppLanguage::Korean => "기기 추가…",
        AppLanguage::Spanish => "Añadir dispositivo…",
        AppLanguage::French => "Ajouter un appareil…",
        AppLanguage::German => "Gerät hinzufügen…",
        AppLanguage::Japanese => "デバイスを追加…",
    }
}

pub fn quit_app(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "Quit MirroDeck",
        AppLanguage::SimplifiedChinese => "退出 MirroDeck",
        AppLanguage::Russian => "Выйти из MirroDeck",
        AppLanguage::Korean => "MirroDeck 종료",
        AppLanguage::Spanish => "Salir de MirroDeck",
        AppLanguage::French => "Quitter MirroDeck",
        AppLanguage::German => "MirroDeck beenden",
        AppLanguage::Japanese => "MirroDeck を終了",
    }
}

pub fn connection_status(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "Connection status",
        AppLanguage::SimplifiedChinese => "连接状态",
        AppLanguage::Russian => "Статус подключения",
        AppLanguage::Korean => "연결 상태",
        AppLanguage::Spanish => "Estado de conexión",
        AppLanguage::French => "État de la connexion",
        AppLanguage::German => "Verbindungsstatus",
        AppLanguage::Japanese => "接続ステータス",
    }
}

pub fn detecting_devices(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "Detecting devices…",
        AppLanguage::SimplifiedChinese => "正在检测设备…",
        AppLanguage::Russian => "Поиск устройств…",
        AppLanguage::Korean => "기기 검색 중…",
        AppLanguage::Spanish => "Buscando dispositivos…",
        AppLanguage::French => "Recherche des appareils…",
        AppLanguage::German => "Geräte werden gesucht…",
        AppLanguage::Japanese => "デバイスを検出中…",
    }
}

pub fn scan_failed(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "Device scan failed",
        AppLanguage::SimplifiedChinese => "设备检测失败",
        AppLanguage::Russian => "Не удалось найти устройства",
        AppLanguage::Korean => "기기 검색 실패",
        AppLanguage::Spanish => "Error al buscar dispositivos",
        AppLanguage::French => "Échec de la recherche d’appareils",
        AppLanguage::German => "Gerätesuche fehlgeschlagen",
        AppLanguage::Japanese => "デバイスの検出に失敗しました",
    }
}

pub fn no_devices(language: AppLanguage) -> &'static str {
    match language {
        AppLanguage::English => "No devices connected",
        AppLanguage::SimplifiedChinese => "未连接设备",
        AppLanguage::Russian => "Нет подключённых устройств",
        AppLanguage::Korean => "연결된 기기 없음",
        AppLanguage::Spanish => "No hay dispositivos conectados",
        AppLanguage::French => "Aucun appareil connecté",
        AppLanguage::German => "Keine Geräte verbunden",
        AppLanguage::Japanese => "接続されたデバイスはありません",
    }
}

pub fn connected_devices(language: AppLanguage, count: usize) -> String {
    match language {
        AppLanguage::English => format!("{count} {} connected", plural("device", count)),
        AppLanguage::SimplifiedChinese => format!("已连接 {count} 台设备"),
        AppLanguage::Russian => format!("Подключено устройств: {count}"),
        AppLanguage::Korean => format!("연결된 기기 {count}대"),
        AppLanguage::Spanish => format!(
            "{count} {} conectado{}",
            plural("dispositivo", count),
            if count == 1 { "" } else { "s" }
        ),
        AppLanguage::French => format!(
            "{count} {} connecté{}",
            plural("appareil", count),
            if count == 1 { "" } else { "s" }
        ),
        AppLanguage::German => format!("{count} {} verbunden", plural("Gerät", count)),
        AppLanguage::Japanese => format!("{count} 台のデバイスを接続"),
    }
}

pub fn awaiting_authorization(language: AppLanguage, count: usize) -> String {
    match language {
        AppLanguage::English => format!(
            "Awaiting authorization for {count} {}",
            plural("device", count)
        ),
        AppLanguage::SimplifiedChinese => format!("正在等待 {count} 台设备授权"),
        AppLanguage::Russian => format!("Ожидание авторизации: {count}"),
        AppLanguage::Korean => format!("기기 {count}대의 승인 대기 중"),
        AppLanguage::Spanish => format!(
            "Esperando autorización de {count} {}",
            plural("dispositivo", count)
        ),
        AppLanguage::French => format!(
            "En attente d’autorisation pour {count} {}",
            plural("appareil", count)
        ),
        AppLanguage::German => format!(
            "Warte auf Autorisierung für {count} {}",
            plural("Gerät", count)
        ),
        AppLanguage::Japanese => format!("{count} 台のデバイスの承認を待機中"),
    }
}

pub fn offline_devices(language: AppLanguage, count: usize) -> String {
    match language {
        AppLanguage::English => format!("{count} {} offline", plural("device", count)),
        AppLanguage::SimplifiedChinese => format!("{count} 台设备离线"),
        AppLanguage::Russian => format!("Устройств не в сети: {count}"),
        AppLanguage::Korean => format!("오프라인 기기 {count}대"),
        AppLanguage::Spanish => format!("{count} {} sin conexión", plural("dispositivo", count)),
        AppLanguage::French => format!("{count} {} hors ligne", plural("appareil", count)),
        AppLanguage::German => format!("{count} {} offline", plural("Gerät", count)),
        AppLanguage::Japanese => format!("{count} 台のデバイスがオフライン"),
    }
}

pub fn mirroring_sessions(language: AppLanguage, count: usize) -> String {
    match language {
        AppLanguage::English => format!("{count} {} mirroring", plural("session", count)),
        AppLanguage::SimplifiedChinese => format!("{count} 台正在投屏"),
        AppLanguage::Russian => format!("Трансляций: {count}"),
        AppLanguage::Korean => format!("미러링 중인 기기 {count}대"),
        AppLanguage::Spanish => format!("{count} {} en duplicación", plural("sesión", count)),
        AppLanguage::French => format!("{count} {} de recopie", plural("session", count)),
        AppLanguage::German => format!("{count} {} werden gespiegelt", plural("Sitzung", count)),
        AppLanguage::Japanese => format!("{count} 件のミラーリング中"),
    }
}

fn plural(word: &'static str, count: usize) -> &'static str {
    if count == 1 {
        word
    } else {
        match word {
            "Gerät" => "Geräte",
            "Sitzung" => "Sitzungen",
            "sesión" => "sesiones",
            _ => match word {
                "appareil" => "appareils",
                "dispositivo" => "dispositivos",
                "device" => "devices",
                "session" => "sessions",
                _ => word,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_supported_and_system_locale_tags() {
        assert_eq!(
            AppLanguage::from_tag("zh_CN.UTF-8"),
            AppLanguage::SimplifiedChinese
        );
        assert_eq!(AppLanguage::from_tag("ja-JP"), AppLanguage::Japanese);
        assert_eq!(AppLanguage::from_tag("pt-BR"), AppLanguage::English);
        assert_eq!(AppLanguage::from_tag("unknown"), AppLanguage::English);
    }
}
