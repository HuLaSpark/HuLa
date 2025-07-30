use crate::AppData;
use crate::error::CommonError;
use crate::repository::im_message_mark_repository;
use entity::im_message_mark;
use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{error, info};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageMarkReq {
    msg_id: String,
    mark_type: i32,
    act_type: u8,
}

#[tauri::command]
pub async fn save_message_mark(
    data: ChatMessageMarkReq,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let result: Result<(), CommonError> = async {
        // 获取当前登录用户的 uid
        let login_uid = {
            let user_info = state.user_info.lock().await;
            user_info.uid.clone()
        };

        // 生成消息标记ID
        let current_time = chrono::Utc::now().timestamp_millis();
        let mark_id = format!("{}_{}_{}", data.msg_id, data.mark_type, current_time);

        // 创建消息标记模型
        let message_mark = im_message_mark::Model {
            id: mark_id,
            login_uid: login_uid.clone(),
            uid: login_uid, // 当前用户的uid
            msg_id: data.msg_id.clone(),
            mark_type: data.mark_type,
            status: match data.act_type {
                1 => 0,
                2 => 1,
                _ => 0,
            },
            create_time: Some(current_time),
            update_time: Some(current_time),
        };

        // 开启事务保存到数据库
        let tx = state.db_conn.begin().await?;
        im_message_mark_repository::save_msg_mark(&tx, message_mark).await?;
        tx.commit().await?;

        info!(
            "消息标记保存成功，消息ID: {}, 标记类型: {}",
            &data.msg_id, data.mark_type
        );
        Ok(())
    }
    .await;

    match result {
        Ok(()) => Ok(()),
        Err(e) => {
            error!("保存消息标记失败: {:?}", e);
            Err(e.to_string())
        }
    }
}
