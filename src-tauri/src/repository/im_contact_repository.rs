use crate::error::CommonError;

use entity::im_contact;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    Set, TransactionTrait,
};
use tracing::info;

pub async fn list_contact(
    db: &DatabaseConnection,
    login_uid: &str,
) -> Result<Vec<im_contact::Model>, CommonError> {
    info!("Querying database to get all conversations");
    let list = im_contact::Entity::find()
        .filter(im_contact::Column::LoginUid.eq(login_uid))
        .all(db)
        .await?;
    Ok(list)
}

/// 批量保存会话数据到本地数据库
pub async fn save_contact_batch(
    db: &DatabaseConnection,
    contacts: Vec<im_contact::Model>,
    login_uid: &str,
) -> Result<(), CommonError> {
    if contacts.is_empty() {
        return Ok(());
    }

    // 使用事务确保操作的原子性
    let txn = db.begin().await?;

    // 先删除当前用户的现有会话数据
    im_contact::Entity::delete_many()
        .filter(im_contact::Column::LoginUid.eq(login_uid))
        .exec(&txn)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to delete existing contact data: {}", e))?;

    // 批量插入新的会话数据
    let active_models: Vec<im_contact::ActiveModel> = contacts
        .into_iter()
        .map(|mut contact| {
            contact.login_uid = login_uid.to_string();
            let active_model = contact.into_active_model();
            active_model
        })
        .collect();

    if !active_models.is_empty() {
        im_contact::Entity::insert_many(active_models)
            .exec(&txn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to batch insert contact data: {}", e))?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

/// 更新联系人隐藏状态
pub async fn update_contact_hide(
    db: &DatabaseConnection,
    room_id: &str,
    hide: bool,
    login_uid: &str,
) -> Result<(), CommonError> {
    info!(
        "Updating contact hide status: room_id={}, hide={}, login_uid={}",
        room_id, hide, login_uid
    );

    // 查找对应的联系人记录
    let contact = im_contact::Entity::find()
        .filter(im_contact::Column::RoomId.eq(room_id))
        .filter(im_contact::Column::LoginUid.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to find contact record: {}", e))?;

    if let Some(contact) = contact {
        let mut active_model: im_contact::ActiveModel = contact.into_active_model();
        active_model.hide = Set(Some(hide));

        active_model
            .update(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to update contact hide status: {}", e))?;

        info!("Successfully updated contact hide status");
    }

    Ok(())
}

pub async fn find_contact_by_room(
    db: &DatabaseConnection,
    room_id: &str,
    login_uid: &str,
) -> Result<Option<im_contact::Model>, CommonError> {
    let contact = im_contact::Entity::find()
        .filter(im_contact::Column::RoomId.eq(room_id))
        .filter(im_contact::Column::LoginUid.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query contact by room {}: {}", room_id, e))?;

    Ok(contact)
}
