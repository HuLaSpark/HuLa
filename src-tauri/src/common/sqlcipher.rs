use crate::error::CommonError;
use sea_orm::{ConnectionTrait, Database, DatabaseBackend, Statement};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

// SQLite 明文文件头标识，用于检测是否需要迁移为加密库
const SQLITE_HEADER: &[u8] = b"SQLite format 3\0";
// 系统密钥存储中的服务名（Keychain/Credential Manager 条目名）
const SQLCIPHER_KEY_SERVICE: &str = "com.hula.pc";
// 系统密钥存储中的账户名（Keychain/Credential Manager 条目名）
const SQLCIPHER_KEY_ACCOUNT: &str = "hula_sqlcipher_key_v3";
// 环境变量：指定 SQLCipher 密钥缓存文件路径，未设置则使用 app_data_dir/仓库根目录
const SQLCIPHER_KEY_CACHE_ENV: &str = "HULA_SQLCIPHER_KEY_CACHE";
// 环境变量：为 1/true 时强制禁用 Keychain/Keyring，直接使用本地缓存或新生成的密钥（全平台生效）
const SQLCIPHER_KEY_DISABLE_KEYCHAIN_ENV: &str = "HULA_SQLCIPHER_DISABLE_KEYCHAIN";
// 环境变量：为 1/true 时在 macOS 上启用 Keychain 读取（默认关闭以避免弹窗）
const SQLCIPHER_KEY_USE_KEYCHAIN_ENV: &str = "HULA_SQLCIPHER_USE_KEYCHAIN";

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

#[cfg(not(mobile))]
fn sqlcipher_key_cache_path(app_handle: &AppHandle) -> PathBuf {
    if let Ok(path) = std::env::var(SQLCIPHER_KEY_CACHE_ENV) {
        return PathBuf::from(path);
    }

    match app_handle.path().app_data_dir() {
        Ok(dir) => dir.join("sqlcipher.key"),
        Err(e) => {
            let fallback = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".sqlcipher.key");
            tracing::warn!(
                "获取 app_data_dir 失败，使用仓库根目录缓存 SQLCipher 密钥: {}",
                e
            );
            fallback
        }
    }
}

#[cfg(not(mobile))]
fn read_cached_sqlcipher_key(path: &Path) -> Option<String> {
    match fs::read_to_string(path) {
        Ok(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        Err(err) => {
            if err.kind() != std::io::ErrorKind::NotFound {
                tracing::warn!("读取 SQLCipher 密钥缓存失败 {:?}: {}", path, err);
            }
            None
        }
    }
}

#[cfg(not(mobile))]
fn cache_sqlcipher_key(path: &Path, key: &str) {
    if let Some(parent) = path.parent() {
        if let Err(err) = fs::create_dir_all(parent) {
            tracing::warn!("创建 SQLCipher 密钥缓存目录失败 {:?}: {}", parent, err);
            return;
        }
    }

    if let Err(err) = fs::write(path, key) {
        tracing::warn!("写入 SQLCipher 密钥缓存失败 {:?}: {}", path, err);
        return;
    }

    #[cfg(unix)]
    if let Err(err) = fs::set_permissions(path, fs::Permissions::from_mode(0o600)) {
        tracing::warn!("设置 SQLCipher 密钥缓存权限失败 {:?}: {}", path, err);
    }
}

fn generate_sqlcipher_key() -> String {
    format!(
        "hula_{}{}",
        Uuid::new_v4().simple(),
        Uuid::new_v4().simple()
    )
}

fn is_plaintext_sqlite_file(db_path: &Path) -> Result<bool, CommonError> {
    let mut file = File::open(db_path).map_err(|e| {
        CommonError::RequestError(format!("无法读取 sqlite 文件 {:?}: {}", db_path, e))
    })?;

    let mut header = [0u8; 16];
    let bytes_read = file.read(&mut header).map_err(|e| {
        CommonError::RequestError(format!("无法读取 sqlite 文件头 {:?}: {}", db_path, e))
    })?;

    Ok(bytes_read >= SQLITE_HEADER.len() && header.starts_with(SQLITE_HEADER))
}

fn cleanup_sqlite_sidecar_files(db_path: &Path) {
    let Some(file_name) = db_path.file_name().and_then(|v| v.to_str()) else {
        return;
    };

    for suffix in ["-wal", "-shm"] {
        let sidecar = db_path.with_file_name(format!("{file_name}{suffix}"));
        let _ = std::fs::remove_file(sidecar);
    }
}

fn escape_sqlite_single_quoted(value: &str) -> String {
    value.replace('\'', "''")
}

#[cfg(mobile)]
fn get_or_create_sqlcipher_key_from_secure_storage(
    app_handle: &AppHandle,
) -> Result<String, CommonError> {
    use tauri_plugin_hula::HulaExt;

    let payload = tauri_plugin_hula::SqliteKeyRequest {
        service: SQLCIPHER_KEY_SERVICE.to_string(),
        account: SQLCIPHER_KEY_ACCOUNT.to_string(),
    };

    let response = app_handle
        .hula()
        .get_or_create_sqlite_key(payload)
        .map_err(|e| CommonError::RequestError(format!("获取移动端 SQLite 密钥失败: {}", e)))?;

    Ok(response.key)
}

#[cfg(not(mobile))]
fn get_or_create_sqlcipher_key_from_secure_storage(
    app_handle: &AppHandle,
) -> Result<String, CommonError> {
    let cache_path = sqlcipher_key_cache_path(app_handle);
    tracing::info!("SQLCipher 密钥缓存路径: {:?}", cache_path);

    // Mac Keychain 每次访问都会弹窗，优先使用环境变量/本地缓存避免重复授权
    if let Ok(env_key) = std::env::var("HULA_SQLCIPHER_KEY") {
        let trimmed = env_key.trim();
        if !trimmed.is_empty() {
            cache_sqlcipher_key(&cache_path, trimmed);
            return Ok(trimmed.to_string());
        }
    }

    // macOS 默认禁用 Keychain，避免频繁弹窗；若显式开启或非 macOS 且未禁用，则继续使用 keyring。
    let disable_keychain_env = std::env::var(SQLCIPHER_KEY_DISABLE_KEYCHAIN_ENV)
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let use_keychain_env = std::env::var(SQLCIPHER_KEY_USE_KEYCHAIN_ENV)
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let should_use_keychain = if cfg!(target_os = "macos") {
        // macOS 仅当显式开启时才走 Keychain，确保由环境变量控制弹窗行为
        use_keychain_env
    } else {
        // 其他平台默认继续使用 Keyring，除非显式禁用
        !disable_keychain_env
    };

    if should_use_keychain {
        tracing::info!("启用系统 Keychain 读取 SQLCipher 密钥（忽略缓存文件）");
        let entry = keyring::Entry::new(SQLCIPHER_KEY_SERVICE, SQLCIPHER_KEY_ACCOUNT)
            .map_err(|e| CommonError::RequestError(format!("初始化系统密钥存储失败: {}", e)))?;

        let value = match entry.get_password() {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                let value = generate_sqlcipher_key();
                entry.set_password(&value).map_err(|e| {
                    CommonError::RequestError(format!("写入系统密钥存储失败: {}", e))
                })?;
                value
            }
        };

        return Ok(value);
    }

    tracing::info!("已禁用 Keychain，直接使用本地缓存/新密钥");

    if let Some(cached) = read_cached_sqlcipher_key(&cache_path) {
        return Ok(cached);
    }

    let value = generate_sqlcipher_key();
    cache_sqlcipher_key(&cache_path, &value);
    Ok(value)
}

