#[derive(serde::Deserialize, Clone)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub backend: BackendSettings,
}

#[derive(serde::Deserialize, Clone)]
pub struct DatabaseSettings {
    pub sqlite_path: String,
}

#[derive(serde::Deserialize, Clone)]
pub struct BackendSettings {
    pub base_url: String,
}

pub fn get_configuration() -> Result<Settings, config::ConfigError> {
    todo!()
}