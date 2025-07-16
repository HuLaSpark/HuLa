use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "im_message")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub uid: String,
    pub nickname: Option<String>,
    pub room_id: String,
    pub send_time: Option<i64>,
    #[serde(rename = "type")]
    pub message_type: Option<u8>,
    pub body: Option<String>,
    pub message_marks: Option<String>,
    pub create_time: Option<i64>,
    pub update_time: Option<i64>,
    #[serde(skip)]
    pub login_uid: String,
    /// 消息发送状态: pending, success, fail
    pub send_status: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
