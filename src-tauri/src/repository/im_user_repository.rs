use crate::error::CommonError;
use entity::im_user;
use entity::prelude::ImUserEntity;
use sea_orm::{ActiveValue::Set, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};
use tracing::{error, info};

/// 更新用户的 is_init 状态
pub async fn update_user_init_status<C>(
    db: &C,
    login_uid: &str,
    is_init: bool,
) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    let user_update = im_user::ActiveModel {
        id: Set(login_uid.to_string()),
        is_init: Set(is_init),
        ..Default::default()
    };

    match ImUserEntity::update(user_update).exec(db).await {
        Ok(_) => {
            info!("User {} is_init status updated to {}", login_uid, is_init);
            Ok(())
        }
        Err(e) => {
            error!("Failed to update user is_init status: {:?}", e);
            Err(e.into())
        }
    }
}

/// 保存或更新用户的 token 信息
pub async fn save_user_tokens<C>(
    db: &C,
    login_uid: &str,
    token: &str,
    refresh_token: &str,
) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    // 检查用户是否已存在
    let existing_user = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| {
            error!("Failed to query user for token update: {:?}", e);
            CommonError::DatabaseError(e)
        })?;

    let user_update = if existing_user.is_some() {
        // 用户存在，更新 token 信息
        im_user::ActiveModel {
            id: Set(login_uid.to_string()),
            token: Set(Some(token.to_string())),
            refresh_token: Set(Some(refresh_token.to_string())),
            ..Default::default()
        }
    } else {
        // 用户不存在，创建新用户并设置 token 信息
        im_user::ActiveModel {
            id: Set(login_uid.to_string()),
            token: Set(Some(token.to_string())),
            refresh_token: Set(Some(refresh_token.to_string())),
            is_init: Set(false), // 新用户默认未初始化
            ..Default::default()
        }
    };

    if existing_user.is_some() {
        // 更新现有用户
        match ImUserEntity::update(user_update).exec(db).await {
            Ok(_) => {
                info!("User {} token info updated successfully", login_uid);
                Ok(())
            }
            Err(e) => {
                error!("Failed to update user token info: {:?}", e);
                Err(e.into())
            }
        }
    } else {
        // 插入新用户
        match ImUserEntity::insert(user_update).exec(db).await {
            Ok(_) => {
                info!("New user {} created with token info", login_uid);
                Ok(())
            }
            Err(e) => {
                error!("Failed to create user with token info: {:?}", e);
                Err(e.into())
            }
        }
    }
}

/// 获取用户的 token 信息
pub async fn get_user_tokens<C>(
    db: &C,
    login_uid: &str,
) -> Result<Option<(String, String)>, CommonError>
where
    C: ConnectionTrait,
{
    let user = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| {
            error!("Failed to query user tokens: {:?}", e);
            CommonError::DatabaseError(e)
        })?;

    match user {
        Some(user) => {
            if let (Some(token), Some(refresh_token)) = (user.token, user.refresh_token) {
                Ok(Some((token, refresh_token)))
            } else {
                Ok(None)
            }
        }
        None => Ok(None),
    }
}
