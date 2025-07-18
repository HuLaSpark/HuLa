use crate::AppData;
use entity::im_user;
use entity::prelude::ImUserEntity;
use log::{debug, info};
use sea_orm::ActiveValue::Set;
use sea_orm::ColumnTrait;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    uid: String,
}

#[tauri::command]
pub async fn save_user_info(user_info: UserInfo, state: State<'_, AppData>) -> Result<(), String> {
    let db = state.db_conn.clone();

    // 检查用户是否存在
    let exists = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(&user_info.uid))
        .one(db.deref())
        .await
        .map_err(|err| format!("查询用户失败: {}", err))?;

    if exists.is_none() {
        info!("用户不存在，准备插入新用户");

        let user = im_user::ActiveModel {
            id: Set(user_info.uid.clone()),
            // TODO 这里先设置为 true，后续需要根据配置调整
            is_init: Set(true),
            ..Default::default()
        };

        im_user::Entity::insert(user)
            .exec(db.deref())
            .await
            .map_err(|err| format!("插入用户失败: {}", err))?;
    } else {
        debug!("用户已存在，无需插入");
    }
    Ok(())
}
