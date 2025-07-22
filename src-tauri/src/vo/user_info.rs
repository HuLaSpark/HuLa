use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
pub struct UserInfoVO {
    pub uid: String,
    pub account: String,
    pub email: String,
    pub name: String,
    pub avatar: String,
    pub sex: Option<i32>,
    pub user_state_id: Option<String>,
    pub modify_name_chance: Option<u32>,
    pub avatar_update_time: Option<i64>,
    pub context: bool,
    pub num: i32,
    pub update_time: Option<i64>,
    pub create_time: Option<i64>,
    pub token: String,
    pub client: String,
}
