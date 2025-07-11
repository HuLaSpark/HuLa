use crate::error::CommonError;
use crate::pojo::common::{ApiResult, CursorPageParam, CursorPageResp, Page, PageParam};
use crate::repository::im_room_member_repository::{get_room_members_by_room_id, get_room_page, save_room_batch, save_room_member_batch, update_my_room_info as update_my_room_info_db};
use crate::vo::vo::MyRoomInfoReq;
use crate::AppData;
use anyhow::{Context};
use entity::{im_room, im_room_member};

use std::ops::Deref;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::repository::im_room_member_repository;


#[tauri::command]
pub async fn update_my_room_info(my_room_info: MyRoomInfoReq, state: State<'_, AppData>) -> Result<(), String> {
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
            .post("/room/updateMyRoomInfo")
            .json(&my_room_info)
            .send_json::<crate::pojo::common::ApiResult<bool>>()
            .await
            .with_context(|| format!("[{}:{}] 调用后端接口更新房间信息失败", file!(), line!()))?;

        // 更新本地数据库
        update_my_room_info_db(
            state.db_conn.deref(),
            &my_room_info.my_name,
            &my_room_info.id,
            &uid,
        )
        .await
        .with_context(|| format!("[{}:{}] 更新本地数据库失败", file!(), line!()))?;
        Ok(())
    }.await;

    match result {
        Ok(members) => Ok(members),
        Err(e) => {
            eprintln!("更新房间信息失败: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取room_id的房间的所有成员列表
#[tauri::command]
pub async fn get_room_members(room_id: String, state: State<'_, AppData>) -> Result<Vec<im_room_member::Model>, String> {
    let result: Result<Vec<im_room_member::Model>, CommonError> = async {
        // 先从本地数据库查询
        let mut local_members = get_room_members_by_room_id(&room_id, state.db_conn.deref())
            .await
            .with_context(|| format!("[{}:{}] 本地数据库查询房间成员失败", file!(), line!()))?;
        
        // 对查询结果进行排序：在线用户优先(active_status=1)，相同状态下按last_opt_time降序
        sort_room_members(&mut local_members);
        
        // 如果本地数据为空，则从后端获取
        if local_members.is_empty() {
            // 从后端API获取数据
            let resp = state
                .request_client
                .lock()
                .await
                .get(&format!("/room/group/listMember"))
                .query(&[("roomId", &room_id)])
                .send_json::<ApiResult<Vec<im_room_member::Model>>>()
                .await?;
            
            // 保存到本地数据库
            if let Some(mut data) = resp.data {
                if !data.is_empty() {
                    let room_id_i64 = room_id.parse::<i64>().unwrap_or(0);
                    save_room_member_batch(state.db_conn.deref(), data.clone(), room_id_i64)
                        .await
                        .with_context(|| {
                            format!("[{}:{}] 保存房间成员数据到本地数据库失败", file!(), line!())
                        })?;
                }
                
                // 对从后端获取的数据也进行排序
                sort_room_members(&mut data);
                
                return Ok(data);
            } else {
                return Err(CommonError::UnexpectedError(anyhow::anyhow!("后端返回数据为空")));
            }
        } else {
            // 返回本地数据
            Ok(local_members)
        }
    }.await;
    
    match result {
        Ok(members) => Ok(members),
        Err(e) => {
            eprintln!("获取房间全部成员数据失败: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CursorPageRoomMemberParam {
    room_id: String,
    #[serde(flatten)]
    cursor_page_param: CursorPageParam
}

// 游标分页查询数据
#[tauri::command]
pub async fn cursor_page_room_members(param: CursorPageRoomMemberParam, state: State<'_, AppData>) -> Result<CursorPageResp<Vec<im_room_member::Model>>, String>{
    let data = im_room_member_repository::cursor_page_room_members(state.db_conn.deref(), param.room_id, param.cursor_page_param)
        .await.map_err(|e| e.to_string())?;
    Ok(data)
}

/// 从本地数据库分页查询房间数据，如果为空则从后端获取
#[tauri::command]
pub async fn page_room(
    page_param: PageParam,
    state: State<'_, AppData>,
) -> Result<Page<im_room::Model>, String> {
    let result: Result<Page<im_room::Model>, CommonError> = async {
        // 先从本地数据库查询
        let local_result = get_room_page(page_param.clone(), state.db_conn.deref())
            .await
            .with_context(|| format!("[{}:{}] 本地数据库查询失败", file!(), line!()))?;

        // 如果本地数据为空，则从后端获取
        if local_result.records.is_empty() {
            // 从后端API获取数据并保存到本地
            let resp = state
                .request_client
                .lock()
                .await
                .get("/room/group/list")
                .query(&page_param)
                .send_json::<ApiResult<Page<im_room::Model>>>()
                .await?;

            // 保存到本地数据库
            if let Some(data) = resp.data {
                save_room_batch(state.db_conn.deref(), data.records.clone())
                    .await
                    .with_context(|| {
                        format!("[{}:{}] 保存房间成员数据到本地数据库失败", file!(), line!())
                    })?;

                return Ok(data);
            } else {
                return Err(CommonError::UnexpectedError(anyhow::anyhow!("<UNK>")));
            }
        } else {
            // 返回本地数据
            Ok(local_result)
        }
    }
    .await;

    match result {
        Ok(page_data) => Ok(page_data),
        Err(e) => {
            eprintln!("分页获取房间数据失败: {:?}", e);
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
