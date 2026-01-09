use crate::AppData;
use crate::error::CommonError;
use crate::im_request_client::{ImRequestClient, ImUrl};
use crate::repository::im_contact_repository::{
    list_contact, save_contact_batch, update_contact_hide,
};

use entity::im_contact;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::{Mutex, RwLock};
use tracing::{error, info};

#[tauri::command]
pub async fn list_contacts_command(
    state: State<'_, AppData>,
) -> Result<Vec<im_contact::Model>, String> {
    info!("Querying all conversation list:");
    let result: Result<Vec<im_contact::Model>, CommonError> = async {
        // 获取当前登录用户的 uid
        let login_uid = {
            let user_info = state.user_info.lock().await;
            user_info.uid.clone()
        };

        // 先尝试从本地 SQLite 读取（即时返回）
        let local_data = list_contact(&*state.db_conn.read().await, &login_uid).await;

        if let Ok(local_contacts) = &local_data {
            if !local_contacts.is_empty() {
                info!(
                    "Returning {} contacts from local SQLite",
                    local_contacts.len()
                );
                // 后台异步更新网络数据
                let db_conn = state.db_conn.clone();
                let rc = state.rc.clone();
                let uid = login_uid.clone();
                tokio::spawn(async move {
                    if let Err(e) = fetch_and_update_contacts(db_conn, rc, uid).await {
                        error!("Background contact sync failed: {:?}", e);
                    }
                });
                return Ok(local_contacts.clone());
            }
        }

        // 本地无数据，从网络获取
        info!("No local contacts, fetching from network");
        let data =
            fetch_and_update_contacts(state.db_conn.clone(), state.rc.clone(), login_uid.clone())
                .await?;
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
    db_conn: Arc<RwLock<DatabaseConnection>>,
    request_client: Arc<Mutex<ImRequestClient>>,
    login_uid: String,
) -> Result<Vec<im_contact::Model>, CommonError> {
    let resp: Option<Vec<im_contact::Model>> = request_client
        .lock()
        .await
        .im_request(
            ImUrl::GetContactList,
            None::<serde_json::Value>,
            None::<serde_json::Value>,
        )
        .await?;

    if let Some(data) = resp {
        // 保存到本地数据库
        save_contact_batch(&*db_conn.read().await, data.clone(), &login_uid)
            .await
            .map_err(|e| {
                anyhow::anyhow!(
                    "[{}:{}] Failed to save contact data to local database: {}",
                    file!(),
                    line!(),
                    e
                )
            })?;

        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "Failed to get contact data"
        )))
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

        let resp: Option<bool> = state
            .rc
            .lock()
            .await
            .im_request(
                ImUrl::SetHide,
                Some(data.clone()),
                None::<serde_json::Value>,
            )
            .await?;

        if let Some(_) = resp {
            // 更新本地数据库
            update_contact_hide(
                &*state.db_conn.read().await,
                &data.room_id.clone(),
                data.hide,
                &login_uid,
            )
            .await?;
            Ok(())
        } else {
            Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "Failed to hide contact"
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
