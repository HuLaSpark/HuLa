use anyhow::Context;
use entity::{im_room, im_room_member};
use sea_orm::{ActiveModelTrait, Set};
use sea_orm::EntityTrait;
use sea_orm::IntoActiveModel;
use sea_orm::PaginatorTrait;
use sea_orm::QuerySelect;
use sea_orm::TransactionTrait;
use sea_orm::{ColumnTrait, DatabaseConnection, NotSet, QueryFilter};

use crate::{
    error::CommonError,
    pojo::common::{Page, PageParam},
};

pub async fn get_room_page(
    page_param: PageParam,
    db: &DatabaseConnection,
) -> Result<Page<im_room::Model>, CommonError> {
    // 计算偏移量
    let offset = (page_param.current - 1) * page_param.size;

    // 查询总数
    let total = im_room::Entity::find()
        .count(db)
        .await
        .with_context(|| "查询房间成员总数失败")?;

    // 分页查询数据
    let records = im_room::Entity::find()
        .offset(offset as u64)
        .limit(page_param.size as u64)
        .all(db)
        .await
        .with_context(|| "分页查询房间成员失败")?;

    Ok(Page {
        records,
        total: total.to_string(),
        size: page_param.size.to_string(),
    })
}

pub async fn save_room_batch(
    db: &DatabaseConnection,
    room_members: Vec<im_room::Model>,
) -> Result<(), CommonError> {
    // 使用事务确保批量操作的原子性
    let txn = db.begin().await?;

    for member in room_members {
        // 转换为 ActiveModel
        let mut member_active = member.into_active_model();
        member_active.id = NotSet;
        // 如果记录不存在，执行插入
        member_active.insert(&txn).await?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

pub async fn get_room_members_by_room_id(
    room_id: &str,
    db: &DatabaseConnection,
) -> Result<Vec<im_room_member::Model>, CommonError> {
    let members = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id))
        .all(db)
        .await
        .with_context(|| "查询房间成员失败")?;

    Ok(members)
}

pub async fn save_room_member_batch(
    db: &DatabaseConnection,
    room_members: Vec<im_room_member::Model>,
    room_id: i64,
) -> Result<(), CommonError> {
    // 使用事务确保操作的原子性
    let txn = db.begin().await?;

    // 根据room_id查询现有数据
    let existing_members = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id.to_string()))
        .all(&txn)
        .await
        .with_context(|| "查询房间成员失败")?;

    if !existing_members.is_empty() {
        // 如果有数据，则删除现有数据
        im_room_member::Entity::delete_many()
            .filter(im_room_member::Column::RoomId.eq(room_id.to_string()))
            .exec(&txn)
            .await
            .with_context(|| "删除房间成员失败")?;
    }

    // 保存新的room_members数据
    for member in room_members {
        let mut member_active = member.into_active_model();
        member_active.room_id = Set(Some(room_id.to_string()));
        im_room_member::Entity::insert(member_active).exec(&txn).await?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

pub async fn update_my_room_info(db: &DatabaseConnection, my_name: &str, room_id: &str, uid: &str) -> Result<(), CommonError> {
    // 根据 room_id 和 uid 查找房间成员记录
    let member = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(room_id))
        .filter(im_room_member::Column::Uid.eq(uid))
        .one(db)
        .await
        .with_context(|| "查询房间成员失败")?;

    if let Some(member) = member {
        println!("找到房间成员记录: {:?}", member);
        // 如果找到记录，更新 nickname 字段
        let mut member_active = member.into_active_model();
        member_active.my_name = Set(Some(my_name.to_string()));
        
        member_active
            .update(db)
            .await
            .with_context(|| "更新房间成员昵称失败")?;
        println!("更新成员房间成员信息成功");
        Ok(())
    } else {
        // 如果没有找到记录，返回错误
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "未找到指定的房间成员记录: room_id={}, uid={}", room_id, uid
        )))
    }
}
