use crate::AppData;
use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp, Page, PageParam};
use crate::repository::im_room_member_repository::update_my_room_info as update_my_room_info_db;
use crate::vo::vo::MyRoomInfoReq;

use entity::{im_room, im_room_member};
use tracing::{error, info};

use crate::im_request_client::{ImRequestClient, ImUrl};
use crate::repository::im_room_member_repository;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::ops::Deref;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomMemberResponse {
    pub id: String,
    pub room_id: Option<String>,
    pub uid: Option<String>,
    pub account: Option<String>,
    pub my_name: Option<String>,
    pub active_status: Option<u8>,
    #[serde(rename = "roleId")]
    pub group_role: Option<i64>,
    pub loc_place: Option<String>,
    pub last_opt_time: i64,
    pub create_time: Option<i64>,
    pub name: String,
    pub avatar: Option<String>,
    pub user_state_id: Option<String>,
    #[serde(rename = "wearingItemId")]
    pub wearing_item_id: Option<String>,
    #[serde(rename = "itemIds")]
    pub item_ids: Option<Vec<String>>,
    pub linked_gitee: Option<bool>,
    pub linked_github: Option<bool>,
}

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
        let _resp: Option<bool> = state
            .rc
            .lock()
            .await
            .im_request(
                ImUrl::UpdateMyRoomInfo,
                Some(my_room_info.clone()),
                None::<serde_json::Value>,
            )
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
) -> Result<Vec<RoomMemberResponse>, String> {
    info!("Calling to get all member list of room with room_id");
    let result: Result<Vec<RoomMemberResponse>, CommonError> = async {
        let login_uid = {
            let user_info = state.user_info.lock().await;
            user_info.uid.clone()
        };

        let mut members = fetch_and_update_room_members(
            room_id.clone(),
            state.db_conn.clone(),
            state.rc.clone(),
            login_uid.clone(),
        )
        .await?;

        sort_room_members(&mut members);

        Ok(members)
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

// 从本地数据库分页查询群房间数据，如果为空则从后端获取
#[tauri::command]
pub async fn page_room(
    page_param: PageParam,
    state: State<'_, AppData>,
) -> Result<Page<im_room::Model>, String> {
    let result: Result<Page<im_room::Model>, CommonError> = async {
        // 直接调用后端接口获取数据，不保存到数据库
        let data = fetch_rooms_from_backend(page_param, state.rc.clone()).await?;

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
    let mut client = request_client.lock().await;

    let resp: Option<Page<im_room::Model>> = client
        .im_request(
            ImUrl::GroupList,
            None::<serde_json::Value>,
            Some(page_param),
        )
        .await?;

    if let Some(data) = resp {
        Ok(data)
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "No data returned from backend"
        )))
    }
}

/// 对房间成员列表进行排序：按角色优先，再按在线状态，最后按名称字母序
fn sort_room_members(members: &mut Vec<RoomMemberResponse>) {
    members.sort_by(|a, b| {
        let role_cmp = match (a.group_role, b.group_role) {
            (Some(a_role), Some(b_role)) if a_role != b_role => a_role.cmp(&b_role),
            _ => Ordering::Equal,
        };
        if role_cmp != Ordering::Equal {
            return role_cmp;
        }

        let a_status = a.active_status.unwrap_or(u8::MAX);
        let b_status = b.active_status.unwrap_or(u8::MAX);
        if a_status != b_status {
            return a_status.cmp(&b_status);
        }

        let a_name = a.name.to_lowercase();
        let b_name = b.name.to_lowercase();
        a_name.cmp(&b_name)
    });
}

/// 异步更新房间成员数据
async fn fetch_and_update_room_members(
    room_id: String,
    _db_conn: Arc<DatabaseConnection>,
    request_client: Arc<Mutex<ImRequestClient>>,
    _login_uid: String,
) -> Result<Vec<RoomMemberResponse>, CommonError> {
    let resp: Option<Vec<RoomMemberResponse>> = request_client
        .lock()
        .await
        .im_request(
            ImUrl::GroupListMember,
            None::<serde_json::Value>,
            Some(serde_json::json!({
                "roomId": room_id
            })),
        )
        .await?;

    if let Some(data) = resp {
        return Ok(data);
    }

    Ok(Vec::new())
}
