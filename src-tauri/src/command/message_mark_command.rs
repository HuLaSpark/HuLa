use std::collections::HashMap;
use std::collections::hash_map::Entry;

use crate::error::CommonError;
use crate::{AppData, command::message_command::MessageMark};
use entity::im_message;
use sea_orm::{EntityTrait, IntoActiveModel, Set, TransactionTrait};
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{error, info};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageMarkReq {
    msg_id: String,
    mark_type: i32,
    act_type: u8,
    uid: String,
    mark_count: u32,
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

        let message = im_message::Entity::find_by_id((data.msg_id.clone(), login_uid.clone()))
            .one(state.db_conn.as_ref())
            .await?;

        if let Some(message) = message {
            let message_marks = message.message_marks.clone();
            if let Some(message_marks) = message_marks {
                let mut message_marks: HashMap<String, MessageMark> =
                    serde_json::from_str::<HashMap<String, MessageMark>>(&message_marks)
                        .map_err(|e| anyhow::anyhow!("Failed to parse message marks: {}", e))?;
                match message_marks.entry(data.mark_type.to_string()) {
                    Entry::Occupied(entry) => {
                        let message_mark = entry.into_mut();
                        message_mark.count = data.mark_count;
                        if data.uid == message.login_uid {
                            message_mark.user_marked = true
                        }
                    }
                    Entry::Vacant(_) => {}
                }

                let new_message_marks = serde_json::to_string(&message_marks)
                    .map_err(|e| anyhow::anyhow!("Failed to serialize message marks: {}", e))?;

                // 创建ActiveModel，只设置需要更新的字段
                let mut active_message = message.into_active_model();
                active_message.message_marks = Set(Some(new_message_marks));

                // 更新数据库
                im_message::Entity::update(active_message)
                    .exec(state.db_conn.as_ref())
                    .await?;
            }
        }

        // 开启事务保存到数据库
        let tx = state.db_conn.begin().await?;
        // im_message_mark_repository::save_msg_mark(&tx, message_mark).await?;
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
            error!("Failed to save message mark: {:?}", e);
            Err(e.to_string())
        }
    }
}
