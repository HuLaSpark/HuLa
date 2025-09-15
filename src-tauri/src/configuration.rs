use crate::error::CommonError;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tracing::info;

// 应用程序设置结构体
#[derive(serde::Deserialize, Clone, Debug)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub backend: BackendSettings,
}

// 数据库配置设置
#[derive(serde::Deserialize, Clone, Debug)]
pub struct DatabaseSettings {
    pub sqlite_file: String,
}

// 后端服务配置设置
#[derive(serde::Deserialize, Clone, Debug)]
pub struct BackendSettings {
    pub base_url: String,
    pub ws_url: String,
}

// 应用程序运行环境枚举
#[derive(Debug)]
pub enum Environment {
    Local,
    Production,
}

impl DatabaseSettings {
    /// 创建数据库连接
    /// 根据不同的运行环境（桌面开发、移动端、桌面生产）选择合适的数据库路径
    /// 并配置数据库连接选项，返回数据库连接实例
    ///
    /// # 参数
    /// * `app_handle` - Tauri应用句柄，用于获取应用路径
    ///
    /// # 返回值
    /// * `Ok(DatabaseConnection)` - 成功时返回数据库连接
    /// * `Err(CommonError)` - 失败时返回错误信息
    pub async fn connection_string(
        &self,
        app_handle: &AppHandle,
    ) -> Result<DatabaseConnection, CommonError> {
        // 数据库路径配置：
        let db_path = if cfg!(debug_assertions) && cfg!(desktop) {
            // 桌面端开发环境：使用项目根目录
            let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            path.push("db.sqlite");
            path
        } else {
            // SQLite 无法连接 asset://localhost/ 这样的虚拟协议，必须使用真实文件系统路径
            match app_handle.path().app_data_dir() {
                Ok(app_data_dir) => {
                    if let Err(create_err) = std::fs::create_dir_all(&app_data_dir) {
                        tracing::warn!("Failed to create app_data_dir: {}", create_err);
                    }
                    let db_path = app_data_dir.join("db.sqlite");
                    info!("Mobile: Using app_data_dir database path: {:?}", db_path);
                    db_path
                }
                Err(e) => {
                    let error_msg = format!("Mobile: Failed to get app_data_dir: {}", e);
                    tracing::error!("{}", error_msg);
                    return Err(CommonError::RequestError(error_msg).into());
                }
            }
        };
        info!("Database path: {:?}", db_path);
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
            .map_err(|e| anyhow::anyhow!("Database connection failed: {}", e))?;
        Ok(db)
    }
}

impl Environment {
    /// 将Environment枚举转换为字符串
    /// 用于文件名和路径构建
    ///
    /// # 返回值
    /// * `&'static str` - 对应的环境字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Local => "local",
            Environment::Production => "production",
        }
    }
}

impl TryFrom<String> for Environment {
    type Error = String;

    /// 从字符串解析Environment枚举
    /// 支持大小写不敏感的解析
    ///
    /// # 参数
    /// * `s` - 要解析的字符串
    ///
    /// # 返回值
    /// * `Ok(Environment)` - 解析成功时返回环境枚举
    /// * `Err(String)` - 解析失败时返回错误信息
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

/// 获取应用程序配置
/// 根据APP_ENVIRONMENT环境变量确定运行环境，按优先级加载配置：
/// 1. 桌面开发环境：文件系统配置文件
/// 2. 其他环境：资源目录配置文件
/// 3. 回退：编译时嵌入的配置文件
///
/// # 参数
/// * `app_handle` - Tauri应用句柄
///
/// # 返回值
/// * `Ok(Settings)` - 成功时返回配置设置
/// * `Err(config::ConfigError)` - 失败时返回配置错误
pub fn get_configuration(app_handle: &AppHandle) -> Result<Settings, config::ConfigError> {
    let is_desktop_dev = cfg!(debug_assertions) && cfg!(desktop);

    let config_path_buf = get_config_path_buf(app_handle, is_desktop_dev)?;

    let settings = config::Config::builder()
        .add_source(config::File::from(config_path_buf.0))
        .add_source(config::File::from(config_path_buf.1))
        .add_source(
            config::Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__"),
        )
        .build()?;
    settings.try_deserialize::<Settings>()
}

fn get_config_path_buf(
    app_handle: &AppHandle,
    is_desktop_dev: bool,
) -> Result<(PathBuf, PathBuf), config::ConfigError> {
    let dir = if is_desktop_dev {
        let base_path = std::env::current_dir().unwrap();
        base_path.join("configuration")
    } else {
        app_handle
            .path()
            .resource_dir()
            .map_err(|e| config::ConfigError::NotFound(format!("resource not find: {}", e)))?
            .join("configuration")
    };

    let base_path = dir.join("base.yaml");
    let base_config = config::Config::builder()
        .add_source(config::File::from(base_path.clone()))
        .build()?;

    let active_config = base_config.get_string("active_config").unwrap();
    println!("active_config: {:?}", active_config);
    let active_config_path_buf = dir.clone().join(active_config);
    Ok((base_path, active_config_path_buf))
}
