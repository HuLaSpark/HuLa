use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PageParam {
    pub current: u32,
    pub size: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CursorPageParam {
    pub page_size: u32,
    pub cursor: String,
    pub create_id: Option<String>,
    pub create_time: Option<i64>,
    pub update_time: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CursorPageResp<T> {
    pub cursor: String,
    pub is_last: bool,
    pub list: Option<T>,
    pub total: u64,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoginParam {
    pub account: String,
    pub password: String,
    pub source: String,
}

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResult<T> {
    pub success: bool,
    pub code: Option<i32>,
    pub msg: Option<String>,
    pub version: String,
    pub data: Option<T>,
}

#[derive(serde::Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub records: Vec<T>,
    pub total: String,
    pub size: String,
}

#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoginResp {
    pub uuid: Option<String>,
    pub token: String,
    pub refresh_token: String,
    pub client: String,
}
