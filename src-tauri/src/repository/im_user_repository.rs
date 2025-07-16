use crate::error::CommonError;
use entity::{im_user};
use entity::prelude::ImUserEntity;
use sea_orm::{EntityTrait, ActiveValue::Set, ConnectionTrait};
use log::{error, info};

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
            info!("用户 {} 的 is_init 状态已更新为 {}", login_uid, is_init);
            Ok(())
        }
        Err(e) => {
            error!("更新用户 is_init 状态失败: {:?}", e);
            Err(e.into())
        }
    }
}