use crate::AppData;
use crate::repository::im_user_repository;
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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TokenResponse {
    token: Option<String>,
    refresh_token: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserTokenRequest {
    uid: String,
    token: String,
    refresh_token: String,
}

#[tauri::command]
pub async fn save_user_info(
    user_info: SaveUserInfoRequest,
    state: State<'_, AppData>,
) -> Result<(), String> {
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

/// 获取用户的 token 和 refreshToken
#[tauri::command]
pub async fn get_user_tokens(state: State<'_, AppData>) -> Result<TokenResponse, String> {
    info!("Getting user token info");

    let user_info = state.user_info.lock().await;

    let response = TokenResponse {
        token: user_info.token.clone().into(),
        refresh_token: user_info.refresh_token.clone().into(),
    };

    info!("Successfully retrieved user token info: {:?}", response);
    Ok(response)
}

#[tauri::command]
pub async fn remove_tokens(state: State<'_, AppData>) -> Result<(), String> {
    info!("Removing user token info");

    let mut rc = state.rc.lock().await;

    rc.token = None;
    rc.refresh_token = None;

    info!("Successfully removed user token info");
    Ok(())
}

#[tauri::command]
pub async fn update_token(
    req: UpdateUserTokenRequest,
    state: State<'_, AppData>,
) -> Result<(), String> {
    info!("Updating user token");
    {
        let mut user_info = state.user_info.lock().await;
        user_info.uid = req.uid.clone();
        user_info.token = req.token.clone();
        user_info.refresh_token = req.refresh_token.clone();
    }
    {
        let mut rc = state.rc.lock().await;
        rc.token = Some(req.token.clone());
        rc.refresh_token = Some(req.refresh_token.clone());
    }
    im_user_repository::save_user_tokens(
        state.db_conn.deref(),
        &req.uid,
        &req.token,
        &req.refresh_token,
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
