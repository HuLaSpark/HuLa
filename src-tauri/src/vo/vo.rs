use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyRoomInfoReq {
    pub id: String,
    // 我的群昵称
    pub my_name: String,
    // 群备注
    pub remark: String
}