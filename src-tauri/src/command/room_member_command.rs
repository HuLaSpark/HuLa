use crate::error::CommonError;
use crate::pojo::common::{ApiResult, Page, PageParam};
use crate::repository::im_room_member_repository::{get_room_members_by_room_id, get_room_page, save_room_batch, save_room_member_batch};
use crate::AppData;
use anyhow::Context;
use entity::{im_room, im_room_member};

use std::ops::Deref;
use tauri::State;


#[tauri::command]
pub async fn get_room_members(room_id: String, state: State<'_, AppData>) -> Result<Vec<im_room_member::Model>, String> {
    let result: Result<Vec<im_room_member::Model>, CommonError> = async {
        // 先从本地数据库查询
        let local_members = get_room_members_by_room_id(&room_id, state.db_conn.deref())
            .await
            .with_context(|| format!("[{}:{}] 本地数据库查询房间成员失败", file!(), line!()))?;
        
        // 如果本地数据为空，则从后端获取
        if local_members.is_empty() {
            // 从后端API获取数据
            let resp = state
                .request_client
                .lock()
                .await
                .get(&format!("/room/group/member/list"))
                .query(&[("roomId", &room_id)])
                .send_json::<ApiResult<Vec<im_room_member::Model>>>()
                .await?;
            
            // 保存到本地数据库
            if let Some(data) = resp.data {
                if !data.is_empty() {
                    let room_id_i64 = room_id.parse::<i64>().unwrap_or(0);
                    save_room_member_batch(state.db_conn.deref(), data.clone(), room_id_i64)
                        .await
                        .with_context(|| {
                            format!("[{}:{}] 保存房间成员数据到本地数据库失败", file!(), line!())
                        })?;
                }
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
            eprintln!("获取房间成员数据失败: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 从本地数据库分页查询房间成员数据，如果为空则从后端获取
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
            eprintln!("获取房间成员数据失败: {:?}", e);
            Err(e.to_string())
        }
    }
}
