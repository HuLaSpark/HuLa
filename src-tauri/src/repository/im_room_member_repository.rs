
use entity::{im_room, im_room_member};
use sea_orm::EntityTrait;
use sea_orm::IntoActiveModel;
use sea_orm::PaginatorTrait;
use sea_orm::QuerySelect;
use sea_orm::TransactionTrait;
use sea_orm::{ActiveModelTrait, Set};
use sea_orm::{ColumnTrait, DatabaseConnection, QueryFilter, QueryOrder};
use tracing::{debug, info};

use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::{
    error::CommonError,
    pojo::common::{Page, PageParam},
};

pub async fn cursor_page_room_members(
    db: &DatabaseConnection,
    room_id: String,
    cursor_page_param: CursorPageParam,
    login_uid: &str,
) -> Result<CursorPageResp<Vec<im_room_member::Model>>, CommonError> {
    // 查询总数
    let total = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(&room_id))
        .filter(im_room_member::Column::LoginUid.eq(login_uid))
        .count(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query room member count: {}", e))?;

    let mut query = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id))
        .filter(im_room_member::Column::LoginUid.eq(login_uid))
        .order_by_desc(im_room_member::Column::LastOptTime)
        .limit(cursor_page_param.page_size as u64);

    // 如果提供了游标，解析游标值并添加过滤条件
    if !cursor_page_param.cursor.is_empty() {
        // 从 cursor 中根据'_'分割最后一个字符串转为 i64
        let cursor_parts: Vec<&str> = cursor_page_param.cursor.split('_').collect();
        if let Some(last_part) = cursor_parts.last() {
            if let Ok(cursor_value) = last_part.parse::<i64>() {
                // 使用游标值过滤，获取小于该值的记录（因为是降序排列）
                query = query.filter(im_room_member::Column::LastOptTime.lt(cursor_value));
            }
        }
    }

    let members = query.all(db).await.map_err(|e| anyhow::anyhow!("Failed to query room members: {}", e))?;

    // 构建下一页游标和判断是否为最后一页
    let (next_cursor, is_last) = if members.len() < cursor_page_param.page_size as usize {
        // 如果返回的记录数少于请求的页面大小，说明是最后一页
        (String::new(), true)
    } else if let Some(last_member) = members.last() {
        // 使用最后一条记录的 last_opt_time 构建下一页游标
        let next_cursor = format!("{}", last_member.last_opt_time);
        (next_cursor, false)
    } else {
        (String::new(), true)
    };

    Ok(CursorPageResp {
        cursor: next_cursor,
        is_last,
        list: Some(members),
        total,
    })
}

pub async fn get_room_page(
    page_param: PageParam,
    db: &DatabaseConnection,
    login_uid: &str,
) -> Result<Page<im_room::Model>, CommonError> {
    // 计算偏移量
    let offset = (page_param.current - 1) * page_param.size;

    // 查询总数
    let total = im_room::Entity::find()
        .filter(im_room::Column::LoginUid.eq(login_uid))
        .count(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query room count: {}", e))?;

    // 分页查询数据
    let records = im_room::Entity::find()
        .filter(im_room::Column::LoginUid.eq(login_uid))
        .offset(offset as u64)
        .limit(page_param.size as u64)
        .all(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query room data: {}", e))?;

    Ok(Page {
        records,
        total: total.to_string(),
        size: page_param.size.to_string(),
    })
}

pub async fn save_room_batch(
    db: &DatabaseConnection,
    room_members: Vec<im_room::Model>,
    login_uid: &str,
) -> Result<(), CommonError> {
    // 使用事务确保批量操作的原子性
    let txn = db.begin().await?;

    for mut member in room_members {
        // 设置 login_uid
        member.login_uid = login_uid.to_string();

        // 检查记录是否已存在
        let existing = im_room::Entity::find()
            .filter(im_room::Column::Id.eq(member.id.clone()))
            .filter(im_room::Column::LoginUid.eq(member.login_uid.clone()))
            .one(&txn)
            .await?;

        if existing.is_none() {
            // 如果记录不存在，执行插入
            let member_active = member.into_active_model();
            member_active.insert(&txn).await?;
        }
        // 如果记录已存在，跳过插入
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

pub async fn get_room_members_by_room_id(
    room_id: &str,
    db: &DatabaseConnection,
    login_uid: &str,
) -> Result<Vec<im_room_member::Model>, CommonError> {
    let members = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id))
        .filter(im_room_member::Column::LoginUid.eq(login_uid))
        .all(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query room members: {}", e))?;

    Ok(members)
}

pub async fn save_room_member_batch(
    db: &DatabaseConnection,
    room_members: Vec<im_room_member::Model>,
    room_id: i64,
    login_uid: &str,
) -> Result<(), CommonError> {
    // 使用事务确保操作的原子性
    let txn = db.begin().await?;

    // 根据room_id和login_uid查询现有数据
    let existing_members = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id.to_string()))
        .filter(im_room_member::Column::LoginUid.eq(login_uid))
        .all(&txn)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query existing room members: {}", e))?;

    if !existing_members.is_empty() {
        // 如果有数据，则删除当前用户的现有数据
        im_room_member::Entity::delete_many()
            .filter(im_room_member::Column::RoomId.eq(room_id.to_string()))
            .filter(im_room_member::Column::LoginUid.eq(login_uid))
            .exec(&txn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to delete existing room members: {}", e))?;
    }

    // 保存新的room_members数据（批量插入）
    if !room_members.is_empty() {
        let active_models: Vec<im_room_member::ActiveModel> = room_members
            .into_iter()
            .map(|member| {
                let mut member_active = member.into_active_model();
                member_active.login_uid = Set(login_uid.to_string());
                member_active.room_id = Set(Some(room_id.to_string()));
                member_active
            })
            .collect();

        im_room_member::Entity::insert_many(active_models)
            .exec(&txn)
            .await?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

pub async fn update_my_room_info(
    db: &DatabaseConnection,
    my_name: &str,
    room_id: &str,
    uid: &str,
    login_uid: &str,
) -> Result<(), CommonError> {
    // 根据 room_id、uid 和 login_uid 查找房间成员记录
    let member = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id))
        .filter(im_room_member::Column::Uid.eq(uid))
        .filter(im_room_member::Column::LoginUid.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query room member record: {}", e))?;

    if let Some(member) = member {
        debug!("Found room member record: {:?}", member);
        // 如果找到记录，更新 nickname 字段
        let mut member_active = member.into_active_model();
        member_active.my_name = Set(Some(my_name.to_string()));

        member_active
            .update(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to update room member record: {}", e))?;
        info!("Successfully updated member room member information");
        Ok(())
    } else {
        // 如果没有找到记录，返回错误
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "Failed to find specified room member record: room_id={}, uid={}",
            room_id,
            uid
        )))
    }
}
