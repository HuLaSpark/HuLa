use crate::AppData;
use chrono::Local;
use entity::im_user;
use entity::prelude::ImUserEntity;
use sea_orm::ActiveValue::Set;
use sea_orm::ColumnTrait;
use sea_orm::EntityTrait;
use sea_orm::IntoActiveModel;
use sea_orm::QueryFilter;
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use tauri::State;
use tracing::{debug, info};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SaveUserInfoRequest {
    uid: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTokenRequest {
    token: String,
    refresh_token: String,
}

#[tauri::command]
pub async fn save_user_info(user_info: SaveUserInfoRequest, state: State<'_, AppData>) -> Result<(), String> {
    let db = state.db_conn.clone();

    // 检查用户是否存在
    let exists = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(&user_info.uid))
        .one(db.deref())
        .await
        .map_err(|err| format!("Failed to query user: {}", err))?;

    if exists.is_none() {
        info!("User does not exist, preparing to insert new user");

        let user = im_user::ActiveModel {
            id: Set(user_info.uid.clone()),
            // TODO 这里先设置为 true，后续需要根据配置调整
            is_init: Set(true),
            ..Default::default()
        };

        im_user::Entity::insert(user)
            .exec(db.deref())
            .await
            .map_err(|err| format!("Failed to insert user: {}", err))?;
    } else {
        debug!("User already exists, no need to insert");
    }
    Ok(())
}

#[tauri::command]
pub async fn update_token(token_info: UpdateTokenRequest, state: State<'_, AppData>) -> Result<(), String> {
    info!("Updating token in im_request_client");
    
    let request_client = state.request_client.clone();
    
    // 获取 ImRequestClient 的锁并更新 token
    let client = request_client.lock().await;
    
    // 更新 token
    if let Ok(mut token_guard) = client.token.try_lock() {
        *token_guard = Some(token_info.token.clone());
        info!("Token updated successfully");
    } else {
        return Err("Failed to acquire token lock".to_string());
    }
    
    // 更新 refresh_token
    if let Ok(mut refresh_token_guard) = client.refresh_token.try_lock() {
        *refresh_token_guard = Some(token_info.refresh_token.clone());
        info!("Refresh token updated successfully");
    } else {
        return Err("Failed to acquire refresh_token lock".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn update_user_last_opt_time(state: State<'_, AppData>) -> Result<(), String> {
    info!("Updating user last operation time");
    let db = state.db_conn.clone();

    let uid = state.user_info.lock().await.uid.clone();

    // 检查用户是否存在
    let user = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(uid.clone()))
        .one(db.deref())
        .await
        .map_err(|err| format!("Failed to query user: {}", err))?;

    if let Some(user) = user {
        let mut active_model = user.into_active_model();
        active_model.last_opt_time = Set(Some(Local::now().timestamp_millis()));

        ImUserEntity::update(active_model)
            .exec(db.deref())
            .await
            .map_err(|err| format!("Failed to update user last operation time: {}", err))?;
    }

    Ok(())
}
