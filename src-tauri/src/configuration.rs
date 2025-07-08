use crate::error::CommonError;
use anyhow::Context;
use sea_orm::{Database, DatabaseConnection};
use std::path::PathBuf;

#[derive(serde::Deserialize, Clone)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub backend: BackendSettings,
}

#[derive(serde::Deserialize, Clone)]
pub struct DatabaseSettings {
    pub sqlite_file: String,
}

impl DatabaseSettings {
    pub async fn connection_string(&self) -> Result<DatabaseConnection, CommonError> {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR")); // 项目根目录
        path.push("db.sqlite");
        let db_url = format!("sqlite:{}?mode=rwc", path.display());
        let db: DatabaseConnection = Database::connect(db_url)
            .await
            .with_context(|| "连接数据库异常")?;
        Ok(db)
    }
}

#[derive(serde::Deserialize, Clone)]
pub struct BackendSettings {
    pub base_url: String,
}

pub fn get_configuration() -> Result<Settings, config::ConfigError> {
    let base_path = std::env::current_dir().expect("无法获取当前项目目录");
    let configuration_directory = base_path.join("configuration");

    // Detect the running environment.
    // Default to `local` if unspecified.
    let environment: Environment = std::env::var("APP_ENVIRONMENT")
        .unwrap_or_else(|_| "local".into())
        .try_into()
        .expect("解析APP_ENVIRONMENT失败");

    let environment_filename = format!("{}.yaml", environment.as_str());
    let settings = config::Config::builder()
        .add_source(config::File::from(
            configuration_directory.join("base.yaml"),
        ))
        .add_source(config::File::from(
            configuration_directory.join(environment_filename),
        ))
        .add_source(
            config::Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__"),
        )
        .build()?;

    settings.try_deserialize::<Settings>()
}

/// The possible runtime environment for our application.
pub enum Environment {
    Local,
    Production,
}

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Local => "local",
            Environment::Production => "production",
        }
    }
}

impl TryFrom<String> for Environment {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        match s.to_lowercase().as_str() {
            "local" => Ok(Self::Local),
            "production" => Ok(Self::Production),
            other => Err(format!(
                "{} is not a supported environment. Use either `local` or `production`.",
                other
            )),
        }
    }
}
