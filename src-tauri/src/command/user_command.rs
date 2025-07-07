use crate::vo::user_info::UserInfoVO;
use crate::{AppData};
use chrono::DateTime;
use entity::prelude::ImUserEntity;
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, ModelTrait, QueryFilter};
use std::ops::Deref;
use tauri::State;
use entity::im_user;

#[tauri::command]
pub async fn save_user_info(user_info: String, state: State<'_, AppData>) -> Result<(), String> {
    let db = state.db_conn.clone();
    let user_info: UserInfoVO = serde_json::from_str(&user_info).unwrap();

    let user = im_user::ActiveModel {
        user_id: Set(Some(user_info.uid.parse::<i64>().unwrap())),
        name: Set(Some(user_info.name)),
        avatar: Set(Some(user_info.avatar)),
        sex: Set(user_info.sex),
        user_state_id: Set(user_info.user_state_id.map(|id| id.parse::<i64>().unwrap())),
        avatar_update_time: Set(user_info
            .avatar_update_time
            .map(|time| DateTime::from_timestamp_millis(time).unwrap().naive_local())),
        context: Set(user_info.context),
        num: Set(user_info.num),
        update_time: Set(user_info
            .update_time
            .map(|time| DateTime::from_timestamp_millis(time).unwrap().naive_local())),
        create_time: Set(user_info
            .create_time
            .map(|time| DateTime::from_timestamp_millis(time).unwrap().naive_local())),
        ..Default::default()
    };

    match ImUserEntity::find().filter(im_user::Column::UserId.eq(user_info.uid)).one(db.deref()).await.map_err(|err| err.to_string())? {
        None => {
            user.insert(db.deref()).await.map_err(|err| err.to_string())?;
        }
        Some(data) => {
            data.delete(db.deref()).await.map_err(|err| err.to_string())?;
            user.insert(db.deref()).await.map_err(|err| err.to_string())?;
            return Ok(());
        }
    };
    Ok(())
}
