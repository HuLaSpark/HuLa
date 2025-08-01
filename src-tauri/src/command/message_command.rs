use crate::AppData;
use crate::error::CommonError;
use crate::im_reqest_client::ImRequestClient;
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::{im_message_repository, im_user_repository};
use crate::vo::vo::ChatMessageReq;
use anyhow::Context;
use entity::im_user::Entity as ImUserEntity;
use entity::{im_message, im_user};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use sea_orm::{DatabaseConnection, TransactionTrait};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::{State, ipc::Channel};
use tracing::{debug, error, info};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageResp {
    pub create_id: Option<String>,
    pub create_time: Option<i64>,
    pub update_id: Option<String>,
    pub update_time: Option<i64>,
    pub from_user: FromUser,
    pub message: Message,
    pub old_msg_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FromUser {
    pub uid: String,
    pub nickname: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: Option<String>,
    pub room_id: Option<String>,
    #[serde(rename = "type")]
    pub message_type: Option<u8>,
    pub body: Option<serde_json::Value>,
    pub message_marks: Option<HashMap<String, MessageMark>>,
    pub send_time: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UrlInfo {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MergeMessage {
    pub content: Option<String>,
    pub created_time: Option<i64>,
    pub name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplyMsg {
    pub id: Option<String>,
    pub uid: Option<String>,
    pub username: Option<String>,
    #[serde(rename = "type")]
    pub msg_type: Option<u8>,
    pub body: Option<Box<serde_json::Value>>,
    pub can_callback: u8,
    pub gap_count: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageMark {
    pub count: u32,
    pub user_marked: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CursorPageMessageParam {
    room_id: String,
    #[serde(flatten)]
    cursor_page_param: CursorPageParam,
}

#[tauri::command]
pub async fn page_msg(
    param: CursorPageMessageParam,
    state: State<'_, AppData>,
) -> Result<CursorPageResp<Vec<MessageResp>>, String> {
    // 获取当前登录用户的 uid
    let login_uid = {
        let user_info = state.user_info.lock().await;
        user_info.uid.clone()
    };

    // 从数据库查询消息
    let db_result = im_message_repository::cursor_page_messages(
        state.db_conn.deref(),
        param.room_id,
        param.cursor_page_param,
        &login_uid,
    )
    .await
    .map_err(|e| e.to_string())?;

    // 转换数据库模型为响应模型
    let message_resps: Vec<MessageResp> = db_result
        .list
        .unwrap_or_default()
        .into_iter()
        .map(|(msg, marks)| convert_message_to_resp(msg, marks))
        .rev()
        .collect();

    Ok(CursorPageResp {
        cursor: db_result.cursor,
        is_last: db_result.is_last,
        list: Some(message_resps),
        total: db_result.total,
    })
}

/// 将数据库消息模型转换为响应模型
fn convert_message_to_resp(
    msg: im_message::Model,
    marks: Vec<entity::im_message_mark::Model>,
) -> MessageResp {
    // 解析消息体
    let body = msg.body.as_ref().and_then(|b| serde_json::from_str(b).ok());

    // 将数据库中的消息标记转换为 HashMap
    let mut message_marks: HashMap<String, MessageMark> = HashMap::new();

    // 按标记类型分组统计
    let mut mark_stats: HashMap<String, (u32, bool)> = HashMap::new();
    let current_login_uid = &msg.login_uid;

    for mark in marks {
        let (count, user_marked) = mark_stats
            .entry(mark.mark_type.to_string())
            .or_insert((0, false));
        if mark.status == 0 {
            // 假设 status=1 表示有效标记
            *count += 1;
            if mark.uid == *current_login_uid {
                *user_marked = true;
            }
        }
    }

    // 转换为最终的 MessageMark 格式
    for (mark_type, (count, user_marked)) in mark_stats {
        let mark_key = format!("{}", mark_type);
        message_marks.insert(mark_key, MessageMark { count, user_marked });
    }

    // 如果没有从关联表获取到标记，尝试从原有的 message_marks 字段解析
    if message_marks.is_empty() {
        if let Some(marks_str) = &msg.message_marks {
            if let Ok(parsed_marks) =
                serde_json::from_str::<HashMap<String, MessageMark>>(marks_str)
            {
                message_marks = parsed_marks;
            }
        }
    }

    let final_message_marks = if message_marks.is_empty() {
        None
    } else {
        Some(message_marks)
    };

    MessageResp {
        create_id: Some(msg.id.clone()),
        create_time: msg.send_time,
        update_id: None,
        update_time: None,
        from_user: FromUser {
            uid: msg.uid,
            nickname: msg.nickname,
        },
        message: Message {
            id: Some(msg.id),
            room_id: Some(msg.room_id),
            message_type: msg.message_type,
            body,
            message_marks: final_message_marks,
            send_time: msg.send_time,
        },
        old_msg_id: None,
    }
}

/// 检查用户初始化状态并获取消息
pub async fn check_user_init_and_fetch_messages(
    client: &ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
) -> Result<(), CommonError> {
    debug!("Checking user initialization status and fetching messages, uid: {}", uid);
    // 检查用户的 is_init 状态
    if let Ok(user) = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(uid))
        .one(db_conn)
        .await
    {
        if let Some(user_model) = user {
            // 如果 is_init 为 true，调用后端接口获取所有消息
            if user_model.is_init {
                info!("User {} needs initialization, starting to fetch all messages", uid);
                // 传递用户的 last_opt_time 参数
                if let Err(e) = fetch_all_messages(client, db_conn, uid, None).await {
                    error!("Failed to fetch all messages: {}", e);
                    return Err(e);
                }
            } else {
                info!(
                    "User {} offline message update, last_opt_time: {:?}",
                    uid, user_model.last_opt_time
                );
                if let Err(e) =
                    fetch_all_messages(client, db_conn, uid, user_model.last_opt_time).await
                {
                    error!("Failed to update offline messages: {}", e);
                    return Err(e);
                }
            }
        }
    }
    Ok(())
}

/// 从后端获取所有消息并保存到数据库
pub async fn fetch_all_messages(
    client: &ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
    last_opt_time: Option<i64>,
) -> Result<(), CommonError> {
    info!(
        "Starting to fetch all messages, uid: {}, last_opt_time: {:?}",
        uid, last_opt_time
    );
    // 调用后端接口 /chat/msg/list 获取所有消息，传递 last_opt_time 参数
    let mut request = client.get("/im/chat/msg/list");

    // 如果有 last_opt_time 参数，添加到查询参数中
    if let Some(time) = last_opt_time {
        request = request.query(&[("lastOptTime", time.to_string())]);
    }

    let messages = request.send_json::<Vec<MessageResp>>().await?;

    if let Some(messages) = messages.data {
        // 开启事务
        let tx = db_conn.begin().await?;

        // 转换 MessageResp 为 im_message::Model
        let db_messages: Vec<im_message::Model> = messages
            .into_iter()
            .map(|msg_resp| convert_resp_to_model_for_fetch(msg_resp, uid.to_string()))
            .collect();
        // 保存到本地数据库
        match im_message_repository::save_all(&tx, db_messages).await {
            Ok(_) => {
                info!("Messages saved to database successfully");
            }
            Err(e) => {
                error!("Failed to save messages to database, detailed error: {:?}", e);
                return Err(e.into());
            }
        }

        // 消息保存完成后，将用户的 is_init 状态设置为 false
        im_user_repository::update_user_init_status(&tx, uid, false)
            .await
            .with_context(|| "Failed to update user is_init status")?;

        // 提交事务
        tx.commit().await?;
    }

    Ok(())
}

/// 将 MessageResp 转换为数据库模型（用于 fetch_all_messages）
fn convert_resp_to_model_for_fetch(msg_resp: MessageResp, uid: String) -> im_message::Model {
    use serde_json;

    // 序列化消息体为 JSON 字符串
    let body_json = msg_resp
        .message
        .body
        .as_ref()
        .and_then(|body| serde_json::to_string(body).ok());

    // 序列化消息标记为 JSON 字符串
    let marks_json = msg_resp
        .message
        .message_marks
        .as_ref()
        .and_then(|marks| serde_json::to_string(marks).ok());

    im_message::Model {
        id: msg_resp.message.id.unwrap_or_default(),
        uid: msg_resp.from_user.uid,
        nickname: msg_resp.from_user.nickname,
        room_id: msg_resp.message.room_id.unwrap_or_default(),
        message_type: msg_resp.message.message_type,
        body: body_json,
        message_marks: marks_json,
        send_time: msg_resp.message.send_time,
        create_time: msg_resp.create_time,
        update_time: msg_resp.update_time,
        login_uid: uid.to_string(), // 这里暂时设为空字符串，实际使用时会在 save_all 中设置
        send_status: "success".to_string(), // 从后端获取的消息默认为成功状态
    }
}

#[tauri::command]
pub async fn send_msg(
    data: ChatMessageReq,
    state: State<'_, AppData>,
    success_channel: Channel<MessageResp>,
    error_channel: Channel<String>,
) -> Result<(), String> {
    use std::ops::Deref;

    // 获取当前登录用户信息
    let (login_uid, nickname) = {
        let user_info = state.user_info.lock().await;
        (user_info.uid.clone(), None) // UserInfo只有uid和token字段，nickname暂时设为None
    };

    // 生成消息ID
    let current_time = chrono::Utc::now().timestamp_millis();

    // 先克隆data以避免所有权问题
    let send_data = data.clone();

    // 序列化消息体
    let body_json = data
        .body
        .as_ref()
        .and_then(|body| serde_json::to_string(body).ok());

    // 创建消息模型
    let message = im_message::Model {
        id: data.id.clone(),
        uid: login_uid.clone(),
        nickname,
        room_id: data.room_id.unwrap_or_default(),
        message_type: data.msg_type,
        body: body_json,
        message_marks: None,
        send_time: Some(current_time),
        create_time: Some(current_time),
        update_time: Some(current_time),
        login_uid: login_uid.clone(),
        send_status: "pending".to_string(), // 初始状态为pending
    };

    let tx = state
        .db_conn
        .begin()
        .await
        .map_err(|e| CommonError::DatabaseError(e))?;
    // 先保存到本地数据库
    if let Err(e) = im_message_repository::save_message(&tx, message.clone()).await {
        error!("Failed to save message to database: {}", e);
        return Err(e.to_string());
    }
    tx.commit()
        .await
        .map_err(|e| CommonError::DatabaseError(e))?;

    info!("Message saved to local database, ID: {}", message.id.clone());

    // 异步发送到后端接口
    let db_conn = state.db_conn.clone();
    let request_client = state.request_client.clone();
    let msg_id = message.id.clone();

    tokio::spawn(async move {
        // 发送到后端接口
        let result = {
            let client = request_client.lock().await;
            client
                .post("/im/chat/msg")
                .json(&send_data)
                .send_json::<MessageResp>()
                .await
        };

        let mut id = None;

        // 根据发送结果更新消息状态
        let status = match result {
            Ok(resp) => {
                let mut result = match resp.data.clone() {
                    Some(data) => data,
                    None => {
                        error!("Response data is None");
                        return;
                    }
                };
                result.old_msg_id = Some(msg_id.clone());
                id = result.message.id.clone();
                // 尝试克隆数据以避免所有权问题
                let event_data = result.clone();
                success_channel.send(event_data).unwrap();
                "success"
            }
            Err(_e) => {
                error_channel.send(msg_id.clone()).unwrap();
                "fail"
            }
        };

        // 更新消息状态
        if let Err(e) = im_message_repository::update_message_status(
            db_conn.deref(),
            &msg_id,
            status,
            id,
            login_uid.clone(),
        )
        .await
        {
            error!("Failed to update message status: {}", e);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn save_msg(data: MessageResp, state: State<'_, AppData>) -> Result<(), String> {
    // 创建 im_message::Model
    let message = convert_resp_to_model_for_fetch(data, state.user_info.lock().await.uid.clone());

    async {
        let tx = state.db_conn.clone().begin().await?;
        // 保存到数据库
        im_message_repository::save_message(&tx, message).await?;
        tx.commit().await?;
        Ok::<(), CommonError>(())
    }
    .await?;

    Ok(())
}
