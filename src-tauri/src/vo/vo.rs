use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MyRoomInfoReq {
    pub id: String,
    // 我的群昵称
    pub my_name: String,
    // 群备注
    pub remark: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageReq {
    pub id: String,
    pub room_id: Option<String>,
    pub msg_type: Option<u8>,
    pub body: Option<serde_json::Value>,
    pub skip: Option<bool>,
    pub is_temp: Option<bool>,
    pub is_push_message: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LoginReq {
    pub grant_type: String,
    pub system_type: String,
    pub device_type: String,
    pub account: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LoginResp {
    pub token: String,
    pub client: String,
    pub refresh_token: String,
    pub expire: String,
}
