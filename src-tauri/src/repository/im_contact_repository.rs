use crate::error::CommonError;
use entity::im_contact;
use sea_orm::{DatabaseConnection, EntityTrait, TransactionTrait, IntoActiveModel};
use anyhow::Context;

pub async fn list_contact(
    db: &DatabaseConnection,
) -> Result<Vec<im_contact::Model>, CommonError> {
    let list = im_contact::Entity::find().all(db).await?;
    Ok(list)
}

/// 批量保存会话数据到本地数据库
pub async fn save_contact_batch(
    db: &DatabaseConnection,
    contacts: Vec<im_contact::Model>,
) -> Result<(), CommonError> {
    if contacts.is_empty() {
        return Ok(());
    }

    // 使用事务确保操作的原子性
    let txn = db.begin().await?;

    // 先删除现有的会话数据
    im_contact::Entity::delete_many()
        .exec(&txn)
        .await
        .with_context(|| "删除现有会话数据失败")?;

    // 批量插入新的会话数据
    let active_models: Vec<im_contact::ActiveModel> = contacts
        .into_iter()
        .map(|contact| {
            let active_model = contact.into_active_model();
            active_model
        })
        .collect();

    if !active_models.is_empty() {
        im_contact::Entity::insert_many(active_models)
            .exec(&txn)
            .await
            .with_context(|| "批量插入会话数据失败")?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}