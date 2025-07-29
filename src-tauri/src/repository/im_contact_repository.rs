use crate::error::CommonError;
use anyhow::Context;
use entity::im_contact;
use log::info;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    Set, TransactionTrait,
};

pub async fn list_contact(
    db: &DatabaseConnection,
    login_uid: &str,
) -> Result<Vec<im_contact::Model>, CommonError> {
    info!("查询数据库获取所有会话");
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
        .with_context(|| "删除现有会话数据失败")?;

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
            .with_context(|| "批量插入会话数据失败")?;
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
        "更新联系人隐藏状态: room_id={}, hide={}, login_uid={}",
        room_id, hide, login_uid
    );

    // 查找对应的联系人记录
    let contact = im_contact::Entity::find()
        .filter(im_contact::Column::RoomId.eq(room_id))
        .filter(im_contact::Column::LoginUid.eq(login_uid))
        .one(db)
        .await
        .with_context(|| "查找联系人记录失败")?;

    if let Some(contact) = contact {
        let mut active_model: im_contact::ActiveModel = contact.into_active_model();
        active_model.hide = Set(Some(hide));

        active_model
            .update(db)
            .await
            .with_context(|| "更新联系人隐藏状态失败")?;

        info!("成功更新联系人隐藏状态");
        Ok(())
    } else {
        Err(CommonError::UnexpectedError(anyhow::anyhow!(
            "未找到对应的联系人记录"
        )))
    }
}
