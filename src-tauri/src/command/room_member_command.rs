use crate::AppData;
use crate::error::CommonError;
use crate::pojo::common::{ApiResult, Page, PageParam};
use anyhow::Context;
use entity::im_room_member;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, QuerySelect, Set, TransactionTrait,
};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::State;

/// 从远程 API 获取 room 相关数据并保存到本地数据库
#[tauri::command]
pub async fn get_room_page(page_param: PageParam, state: State<'_, AppData>) -> Result<(), String> {
    let result = async {
        let resp = state
            .request_client
            .get(&format!(
                "{}/room/group/list",
                state.config.backend.base_url
            ))
            .query(&page_param)
            .send()
            .await
            .with_context(|| "Http 调用异常")?
            .json::<ApiResult<Page<im_room_member::Model>>>()
            .await
            .with_context(|| "Json 序列化异常")?;

        let records = resp.data.records;
        save_room_batch(state.db_conn.deref(), records).await?;
        Ok::<(), CommonError>(())
    }
    .await;

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub async fn page_room(
    page_param: PageParam,
    db: &DatabaseConnection,
) -> Result<Page<im_room_member::Model>, CommonError> {
    // 计算偏移量
    let offset = (page_param.current - 1) * page_param.size;

    // 查询总数
    let total = im_room_member::Entity::find()
        .count(db)
        .await
        .with_context(|| "查询房间成员总数失败")?;

    // 分页查询数据
    let records = im_room_member::Entity::find()
        .offset(offset as u64)
        .limit(page_param.size as u64)
        .all(db)
        .await
        .with_context(|| "分页查询房间成员失败")?;

    Ok(Page {
        records,
        total,
        size: page_param.size,
    })
}

/// 从本地数据库分页查询房间成员数据，如果为空则从后端获取
#[tauri::command]
pub async fn page_room_members(
    page_param: PageParam,
    state: State<'_, AppData>,
) -> Result<Page<im_room_member::Model>, String> {
    let result: Result<Page<im_room_member::Model>, CommonError> = async {
        // 先从本地数据库查询
        let local_result = page_room(page_param.clone(), state.db_conn.deref())
            .await
            .with_context(|| format!("[{}:{}] 本地数据库查询失败", file!(), line!()))?;

        // 如果本地数据为空，则从后端获取
        if local_result.records.is_empty() {
            // 从后端API获取数据并保存到本地
            let resp = state
                .request_client
                .get(&format!(
                    "{}/room/group/list",
                    state.config.backend.base_url
                ))
                .query(&page_param)
                .send()
                .await
                .with_context(|| format!("[{}:{}] 从后端获取房间成员数据失败", file!(), line!()))?;

            let body = resp
                .text()
                .await
                .with_context(|| format!("[{}:{}] 读取响应体失败", file!(), line!()))?;
            println!("[{}:{}] 后端响应数据: {}", file!(), line!(), body);
            let api_result: ApiResult<Page<im_room_member::Model>> = serde_json::from_str(&body)
                .with_context(|| {
                    format!(
                        "[{}:{}] 解析后端响应数据失败，响应内容: {}",
                        file!(),
                        line!(),
                        body
                    )
                })?;

            // 保存到本地数据库
            if !api_result.data.records.is_empty() {
                save_room_batch(state.db_conn.deref(), api_result.data.records.clone())
                    .await
                    .with_context(|| {
                        format!("[{}:{}] 保存房间成员数据到本地数据库失败", file!(), line!())
                    })?;
            }

            // 返回从后端获取的数据
            Ok(api_result.data)
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

pub async fn save_room_batch(
    db: &DatabaseConnection,
    room_members: Vec<im_room_member::Model>,
) -> Result<(), CommonError> {
    // 使用事务确保批量操作的原子性
    let txn = db.begin().await?;

    for member in room_members {
        // 检查是否已存在记录
        let existing = im_room_member::Entity::find()
            .filter(im_room_member::Column::RoomId.eq(member.room_id.clone()))
            .filter(im_room_member::Column::Uid.eq(member.uid.clone()))
            .one(&txn)
            .await?;

        // 转换为 ActiveModel
        let mut member_active = member.into_active_model();

        match existing {
            Some(existing_model) => {
                // 如果记录已存在，执行更新
                member_active.id = Set(existing_model.id); // 保留原ID
                member_active.update(&txn).await?;
            }
            None => {
                // 如果记录不存在，执行插入
                member_active.insert(&txn).await?;
            }
        }
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn save_room_member(
    room_member: String,
    room_id: String,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let db = state.db_conn.clone();

    // 执行保存操作并处理错误
    let result = async {
        let room_members: Vec<im_room_member::Model> =
            serde_json::from_str(&room_member).with_context(|| "房间成员数据反序列化失败")?;

        let uids: Vec<_> = room_members
            .iter()
            .filter(|room_member| room_member.uid.is_some())
            .map(|room_member| room_member.uid.clone().unwrap())
            .collect();

        let exist_data = im_room_member::Entity::find()
            .filter(im_room_member::Column::RoomId.eq(&room_id))
            .filter(im_room_member::Column::Uid.is_in(&uids))
            .all(db.deref())
            .await
            .with_context(|| format!("查询房间{}现有成员失败", room_id))?;

        if exist_data.len() > 0 {
            im_room_member::Entity::delete_many()
                .filter(im_room_member::Column::RoomId.eq(&room_id))
                .filter(im_room_member::Column::Uid.is_in(&uids))
                .exec(db.deref())
                .await
                .with_context(|| format!("删除房间{}现有成员失败", room_id))?;
        }

        let active_models: Vec<im_room_member::ActiveModel> = room_members
            .into_iter()
            .map(|room_member| {
                let entity = room_member.clone().into_active_model();
                entity
            })
            .collect();

        im_room_member::Entity::insert_many(active_models)
            .exec(db.deref())
            .await
            .with_context(|| format!("批量插入房间{}成员失败", room_id))?;

        Ok::<(), CommonError>(())
    }
    .await;

    // 如果发生错误，记录完整的错误堆栈信息并转换为String
    match result {
        Ok(()) => Ok(()),
        Err(e) => {
            eprintln!("保存房间{}成员失败: {:?}", room_id, e);
            Err(e.to_string())
        }
    }
}
