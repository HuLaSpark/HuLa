use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "im_room_member")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[serde(default)]
    pub id: String,
    pub room_id: Option<String>,
    pub uid: Option<String>,
    pub account: Option<String>,
    pub my_name: Option<String>,
    pub active_status: Option<u8>,
    pub group_role: Option<i64>,
    pub loc_place: Option<String>,
    pub last_opt_time: i64,
    pub create_time: Option<i64>,
    pub name: String,
    pub avatar: Option<String>,
    pub user_state_id: Option<String>,
    #[serde(skip)]
    #[sea_orm(primary_key)]
    pub login_uid: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
