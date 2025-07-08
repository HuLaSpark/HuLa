use anyhow::Context;
use entity::{im_room, im_room_member};
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::IntoActiveModel;
use sea_orm::PaginatorTrait;
use sea_orm::QueryFilter;
use sea_orm::QuerySelect;
use sea_orm::TransactionTrait;
use sea_orm::ActiveModelTrait;
use sea_orm::ColumnTrait;
use sea_orm::Set;

use crate::{error::CommonError, pojo::common::{Page, PageParam}};

pub async fn page_room(
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
        // 如果记录不存在，执行插入
        member_active.insert(&txn).await?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}
