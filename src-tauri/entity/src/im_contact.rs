use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "im_contact")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub detail_id: String,
    pub room_id: String,
    #[serde(rename = "type")]
    pub contact_type: Option<u8>,
    pub hot_flag: Option<u8>,
    pub top: Option<bool>,
    pub account: Option<String>,
    pub operate: Option<u8>,
    pub remark: Option<String>,
    pub my_name: Option<String>,
    // "通知类型 0 -> 允许接受消息 1 -> 接收但不提醒[免打扰] 4 -> 已退出群聊"
    pub mute_notification: Option<u8>,
    // 删除会话
    pub hide: Option<bool>,
    pub active_time: Option<i64>,
    // true->屏蔽 false -> 正常
    pub shield: Option<bool>,
    pub avatar: Option<String>,
    #[serde(rename = "name")]
    pub contact_name: Option<String>,
    pub text: Option<String>,
    pub unread_count: Option<u8>,
    pub create_time: Option<i64>,
    pub update_time: Option<i64>,
    #[serde(skip)]
    #[sea_orm(primary_key)]
    pub login_uid: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
