use crate::error::CommonError;
use anyhow::Context;
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
}

// 应用程序运行环境枚举
#[derive(Debug)]
pub enum Environment {
    Local,
    Production,
}

// 配置文件来源枚举
enum ConfigSource {
    FileSystem(PathBuf, PathBuf),
    Resource(PathBuf, PathBuf),
    Embedded,
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
            .with_context(|| "Database connection failed")?;
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
    let environment: Environment = std::env::var("APP_ENVIRONMENT")
        .unwrap_or_else(|_| "local".into())
        .try_into()
        .map_err(|e| config::ConfigError::Message(format!("Failed to parse APP_ENVIRONMENT: {:?}", e)))?;

    let environment_filename = format!("{}.yaml", environment.as_str());
    let is_desktop_dev = cfg!(debug_assertions) && cfg!(desktop);

    match load_config_source(app_handle, &environment_filename, is_desktop_dev) {
        ConfigSource::FileSystem(base_path, env_path) => {
            tracing::info!("Using filesystem configuration files");
            build_config_from_files(base_path, env_path)
        }
        ConfigSource::Resource(base_path, env_path) => {
            tracing::info!("Using Resource directory configuration files");
            build_config_from_files(base_path, env_path)
        }
        ConfigSource::Embedded => {
            tracing::info!("Using embedded configuration");
            build_config_from_embedded(&environment)
        }
    }
}

/// 加载配置文件来源
/// 根据运行环境和配置文件可用性确定配置来源
/// 优先级：文件系统 > 资源目录 > 嵌入式配置
///
/// # 参数
/// * `app_handle` - Tauri应用句柄
/// * `environment_filename` - 环境配置文件名
/// * `is_desktop_dev` - 是否为桌面开发环境
///
/// # 返回值
/// * `ConfigSource` - 配置文件来源枚举
fn load_config_source(
    app_handle: &AppHandle,
    environment_filename: &str,
    is_desktop_dev: bool,
) -> ConfigSource {
    if is_desktop_dev {
        if let Ok(config_dir) = get_configuration_directory(app_handle) {
            let base_path = config_dir.join("base.yaml");
            let env_path = config_dir.join(environment_filename);
            return ConfigSource::FileSystem(base_path, env_path);
        }
    }

    if let Ok(config_dir) = app_handle
        .path()
        .resolve("configuration", tauri::path::BaseDirectory::Resource)
    {
        let base_path = config_dir.join("base.yaml");
        let env_path = config_dir.join(environment_filename);

        if base_path.exists() && env_path.exists() {
            return ConfigSource::Resource(base_path, env_path);
        } else {
            tracing::warn!("Resource directory configuration files do not exist, falling back to embedded config");
        }
    } else {
        tracing::warn!("Failed to get Resource directory, falling back to embedded config");
    }

    ConfigSource::Embedded
}

/// 从配置文件构建配置对象
/// 加载基础配置文件和环境特定配置文件，并合并环境变量配置
///
/// # 参数
/// * `base_path` - 基础配置文件路径
/// * `env_path` - 环境配置文件路径
///
/// # 返回值
/// * `Ok(Settings)` - 成功时返回配置设置
/// * `Err(config::ConfigError)` - 失败时返回配置错误
fn build_config_from_files(
    base_path: PathBuf,
    env_path: PathBuf,
) -> Result<Settings, config::ConfigError> {
    let settings = config::Config::builder()
        .add_source(config::File::from(base_path))
        .add_source(config::File::from(env_path))
        .add_source(
            config::Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__"),
        )
        .build()?;
    settings.try_deserialize::<Settings>()
}

/// 从嵌入式配置构建配置对象
/// 使用编译时嵌入的配置文件内容构建配置
///
/// # 参数
/// * `environment` - 运行环境枚举
///
/// # 返回值
/// * `Ok(Settings)` - 成功时返回配置设置
/// * `Err(config::ConfigError)` - 失败时返回配置错误
fn build_config_from_embedded(environment: &Environment) -> Result<Settings, config::ConfigError> {
    let base_config = include_str!("../configuration/base.yaml");
    let env_config = match environment.as_str() {
        "local" => include_str!("../configuration/local.yaml"),
        "production" => include_str!("../configuration/production.yaml"),
        _ => {
            return Err(config::ConfigError::Message(format!(
                "Unsupported environment: {}",
                environment.as_str()
            )));
        }
    };

    let settings = config::Config::builder()
        .add_source(config::File::from_str(
            base_config,
            config::FileFormat::Yaml,
        ))
        .add_source(config::File::from_str(env_config, config::FileFormat::Yaml))
        .add_source(
            config::Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__"),
        )
        .build()?;
    settings.try_deserialize::<Settings>()
}

/// 获取配置文件目录路径
/// 根据运行环境选择合适的配置文件目录：
/// - 桌面开发环境：项目根目录/configuration
/// - 其他环境：优先使用Resource目录，失败则使用app_data_dir
///
/// # 参数
/// * `app_handle` - Tauri应用句柄
///
/// # 返回值
/// * `Ok(PathBuf)` - 成功时返回配置目录路径
/// * `Err(config::ConfigError)` - 失败时返回配置错误
fn get_configuration_directory(app_handle: &AppHandle) -> Result<PathBuf, config::ConfigError> {
    // 配置目录路径策略：
    // 桌面端开发环境：使用项目根目录
    // 其他情况：使用 Resource 目录
    let config_path = if cfg!(debug_assertions) && cfg!(desktop) {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("configuration");
        path
    } else {
        // 非桌面端开发环境：优先使用 Resource 目录，失败则使用 app_data_dir
        match app_handle
            .path()
            .resolve("configuration", tauri::path::BaseDirectory::Resource)
        {
            Ok(path) => {
                info!("Using Resource configuration directory: {:?}", path);
                path
            }
            Err(e) => {
                tracing::warn!("Failed to get Resource configuration directory: {}, trying app_data_dir", e);

                match app_handle.path().app_data_dir() {
                    Ok(app_data_dir) => {
                        let config_dir = app_data_dir.join("configuration");
                        if let Err(create_err) = std::fs::create_dir_all(&config_dir) {
                            tracing::warn!("Failed to create app_data_dir configuration directory: {}", create_err);
                        }
                        info!("Using backup app_data_dir configuration directory: {:?}", config_dir);
                        config_dir
                    }
                    Err(app_data_err) => {
                        let error_msg = format!(
                            "Failed to get both Resource and app_data_dir configuration directories: Resource error={}, app_data_dir error={}",
                            e, app_data_err
                        );
                        tracing::error!("{}", error_msg);
                        return Err(config::ConfigError::Message(error_msg));
                    }
                }
            }
        }
    };

    info!("Configuration file directory: {:?}", config_path);
    Ok(config_path)
}
