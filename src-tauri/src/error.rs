use serde::Serialize;
use std::collections::BTreeMap;

pub type MessageValues = BTreeMap<String, String>;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub key: String,
    pub values: MessageValues,
}

impl AppError {
    pub fn new(key: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            values: MessageValues::new(),
        }
    }

    pub fn with_value(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.values.insert(name.into(), value.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_as_a_structured_tauri_error() {
        let error =
            AppError::new("backend.error.runAdb").with_value("details", "permission denied");
        let value = serde_json::to_value(error).unwrap();

        assert_eq!(value["key"], "backend.error.runAdb");
        assert_eq!(value["values"]["details"], "permission denied");
    }
}
