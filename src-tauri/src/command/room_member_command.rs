use crate::AppData;
use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp, Page, PageParam};
use crate::repository::im_room_member_repository::{
    get_room_members_by_room_id, get_room_page, save_room_batch, save_room_member_batch,
    update_my_room_info as update_my_room_info_db,
};
use crate::vo::vo::MyRoomInfoReq;
use anyhow::Context;
use entity::{im_room, im_room_member};
use tracing::{error, info};

use crate::im_reqest_client::ImRequestClient;
use crate::repository::im_room_member_repository;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn update_my_room_info(
    my_room_info: MyRoomInfoReq,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let result: Result<(), CommonError> = async {
        // 获取当前用户信息
        let user_info = state.user_info.lock().await;
        let uid = user_info.uid.clone();
        drop(user_info);

        // 调用后端接口更新房间信息
        let _resp = state
            .request_client
            .lock()
            .await
            .post("/im/room/updateMyRoomInfo")
            .json(&my_room_info)
            .send_json::<bool>()
            .await?;

        // 更新本地数据库
        update_my_room_info_db(
            state.db_conn.deref(),
            &my_room_info.my_name,
            &my_room_info.id,
            &uid,
            &uid,
        )
        .await
        .with_context(|| format!("[{}:{}] Failed to update local database", file!(), line!()))?;
        Ok(())
    }
    .await;

    match result {
        Ok(members) => Ok(members),
        Err(e) => {
            error!("Failed to update room information: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取room_id的房间的所有成员列表
#[tauri::command]
pub async fn get_room_members(
    room_id: String,
    state: State<'_, AppData>,
) -> Result<Vec<im_room_member::Model>, String> {
    info!("Calling to get all member list of room with room_id");
    let result: Result<Vec<im_room_member::Model>, CommonError> = async {
        // 检查缓存中是否存在该room_id
        let cache_key = format!("room_members_{}", room_id);
        let is_cached = state.cache.get(&cache_key).await.is_some();

        if !is_cached {
            // 获取当前登录用户的 uid
            let login_uid = {
                let user_info = state.user_info.lock().await;
                user_info.uid.clone()
            };

            let mut data = fetch_and_update_room_members(
                room_id.clone(),
                state.db_conn.clone(),
                state.request_client.clone(),
                login_uid.clone(),
            )
            .await?;
            // 设置缓存标记
            state.cache.insert(cache_key, "cached".to_string()).await;
            // 对从后端获取的数据进行排序
            sort_room_members(&mut data);
            return Ok(data);
        } else {
            // 获取当前登录用户的 uid
            let login_uid = {
                let user_info = state.user_info.lock().await;
                user_info.uid.clone()
            };

            // 有缓存：从本地数据库获取数据
            let mut local_members =
                get_room_members_by_room_id(&room_id, state.db_conn.deref(), &login_uid)
                    .await
                    .with_context(|| {
                        format!("[{}:{}] Failed to query room members from local database", file!(), line!())
                    })?;

            // 对查询结果进行排序
            sort_room_members(&mut local_members);

            // 异步调用后端接口更新本地数据库
            let db_conn = state.db_conn.clone();
            let request_client = state.request_client.clone();
            let room_id_clone = room_id.clone();
            let login_uid_clone = login_uid.clone();
            tokio::spawn(async move {
                if let Err(e) = fetch_and_update_room_members(
                    room_id_clone,
                    db_conn,
                    request_client,
                    login_uid_clone,
                )
                .await
                {
                    error!("Failed to asynchronously update room member data: {:?}", e);
                }
            });

            Ok(local_members)
        }
    }
    .await;

    match result {
        Ok(members) => Ok(members),
        Err(e) => {
            error!("Failed to get all room member data: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CursorPageRoomMemberParam {
    room_id: String,
    #[serde(flatten)]
    cursor_page_param: CursorPageParam,
}

// 游标分页查询数据
#[tauri::command]
pub async fn cursor_page_room_members(
    param: CursorPageRoomMemberParam,
    state: State<'_, AppData>,
) -> Result<CursorPageResp<Vec<im_room_member::Model>>, String> {
    // 获取当前登录用户的 uid
    let login_uid = {
        let user_info = state.user_info.lock().await;
        user_info.uid.clone()
    };

    let data = im_room_member_repository::cursor_page_room_members(
        state.db_conn.deref(),
        param.room_id,
        param.cursor_page_param,
        &login_uid,
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(data)
}

/// 从本地数据库分页查询房间数据，如果为空则从后端获取
#[tauri::command]
pub async fn page_room(
    page_param: PageParam,
    state: State<'_, AppData>,
) -> Result<Page<im_room::Model>, String> {
    let result: Result<Page<im_room::Model>, CommonError> = async {
        // 检查缓存中是否存在房间列表数据
        let cache_key = format!("room_list_page_{}_{}", page_param.current, page_param.size);
        let is_cached = state.cache.get(&cache_key).await.is_some();

        if !is_cached {
            // 获取当前登录用户的 uid
            let login_uid = {
                let user_info = state.user_info.lock().await;
                user_info.uid.clone()
            };

            // 第一次查询：先调用后端接口，再更新本地数据库
            let data = fetch_and_update_rooms(
                page_param.clone(),
                state.db_conn.clone(),
                state.request_client.clone(),
                login_uid,
            )
            .await?;
            // 设置缓存标记
            state.cache.insert(cache_key, "cached".to_string()).await;
            return Ok(data);
        } else {
            // 获取当前登录用户的 uid
            let login_uid = {
                let user_info = state.user_info.lock().await;
                user_info.uid.clone()
            };

            // 有缓存：从本地数据库获取数据
            let local_result = get_room_page(page_param.clone(), state.db_conn.deref(), &login_uid)
                .await
                .with_context(|| format!("[{}:{}] Failed to query local database", file!(), line!()))?;

            // 异步调用后端接口更新本地数据库
            let db_conn = state.db_conn.clone();
            let request_client = state.request_client.clone();
            let page_param_clone = page_param.clone();
            let login_uid_clone = login_uid.clone();
            tokio::spawn(async move {
                if let Err(e) = fetch_and_update_rooms(
                    page_param_clone,
                    db_conn,
                    request_client,
                    login_uid_clone,
                )
                .await
                {
                    error!("Failed to asynchronously update room data: {:?}", e);
                }
            });

            Ok(local_result)
        }
    }
    .await;

    match result {
        Ok(page_data) => Ok(page_data),
        Err(e) => {
            error!("Failed to get paginated room data: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 对房间成员列表进行排序：在线用户优先(active_status=1)，相同状态下按last_opt_time降序
fn sort_room_members(members: &mut Vec<im_room_member::Model>) {
    members.sort_by(|a, b| {
        let a_status = a.active_status.unwrap_or(0);
        let b_status = b.active_status.unwrap_or(0);

        // 先按active_status升序排序（在线用户优先）
        match a_status.cmp(&b_status) {
            std::cmp::Ordering::Equal => {
                // active_status相同时，按last_opt_time降序排序
                b.last_opt_time.cmp(&a.last_opt_time)
            }
            other => other,
        }
    });
}

/// 异步更新房间成员数据
async fn fetch_and_update_room_members(
    room_id: String,
    db_conn: Arc<DatabaseConnection>,
    request_client: Arc<Mutex<ImRequestClient>>,
    login_uid: String,
) -> Result<Vec<im_room_member::Model>, CommonError> {
    // 从后端API获取最新数据
    let resp = request_client
        .lock()
        .await
        .get("/im/room/group/listMember")
        .query(&[("roomId", &room_id)])
        .send_json::<Vec<im_room_member::Model>>()
        .await?;

    // 更新本地数据库
    if let Some(data) = resp.data {
        if !data.is_empty() {
            let room_id_i64 = room_id.parse::<i64>().unwrap_or(0);
            save_room_member_batch(db_conn.deref(), data.clone(), room_id_i64, &login_uid)
                .await
                .with_context(|| {
                    format!(
                        "[{}:{}] 异步更新房间成员数据到本地数据库失败",
                        file!(),
                        line!()
                    )
                })?;
            return Ok(data.clone());
        }
    }

    Ok(Vec::new())
}

/// 获取并更新房间数据
async fn fetch_and_update_rooms(
    page_param: PageParam,
    db_conn: Arc<DatabaseConnection>,
    request_client: Arc<Mutex<ImRequestClient>>,
    login_uid: String,
) -> Result<Page<im_room::Model>, CommonError> {
    // 从后端API获取数据
    let resp = request_client
        .lock()
        .await
        .get("/im/room/group/list")
        .query(&page_param)
        .send_json::<Page<im_room::Model>>()
        .await?;

    if let Some(data) = resp.data {
        // 保存到本地数据库
        save_room_batch(db_conn.deref(), data.records.clone(), &login_uid)
            .await
            .with_context(|| format!("[{}:{}] Failed to save room data to local database", file!(), line!()))?;

        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "获取房间数据失败"
        )))
    }
}
