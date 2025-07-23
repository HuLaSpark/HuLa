use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "im_message_mark")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    #[serde(skip)]
    #[sea_orm(primary_key)]
    pub login_uid: String,
    pub uid: String,
    pub msg_id: String,
    #[serde(rename = "type")]
    pub mark_type: i32,
    pub status: u8,
    pub create_time: Option<i64>,
    pub update_time: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
