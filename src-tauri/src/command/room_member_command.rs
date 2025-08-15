use crate::AppData;
use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp, Page, PageParam};
use crate::repository::im_room_member_repository::{
    get_room_members_by_room_id, save_room_member_batch,
    update_my_room_info as update_my_room_info_db,
};
use crate::vo::vo::MyRoomInfoReq;

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
        .map_err(|e| {
            anyhow::anyhow!(
                "[{}:{}] Failed to update local database: {}",
                file!(),
                line!(),
                e
            )
        })?;
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
                    .map_err(|e| {
                        anyhow::anyhow!(
                            "[{}:{}] Failed to query room members from local database: {}",
                            file!(),
                            line!(),
                            e
                        )
                    })?;

            // 对查询结果进行排序
            sort_room_members(&mut local_members);

            // 异步调用后端接口更新本地数据库（添加延迟避免立即冲突）
            let db_conn = state.db_conn.clone();
            let request_client = state.request_client.clone();
            let room_id_clone = room_id.clone();
            let login_uid_clone = login_uid.clone();
            tokio::spawn(async move {
                // 添加小延迟，避免与当前数据库操作冲突
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                if let Err(e) = fetch_and_update_room_members(
                    room_id_clone,
                    db_conn,
                    request_client,
                    login_uid_clone,
                )
                .await
                {
                    error!("异步更新房间成员数据到本地数据库失败: {:?}", e);
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

/// 从本地数据库分页查询群房间数据，如果为空则从后端获取
#[tauri::command]
pub async fn page_room(
    page_param: PageParam,
    state: State<'_, AppData>,
) -> Result<Page<im_room::Model>, String> {
    let result: Result<Page<im_room::Model>, CommonError> = async {
        // 直接调用后端接口获取数据，不保存到数据库
        let data = fetch_rooms_from_backend(
            page_param,
            state.request_client.clone(),
        )
        .await?;

        Ok(data)
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

/// 从后端获取房间数据（不保存到数据库）
async fn fetch_rooms_from_backend(
    page_param: PageParam,
    request_client: Arc<Mutex<ImRequestClient>>,
) -> Result<Page<im_room::Model>, CommonError> {
    let client = request_client.lock().await;

    let resp = client
        .get("/im/room/group/list")
        .query(&page_param)
        .send_json::<Page<im_room::Model>>()
        .await
        .map_err(|e| {
            anyhow::anyhow!(
                "[{}:{}] Failed to fetch room data from backend: {}",
                file!(),
                line!(),
                e
            )
        })?;

    if let Some(data) = resp.data {
        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "No data returned from backend"
        )))
    }
}

/// 对房间成员列表进行排序：群主优先，管理员按在线时间排序，其他用户按在线状态和时间排序
fn sort_room_members(members: &mut Vec<im_room_member::Model>) {
    // 对于小数据集使用不稳定排序
    members.sort_unstable_by(|a, b| {
        use std::cmp::Ordering;

        let a_role = a.group_role.unwrap_or(0);
        let b_role = b.group_role.unwrap_or(0);

        // 三层排序逻辑，单次遍历
        match (a_role, b_role) {
            // 群主(1)优先级最高
            (1, 1) => Ordering::Equal,
            (1, _) => Ordering::Less,
            (_, 1) => Ordering::Greater,

            // 管理员(2)排在群主后面，按在线时间排序（最近在线的在前）
            (2, 2) => b.last_opt_time.cmp(&a.last_opt_time),
            (2, _) => Ordering::Less,
            (_, 2) => Ordering::Greater,

            // 其他用户：先按在线状态排序，再按最新在线时间排序
            _ => {
                let a_status = a.active_status.unwrap_or(0);
                let b_status = b.active_status.unwrap_or(0);

                match a_status.cmp(&b_status) {
                    Ordering::Equal => b.last_opt_time.cmp(&a.last_opt_time),
                    other => other,
                }
            }
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

    // 更新本地数据库（添加重试机制）
    if let Some(data) = resp.data {
        if !data.is_empty() {
            let room_id_i64 = room_id.parse::<i64>().unwrap_or(0);

            // 添加重试机制处理数据库锁定问题
            let mut retry_count = 0;
            const MAX_RETRIES: u32 = 3;

            while retry_count < MAX_RETRIES {
                match save_room_member_batch(db_conn.deref(), data.clone(), room_id_i64, &login_uid)
                    .await
                {
                    Ok(_) => {
                        info!(
                            "Successfully updated room member data for room_id: {}",
                            room_id
                        );
                        return Ok(data.clone());
                    }
                    Err(e) => {
                        retry_count += 1;
                        let error_msg = e.to_string();

                        if error_msg.contains("database is locked") && retry_count < MAX_RETRIES {
                            // 如果是数据库锁定错误，等待一段时间后重试
                            let delay =
                                tokio::time::Duration::from_millis(500 * retry_count as u64);
                            tokio::time::sleep(delay).await;
                            info!(
                                "Database locked, retrying ({}/{}) after {}ms delay",
                                retry_count,
                                MAX_RETRIES,
                                delay.as_millis()
                            );
                        } else {
                            // 其他错误或重试次数用完，直接返回错误
                            return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                                "[{}:{}] 异步更新房间成员数据到本地数据库失败: {}",
                                file!(),
                                line!(),
                                e
                            )));
                        }
                    }
                }
            }

            // 如果所有重试都失败了
            return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "[{}:{}] 异步更新房间成员数据到本地数据库失败: 重试 {} 次后仍然失败",
                file!(),
                line!(),
                MAX_RETRIES
            )));
        }
    }

    Ok(Vec::new())
}

// 获取并更新房间数据
// async fn fetch_and_update_rooms(
//     page_param: PageParam,
//     db_conn: Arc<DatabaseConnection>,
//     request_client: Arc<Mutex<ImRequestClient>>,
//     login_uid: String,
// ) -> Result<Page<im_room::Model>, CommonError> {
//     // 从后端API获取数据
//     let resp = request_client
//         .lock()
//         .await
//         .get("/im/room/group/list")
//         .query(&page_param)
//         .send_json::<Page<im_room::Model>>()
//         .await?;

//     if let Some(data) = resp.data {
//         // 保存到本地数据库
//         save_room_batch(db_conn.deref(), data.records.clone(), &login_uid)
//             .await
//             .map_err(|e| {
//                 anyhow::anyhow!(
//                     "[{}:{}] Failed to save room data to local database: {}",
//                     file!(),
//                     line!(),
//                     e
//                 )
//             })?;

//         Ok(data)
//     } else {
//         Err(CommonError::UnexpectedError(anyhow::anyhow!(
//             "获取房间数据失败"
//         )))
//     }
// }
