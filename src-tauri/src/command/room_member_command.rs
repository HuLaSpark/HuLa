use crate::error::CommonError;
use crate::repository::im_config_repository::get_token;
use crate::AppData;
use anyhow::Context;
use entity::{im_config, im_room_member};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, Set};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::State;

#[derive(serde::Serialize)]
pub struct PageParam {
    pub current: u32,
    pub size: u32,
}

#[derive(serde::Serialize)]
pub struct LoginParam {
    pub account: String,
    pub password: String,
    pub source: String,
}

#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ApiResult<T> {
    pub success: bool,
    pub code: Option<u16>,
    pub msg: Option<String>,
    pub tid: String,
    pub version: String,
    pub data: T,
}

#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoginResp {
    pub uuid: Option<String>,
    pub token: String,
    pub refresh_token: String,
    pub client: String,
}

#[tauri::command]
pub async fn login(login_param: LoginParam, state: State<'_, AppData>) -> Result<(), CommonError> {
    let client = reqwest::Client::new();
    let resp = client
        .post("http://localhost:9190/token/login")
        .json(&login_param)
        .send()
        .await
        .with_context(|| "请求失败")?
        .json::<ApiResult<LoginResp>>()
        .await
        .with_context(|| "<UNK>")?;

    let token = im_config::ActiveModel {
        id: Default::default(),
        config_key: Set("token".to_string()),
        config_value: Set(Some(resp.data.token)),
    };
    token
        .insert(state.db_conn.deref())
        .await
        .with_context(|| "数据库新增异常")?;

    let refresh_token = im_config::ActiveModel {
        id: Default::default(),
        config_key: Set("refresh_token".to_string()),
        config_value: Set(Some(resp.data.refresh_token)),
    };
    refresh_token
        .insert(state.db_conn.deref())
        .await
        .with_context(|| "数据库新增异常")?;

    Ok(())
}

#[tauri::command]
pub async fn get_room_page(
    page_param: PageParam,
    state: State<'_, AppData>,
) -> Result<(), CommonError> {
    let token = get_token(state.db_conn.deref()).await?;

    let client = reqwest::Client::new();
    let mut request_builder = client
        .get("http://localhost:9190/room/group/list")
        .query(&page_param);
    
    if let Some(token) = token {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", token));
    }
    
    let resp = request_builder
        .send()
        .await
        .with_context(|| "Http 调用异常")?
        .json::<HashMap<String, serde_json::Value>>()
        .await
        .with_context(|| "Json 序列化异常")?;

    println!("{resp:#?}");
    Ok(())
}

#[tauri::command]
pub async fn save_room_member(
    room_member: String,
    room_id: String,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let db = state.db_conn.clone();
    let room_members: Vec<im_room_member::Model> = serde_json::from_str(&room_member).unwrap();

    let uids: Vec<_> = room_members
        .iter()
        .filter(|room_member| room_member.uid.is_some())
        .map(|room_member| room_member.uid.clone().unwrap())
        .collect();

    let exist_data = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(&room_id))
        .filter(im_room_member::Column::Uid.is_in(&uids))
        .all(db.deref())
        .await
        .map_err(|err| err.to_string())?;

    if exist_data.len() > 0 {
        im_room_member::Entity::delete_many()
            .filter(im_room_member::Column::RoomId.eq(&room_id))
            .filter(im_room_member::Column::Uid.is_in(&uids))
            .exec(db.deref())
            .await
            .map_err(|err| err.to_string())?;
    }

    let active_models: Vec<im_room_member::ActiveModel> = room_members
        .into_iter()
        .map(|room_member| {
            let entity = room_member.clone().into_active_model();
            entity
        })
        .collect();

    im_room_member::Entity::insert_many(active_models)
        .exec(db.deref())
        .await
        .map_err(|err| err.to_string())?;

    Ok(())
}

#[tokio::test]
async fn test_01() {
    let login_param = LoginParam {
        account: "Dawn".to_string(),
        password: "123456".to_string(),
        source: "PC".to_string(),
    };
    // login(login_param).await.unwrap();
}
