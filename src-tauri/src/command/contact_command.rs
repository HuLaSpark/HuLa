use tauri::State;
use entity::im_contact;
use crate::AppData;
use crate::error::CommonError;
use crate::pojo::common::ApiResult;
use crate::repository::im_contact_repository::{list_contact, save_contact_batch};
use anyhow::Context;
use std::ops::Deref;
use std::sync::Arc;
use tokio::sync::Mutex;
use sea_orm::DatabaseConnection;
use crate::im_reqest_client::ImRequestClient;

#[tauri::command]
pub async fn list_contacts_command(state: State<'_, AppData>) -> Result<Vec<im_contact::Model>, String> {
    let result: Result<Vec<im_contact::Model>, CommonError> = async {
        // 检查缓存中是否存在联系人列表数据
        let cache_key = "contacts_list".to_string();
        let is_cached = state.cache.get(&cache_key).await.is_some();
        
        if !is_cached {
            // 第一次查询：先调用后端接口，再更新本地数据库
            let data = fetch_and_update_contacts(state.db_conn.clone(), state.request_client.clone()).await?;
            // 设置缓存标记
            state.cache.insert(cache_key, "cached".to_string()).await;
            return Ok(data);
        } else {
            // 有缓存：从本地数据库获取数据
            let local_contacts = list_contact(state.db_conn.deref())
                .await
                .with_context(|| format!("[{}:{}] 本地数据库查询联系人失败", file!(), line!()))?;
            
            // 异步调用后端接口更新本地数据库
            let db_conn = state.db_conn.clone();
            let request_client = state.request_client.clone();
            tokio::spawn(async move {
                if let Err(e) = fetch_and_update_contacts(db_conn, request_client).await {
                    eprintln!("异步更新联系人数据失败: {:?}", e);
                }
            });
            
            Ok(local_contacts)
        }
    }.await;
    
    match result {
        Ok(contacts) => Ok(contacts),
        Err(e) => {
            eprintln!("获取联系人列表失败: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取并更新联系人数据
async fn fetch_and_update_contacts(
    db_conn: Arc<DatabaseConnection>,
    request_client: Arc<Mutex<ImRequestClient>>,
) -> Result<Vec<im_contact::Model>, CommonError> {
    // 从后端API获取联系人数据
    let resp = request_client
        .lock()
        .await
        .get("/chat/contact/list")
        .send_json::<ApiResult<Vec<im_contact::Model>>>()
        .await?;
    
    if let Some(data) = resp.data {
        // 保存到本地数据库
        save_contact_batch(db_conn.deref(), data.clone())
            .await
            .with_context(|| {
                format!("[{}:{}] 保存联系人数据到本地数据库失败", file!(), line!())
            })?;
        
        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!("获取联系人数据失败")))
    }
}