pub async fn get_or_create_sqlcipher_key(app_handle: &AppHandle) -> Result<String, CommonError> {
    get_or_create_sqlcipher_key_from_secure_storage(app_handle)
}

pub async fn ensure_sqlite_encrypted(db_path: &Path, key: &str) -> Result<(), CommonError> {
    if !db_path.exists() {
        return Ok(());
    }

    if !is_plaintext_sqlite_file(db_path)? {
        return Ok(());
    }

    tracing::info!(
        "检测到明文 SQLite 数据库，将迁移为 SQLCipher 加密库: {:?}",
        db_path
    );

    let encrypted_path = db_path.with_extension("sqlite.enc");
    if encrypted_path.exists() {
        std::fs::remove_file(&encrypted_path).map_err(|e| {
            CommonError::RequestError(format!(
                "删除旧的临时加密数据库失败 {:?}: {}",
                encrypted_path, e
            ))
        })?;
    }

    cleanup_sqlite_sidecar_files(db_path);
    cleanup_sqlite_sidecar_files(&encrypted_path);

    // 部分 SQLCipher/平台组合下 ATTACH 不会自动创建新文件，提前创建可避免 SQLITE_CANTOPEN
    std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&encrypted_path)
        .map_err(|e| {
            CommonError::RequestError(format!(
                "创建临时加密数据库失败 {:?}: {}",
                encrypted_path, e
            ))
        })?;

    let plain_url = format!("sqlite:{}?mode=rw", db_path.display());
    let db = Database::connect(plain_url).await?;

    // WAL 模式下可能存在未落盘的数据，尽量先 checkpoint
    let _ = db.execute_unprepared("PRAGMA wal_checkpoint(FULL);").await;

    // 将明文库导出到加密库（SQLCipher 扩展能力）
    let encrypted_path_sql = escape_sqlite_single_quoted(&encrypted_path.display().to_string());
    let key_sql = escape_sqlite_single_quoted(key);
    let attach_sql = format!(
        "ATTACH DATABASE '{}' AS encrypted KEY '{}';",
        encrypted_path_sql, key_sql
    );
    db.execute_unprepared(&attach_sql).await?;

    let export_sql = Statement::from_string(
        DatabaseBackend::Sqlite,
        "SELECT sqlcipher_export('encrypted');".to_string(),
    );
    let _ = db.query_one(export_sql).await?;

    db.execute_unprepared("DETACH DATABASE encrypted;").await?;
    db.close().await?;

    cleanup_sqlite_sidecar_files(db_path);
    cleanup_sqlite_sidecar_files(&encrypted_path);

    // 不再保留明文备份文件，迁移完成后直接用加密库替换原文件。
    // 注意：部分平台（如 Windows）当目标文件已存在时 rename 会失败，因此需要先删除明文文件再重命名。
    if let Err(rename_err) = std::fs::rename(&encrypted_path, db_path) {
        let should_retry = matches!(
            rename_err.kind(),
            std::io::ErrorKind::AlreadyExists | std::io::ErrorKind::PermissionDenied
        );

        if !should_retry {
            return Err(CommonError::RequestError(format!(
                "替换为加密数据库失败 {:?} -> {:?}: {}",
                encrypted_path, db_path, rename_err
            )));
        }

        std::fs::remove_file(db_path).map_err(|e| {
            CommonError::RequestError(format!("删除明文数据库失败 {:?}: {}", db_path, e))
        })?;

        std::fs::rename(&encrypted_path, db_path).map_err(|e| {
            CommonError::RequestError(format!(
                "替换为加密数据库失败 {:?} -> {:?}: {}",
                encrypted_path, db_path, e
            ))
        })?;
    }

    tracing::info!(
        "SQLite 加密迁移完成，已替换为 SQLCipher 加密库: {:?}",
        db_path
    );
    Ok(())
}
