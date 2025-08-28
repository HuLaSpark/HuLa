use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "im_room")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[serde(default)]
    pub id: String,
    pub room_id: String,
    pub group_id: Option<String>,
    pub room_name: String,
    pub avatar: Option<String>,
    #[serde(skip)]
    #[sea_orm(primary_key)]
    pub login_uid: String,
    pub remark: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
