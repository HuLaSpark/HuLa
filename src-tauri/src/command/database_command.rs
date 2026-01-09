use crate::AppData;
use crate::configuration::get_configuration;
use crate::error::CommonError;
use crate::repository::im_message_repository::reset_table_initialization_flags;
use migration::{Migrator, MigratorTrait};
use tauri::{AppHandle, State};
use tracing::info;

/// 切换用户数据库
/// 根据用户ID切换到对应的数据库文件，如果数据库不存在则创建
///
/// # 参数
/// * `uid` - 用户ID，用于生成用户专属的数据库文件名
/// * `state` - 应用状态
/// * `app_handle` - Tauri应用句柄
///
/// # 返回值
/// * `Ok(())` - 切换成功
/// * `Err(String)` - 切换失败时返回错误信息
#[tauri::command]
pub async fn switch_user_database(
    uid: String,
    state: State<'_, AppData>,
    app_handle: AppHandle,
) -> Result<(), String> {
    info!("Switching to user database for uid: {}", uid);

    let result: Result<(), CommonError> = async {
        // 获取配置
        let configuration = get_configuration(&app_handle)
            .map_err(|e| anyhow::anyhow!("Failed to load configuration: {}", e))?;

        // 创建新的数据库连接
        let new_db = configuration
            .database
            .connection_string(&app_handle, Some(&uid))
            .await?;

        // 执行数据库迁移
        match Migrator::up(&new_db, None).await {
            Ok(_) => {
                info!("Database migration completed for user: {}", uid);
            }
            Err(e) => {
                tracing::warn!("Database migration warning for user {}: {}", uid, e);
            }
        }

        // 重置表初始化标志，确保新数据库会创建必要的表
        reset_table_initialization_flags();

        // 替换数据库连接
        {
            let mut db_guard = state.db_conn.write().await;
            *db_guard = new_db;
        }

        info!("Successfully switched to database for user: {}", uid);
        Ok(())
    }
    .await;

    result.map_err(|e| e.to_string())
}
