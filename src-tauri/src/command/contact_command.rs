use crate::AppData;
use crate::error::CommonError;
use crate::im_reqest_client::ImRequestClient;
use crate::repository::im_contact_repository::{save_contact_batch, update_contact_hide};

use entity::im_contact;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use tracing::{error, info};

#[tauri::command]
pub async fn list_contacts_command(
    state: State<'_, AppData>,
) -> Result<Vec<im_contact::Model>, String> {
    info!("查询所有会话列表:");
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
        )
        .await?;
        // 设置缓存标记
        info!("Successfully queried contact list data: {:?}", data);
        return Ok(data);
    }
    .await;

    match result {
        Ok(contacts) => Ok(contacts),
        Err(e) => {
            error!("Failed to get contact list: {:?}", e);
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
        .get("/im/chat/contact/list")
        .send_json::<Vec<im_contact::Model>>()
        .await?;

    if let Some(data) = resp.data {
        // 保存到本地数据库
        save_contact_batch(db_conn.deref(), data.clone(), &login_uid)
            .await
            .map_err(|e| anyhow::anyhow!("[{}:{}] Failed to save contact data to local database: {}", file!(), line!(), e))?;

        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "Failed to get contact data"
        )))
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HideContactRequest {
    room_id: String,
    hide: bool,
}

#[tauri::command]
pub async fn hide_contact_command(
    state: State<'_, AppData>,
    data: HideContactRequest,
) -> Result<(), String> {
    info!("Hide contact: room_id={}, hide={}", data.room_id, data.hide);
    let result: Result<(), CommonError> = async {
        // 获取当前登录用户的 uid
        let login_uid = {
            let user_info = state.user_info.lock().await;
            user_info.uid.clone()
        };

        let resp = state
            .request_client
            .lock()
            .await
            .post("/im/chat/setHide")
            .json(&data)
            .send_json::<bool>()
            .await?;

        if resp.success {
            // 更新本地数据库
            update_contact_hide(
                state.db_conn.deref(),
                &data.room_id.clone(),
                data.hide,
                &login_uid,
            )
            .await?;

            info!("Successfully hid contact: room_id={}", &data.room_id.clone());
            Ok(())
        } else {
            Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "Failed to hide contact: {}",
                resp.msg.unwrap_or_default()
            )))
        }
    }
    .await;

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            error!("Failed to hide contact: {:?}", e);
            Err(e.to_string())
        }
    }
}
