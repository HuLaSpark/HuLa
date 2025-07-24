use crate::AppData;
use crate::error::CommonError;
use crate::im_reqest_client::ImRequestClient;
use crate::repository::im_contact_repository::save_contact_batch;
use anyhow::Context;
use entity::im_contact;
use log::{error, info};
use sea_orm::DatabaseConnection;
use std::ops::Deref;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn list_contacts_command(
    state: State<'_, AppData>,
) -> Result<Vec<im_contact::Model>, String> {
    info!("获取所有会话");
    let result: Result<Vec<im_contact::Model>, CommonError> = async {
        // 获取当前登录用户的 uid
        let login_uid = {
            let user_info = state.user_info.lock().await;
            user_info.uid.clone()
        };

        let data = fetch_and_update_contacts(
            state.db_conn.clone(),
            state.request_client.clone(),
            login_uid.clone(),
        ).await?;
        // 设置缓存标记
        info!("查询联系人列表数据成功：{:?}", data);
        return Ok(data);
    }
    .await;

    match result {
        Ok(contacts) => Ok(contacts),
        Err(e) => {
            error!("获取联系人列表失败: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取并更新联系人数据
async fn fetch_and_update_contacts(
    db_conn: Arc<DatabaseConnection>,
    request_client: Arc<Mutex<ImRequestClient>>,
    login_uid: String,
) -> Result<Vec<im_contact::Model>, CommonError> {
    // 从后端API获取联系人数据
    let resp = request_client
        .lock()
        .await
        .get("/chat/contact/list")
        .send_json::<Vec<im_contact::Model>>()
        .await?;

    if let Some(data) = resp.data {
        // 保存到本地数据库
        save_contact_batch(db_conn.deref(), data.clone(), &login_uid)
            .await
            .with_context(|| format!("[{}:{}] 保存联系人数据到本地数据库失败", file!(), line!()))?;

        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "获取联系人数据失败"
        )))
    }
}
