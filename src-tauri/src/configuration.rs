use crate::error::CommonError;
use anyhow::Context;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};

#[derive(serde::Deserialize, Clone, Debug)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub backend: BackendSettings,
}

#[derive(serde::Deserialize, Clone, Debug)]
pub struct DatabaseSettings {
    pub sqlite_file: String,
}

impl DatabaseSettings {
    pub async fn connection_string(
        &self,
        app_handle: &AppHandle,
    ) -> Result<DatabaseConnection, CommonError> {
        let db_path = if cfg!(debug_assertions) {
            let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            path.push("db.sqlite");
            path
        } else {
            get_database_path(app_handle)?
        };
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

        // 配置数据库连接选项
        let mut opt = ConnectOptions::new(db_url);
        opt.max_connections(20) // 降低最大连接数，避免资源浪费
            .min_connections(2) // 降低最小连接数
            .connect_timeout(Duration::from_secs(30)) // 增加连接超时时间
            .acquire_timeout(Duration::from_secs(30)) // 增加获取连接超时时间
            .idle_timeout(Duration::from_secs(600)) // 10分钟空闲超时
            .max_lifetime(Duration::from_secs(1800)) // 30分钟连接生命周期，避免频繁重建
            // 启用 SQL 日志记录，但只在 debug 模式下
            .sqlx_logging(cfg!(debug_assertions))
            .sqlx_logging_level(tracing::log::LevelFilter::Info);

        let db: DatabaseConnection = Database::connect(opt)
            .await
            .with_context(|| "连接数据库异常")?;
        Ok(db)
    }
}

// 获取数据库文件路径
fn get_database_path(app_handle: &AppHandle) -> Result<PathBuf, CommonError> {
    // iOS平台特殊处理
    #[cfg(target_os = "ios")]
    {
        // iOS优先使用Documents目录，这是iOS推荐的用户数据存储位置
        if let Ok(document_dir) = app_handle.path().document_dir() {
            let mut db_path = document_dir;
            std::fs::create_dir_all(&db_path).with_context(|| "创建Documents目录失败")?;
            db_path.push("db.sqlite");
            return Ok(db_path);
        }

        // 备选：使用应用数据目录（Library/Application Support）
        if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
            let mut db_path = app_data_dir;
            std::fs::create_dir_all(&db_path).with_context(|| "创建应用数据目录失败")?;
            db_path.push("db.sqlite");
            return Ok(db_path);
        }

        // iOS最后备选：使用缓存目录
        if let Ok(cache_dir) = app_handle.path().app_cache_dir() {
            let mut db_path = cache_dir;
            std::fs::create_dir_all(&db_path).with_context(|| "创建缓存目录失败")?;
            db_path.push("db.sqlite");
            return Ok(db_path);
        }

        // iOS最终备选：使用临时目录
        let mut temp_path = std::env::temp_dir();
        temp_path.push("hula_app");
        std::fs::create_dir_all(&temp_path).with_context(|| "创建临时数据目录失败")?;
        temp_path.push("db.sqlite");
        return Ok(temp_path);
    }

    // 其他平台的处理逻辑
    #[cfg(not(target_os = "ios"))]
    {
        // 优先使用应用数据目录
        if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
            let mut db_path = app_data_dir;
            std::fs::create_dir_all(&db_path).with_context(|| "创建应用数据目录失败")?;
            db_path.push("db.sqlite");
            return Ok(db_path);
        }

        // 备选：使用用户数据目录
        if let Ok(app_local_data_dir) = app_handle.path().app_local_data_dir() {
            let mut db_path = app_local_data_dir;
            std::fs::create_dir_all(&db_path).with_context(|| "创建本地数据目录失败")?;
            db_path.push("db.sqlite");
            return Ok(db_path);
        }

        // 最后备选：使用临时目录
        let mut temp_path = std::env::temp_dir();
        temp_path.push("hula_app");
        std::fs::create_dir_all(&temp_path).with_context(|| "创建临时数据目录失败")?;
        temp_path.push("db.sqlite");
        return Ok(temp_path);
    }
}

#[derive(serde::Deserialize, Clone, Debug)]
pub struct BackendSettings {
    pub base_url: String,
}

pub fn get_configuration(app_handle: &AppHandle) -> Result<Settings, config::ConfigError> {
    let configuration_directory = get_configuration_directory(app_handle)?;

    // Detect the running environment.
    // Default to `local` if unspecified.
    let environment: Environment = std::env::var("APP_ENVIRONMENT")
        .unwrap_or_else(|_| "local".into())
        .try_into()
        .map_err(|e| config::ConfigError::Message(format!("解析APP_ENVIRONMENT失败: {:?}", e)))?;

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

// 获取配置文件目录
fn get_configuration_directory(app_handle: &AppHandle) -> Result<PathBuf, config::ConfigError> {
    // 尝试使用应用配置目录
    if let Ok(config_dir) = app_handle.path().app_config_dir() {
        let config_path = config_dir.join("configuration");
        if config_path.exists() {
            return Ok(config_path);
        }
    }

    // 备选：使用资源目录（打包时配置文件可能在这里）
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let config_path = resource_dir.join("configuration");
        if config_path.exists() {
            return Ok(config_path);
        }
    }

    // 最后备选：使用当前目录（开发环境）
    let current_dir = std::env::current_dir()
        .map_err(|e| config::ConfigError::Message(format!("无法获取当前目录: {}", e)))?;
    Ok(current_dir.join("configuration"))
}

/// The possible runtime environment for our application.
#[derive(Debug)]
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
