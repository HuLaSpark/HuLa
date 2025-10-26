use crate::AppData;
use crate::error::CommonError;
use crate::im_request_client::{ImRequestClient, ImUrl};
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::{im_contact_repository, im_message_repository, im_user_repository};
use crate::vo::vo::ChatMessageReq;

use entity::im_user::Entity as ImUserEntity;
use entity::{im_contact, im_message, im_user};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use sea_orm::{DatabaseConnection, TransactionTrait};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::{async_runtime, State, ipc::Channel};
use tracing::{debug, error, info};
use chrono::{Datelike, Local, TimeZone, Weekday};

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
    pub time_block: Option<i64>,
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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SwitchRoomParam {
    pub room_id: String,
    #[serde(default)]
    pub limit: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub room_id: String,
    pub unread_count: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_msg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_msg_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_msg_timestamp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_msg_id: Option<String>,
    pub is_at_me: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SwitchRoomResp {
    pub cursor: String,
    pub is_last: bool,
    pub total: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ordered: Option<bool>,
    pub messages: Vec<MessageResp>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_snapshot: Option<SessionSnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub member_snippet: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub announcement: Option<serde_json::Value>,
}

const AT_PREFIX_HTML: &str = "<span class=\"text-#d5304f mr-4px\">[有人@我]</span>";

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

    let room_id = param.room_id.clone();
    let cursor_param = param.cursor_page_param.clone();
    let db_conn = state.db_conn.clone();
    let login_uid_clone = login_uid.clone();

    let db_result = async_runtime::spawn_blocking(move || {
        async_runtime::block_on(async move {
            im_message_repository::cursor_page_messages(
                db_conn.deref(),
                room_id,
                cursor_param,
                &login_uid_clone,
            )
            .await
        })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    let message_resps: Vec<MessageResp> = db_result
        .list
        .unwrap_or_default()
        .into_iter()
        .map(|msg| convert_message_to_resp(msg, None))
        .rev()
        .collect();

    Ok(CursorPageResp {
        cursor: db_result.cursor,
        is_last: db_result.is_last,
        list: Some(message_resps),
        total: db_result.total,
        ordered: Some(true),
    })
}

/// 将数据库消息模型转换为响应模型
pub fn convert_message_to_resp(msg: im_message::Model, old_msg_id: Option<String>) -> MessageResp {
    // 解析消息体 - 安全地处理 JSON 解析
    let body = msg.body.as_ref().and_then(|body_str| {
        if body_str.trim().is_empty() {
            None
        } else {
            match serde_json::from_str(body_str) {
                Ok(parsed) => Some(parsed),
                Err(e) => {
                    debug!(
                        "Failed to parse message body JSON for message {}: {}",
                        msg.id, e
                    );
                    // 如果解析失败，将原始字符串作为文本消息处理
                    Some(serde_json::json!({
                        "content": body_str
                    }))
                }
            }
        }
    });

    // 解析消息标记 - 支持从 message_marks 字段解析
    let message_marks = msg.message_marks.as_ref().and_then(|marks_str| {
        if marks_str.trim().is_empty() {
            return None;
        }

        match serde_json::from_str::<HashMap<String, MessageMark>>(marks_str) {
            Ok(parsed_marks) => {
                if parsed_marks.is_empty() {
                    None
                } else {
                    Some(parsed_marks)
                }
            }
            Err(e) => {
                debug!(
                    "Failed to parse message marks JSON for message {}: {}",
                    msg.id, e
                );
                None
            }
        }
    });

    // 构建响应对象
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
            message_marks,
            send_time: msg.send_time,
        },
        old_msg_id: old_msg_id,
        time_block: msg.time_block,
    }
}

fn build_session_snapshot(
    room_id: &str,
    messages: &[MessageResp],
    contact: Option<im_contact::Model>,
    login_uid: &str,
) -> Option<SessionSnapshot> {
    let unread_count = contact
        .as_ref()
        .and_then(|c| c.unread_count)
        .unwrap_or(0);

    let is_group = contact
        .as_ref()
        .and_then(|c| c.contact_type)
        .map(|ty| ty == 1)
        .unwrap_or(false);

    let last_message = messages.last();
    let mut last_msg_text = last_message
        .map(|msg| format_last_message(msg, is_group, login_uid))
        .unwrap_or_default();

    if last_msg_text.is_empty() {
        if let Some(contact) = contact.as_ref() {
            if let Some(text) = &contact.text {
                last_msg_text = text.clone();
            }
        }
    }

    let is_at_me = compute_is_at_me(messages, login_uid, unread_count, is_group);
    if is_at_me && !last_msg_text.is_empty() {
        last_msg_text = format!("{AT_PREFIX_HTML}{last_msg_text}");
    }

    let last_msg_timestamp = last_message.and_then(|msg| msg.message.send_time);
    let display_timestamp = last_msg_timestamp
        .or_else(|| contact.as_ref().and_then(|c| c.active_time));

    Some(SessionSnapshot {
        room_id: room_id.to_string(),
        unread_count,
        last_msg: if last_msg_text.is_empty() {
            None
        } else {
            Some(last_msg_text)
        },
        last_msg_time: display_timestamp.map(format_snapshot_time),
        last_msg_timestamp,
        last_msg_id: last_message.and_then(|msg| msg.message.id.clone()),
        is_at_me,
    })
}

fn compute_is_at_me(
    messages: &[MessageResp],
    login_uid: &str,
    unread_count: u32,
    is_group: bool,
) -> bool {
    if !is_group || unread_count == 0 || messages.is_empty() {
        return false;
    }

    let len = messages.len();
    let start = len.saturating_sub(unread_count as usize);
    messages[start..].iter().any(|msg| message_mentions_user(msg, login_uid))
}

fn message_mentions_user(msg: &MessageResp, login_uid: &str) -> bool {
    let body = match msg.message.body.as_ref() {
        Some(value) => value,
        None => return false,
    };

    let at_list = body
        .as_object()
        .and_then(|map| map.get("atUidList"))
        .and_then(|value| value.as_array());

    match at_list {
        Some(list) => list.iter().any(|item| match item {
            serde_json::Value::String(s) => s == login_uid,
            serde_json::Value::Number(num) => num
                .as_i64()
                .map(|n| n.to_string() == login_uid)
                .unwrap_or(false),
            _ => false,
        }),
        None => false,
    }
}

fn format_last_message(msg: &MessageResp, is_group: bool, login_uid: &str) -> String {
    let message_type = msg.message.message_type.unwrap_or(0);

    if message_type == 2 {
        return format_recall_message(msg, is_group, login_uid);
    }

    let sender_name = msg.from_user.nickname.clone().unwrap_or_default();
    let content = if message_type == 1 {
        msg.message
            .body
            .as_ref()
            .and_then(extract_message_content)
            .unwrap_or_default()
    } else {
        format_placeholder_for_type(message_type).to_string()
    };

    if content.is_empty() {
        return content;
    }

    if is_group && !sender_name.is_empty() {
        format!("{sender_name}:{content}")
    } else {
        content
    }
}

fn format_recall_message(msg: &MessageResp, is_group: bool, login_uid: &str) -> String {
    if msg.from_user.uid == login_uid {
        "你撤回了一条消息".to_string()
    } else if is_group {
        let name = msg
            .from_user
            .nickname
            .clone()
            .unwrap_or_else(|| "有人".to_string());
        format!("{name}:撤回了一条消息")
    } else {
        "对方撤回了一条消息".to_string()
    }
}

fn extract_message_content(body: &serde_json::Value) -> Option<String> {
    if let Some(text) = body.as_str() {
        return Some(text.to_string());
    }

    if let Some(obj) = body.as_object() {
        for key in ["content", "text", "summary", "title"] {
            if let Some(value) = obj.get(key).and_then(|item| item.as_str()) {
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
        }
    }

    None
}

fn format_placeholder_for_type(message_type: u8) -> &'static str {
    match message_type {
        0 => "[未知]",
        3 => "[图片]",
        4 => "[文件]",
        5 => "[语音]",
        6 => "[视频]",
        7 => "[动画表情]",
        8 => "[系统消息]",
        9 => "[聊天记录]",
        10 => "[公告]",
        11 => "[小管家]",
        12 => "[视频通话]",
        13 => "[语音通话]",
        18 => "[位置]",
        _ => "[消息]",
    }
}

fn format_snapshot_time(timestamp_ms: i64) -> String {
    if let Some(date_time) = Local.timestamp_millis_opt(timestamp_ms).single() {
        let now = Local::now();

        if date_time.year() != now.year() {
            return date_time.format("%Y-%m-%d").to_string();
        }

        if date_time.date_naive() == now.date_naive() {
            return date_time.format("%H:%M").to_string();
        }

        let days_diff = (now.date_naive() - date_time.date_naive()).num_days();
        if days_diff == 1 {
            "昨天".to_string()
        } else if days_diff >= 7 {
            date_time.format("%m-%d").to_string()
        } else {
            format_weekday_cn(date_time.weekday()).to_string()
        }
    } else {
        String::new()
    }
}

fn format_weekday_cn(weekday: Weekday) -> &'static str {
    match weekday {
        Weekday::Mon => "星期一",
        Weekday::Tue => "星期二",
        Weekday::Wed => "星期三",
        Weekday::Thu => "星期四",
        Weekday::Fri => "星期五",
        Weekday::Sat => "星期六",
        Weekday::Sun => "星期日",
    }
}

/// 检查用户初始化状态并获取消息
pub async fn check_user_init_and_fetch_messages(
    client: &mut ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
    async_data: bool,
) -> Result<(), CommonError> {
    info!(
        "Checking user initialization status and fetching messages, uid: {}",
        uid
    );
    // 检查用户的 is_init 状态
    if let Ok(user) = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(uid))
        .one(db_conn)
        .await
    {
        if let Some(user_model) = user {
            // 如果 is_init 为 true，调用后端接口获取所有消息
            if user_model.is_init {
                info!(
                    "User {} needs initialization, starting to fetch all messages",
                    uid
                );
                // 传递用户的 async_data 参数
                if let Err(e) = fetch_all_messages(client, db_conn, uid, async_data).await {
                    error!("Failed to fetch all messages: {}", e);
                    return Err(e);
                }
            } else {
                info!(
                    "User {} offline message update, async_data: {:?}",
                    uid, async_data
                );
                if let Err(e) = fetch_all_messages(client, db_conn, uid, async_data).await {
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
    client: &mut ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
    async_data: bool,
) -> Result<(), CommonError> {
    info!(
        "Starting to fetch all messages, uid: {}, async_data: {:?}",
        uid, async_data
    );
    // 调用后端接口 /chat/msg/list 获取所有消息，传递 async_data 参数
    let body = match async_data {
        true => Some(serde_json::json!({ "async": async_data })),
        false => None,
    };

    let messages: Option<Vec<MessageResp>> = client
        .im_request(ImUrl::GetMsgList, body, None::<serde_json::Value>)
        .await?;

    if let Some(messages) = messages {
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
                error!(
                    "Failed to save messages to database, detailed error: {:?}",
                    e
                );
                return Err(e.into());
            }
        }

        // 消息保存完成后，将用户的 is_init 状态设置为 false
        im_user_repository::update_user_init_status(&tx, uid, false)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to update user is_init status: {}", e))?;

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
        time_block: msg_resp.time_block,
    }
}

#[tauri::command]
pub async fn switch_room(
    param: SwitchRoomParam,
    state: State<'_, AppData>,
) -> Result<SwitchRoomResp, String> {
    let login_uid = {
        let user_info = state.user_info.lock().await;
        user_info.uid.clone()
    };

    let page_size = param.limit.unwrap_or(20);
    let cursor_param = CursorPageParam {
        page_size,
        cursor: String::new(),
        create_id: None,
        create_time: None,
        update_time: None,
    };

    let room_id_for_query = param.room_id.clone();
    let db_conn = state.db_conn.clone();
    let login_uid_for_query = login_uid.clone();

    let db_result = async_runtime::spawn_blocking(move || {
        async_runtime::block_on(async move {
            im_message_repository::cursor_page_messages(
                db_conn.deref(),
                room_id_for_query,
                cursor_param,
                &login_uid_for_query,
            )
            .await
        })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    let CursorPageResp {
        cursor,
        is_last,
        list,
        total,
        ..
    } = db_result;

    let messages: Vec<MessageResp> = list
        .unwrap_or_default()
        .into_iter()
        .map(|msg| convert_message_to_resp(msg, None))
        .rev()
        .collect();

    let contact = {
        let db_conn = state.db_conn.clone();
        let room_id = param.room_id.clone();
        let login_uid = login_uid.clone();

        async_runtime::spawn_blocking(move || {
            async_runtime::block_on(async move {
                im_contact_repository::find_contact_by_room(db_conn.deref(), &room_id, &login_uid).await
            })
        })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?
    };

    let session_snapshot = build_session_snapshot(&param.room_id, &messages, contact, &login_uid);

    Ok(SwitchRoomResp {
        cursor,
        is_last,
        total,
        ordered: Some(true),
        messages,
        session_snapshot,
        member_snippet: None,
        announcement: None,
    })
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
    let mut message = im_message::Model {
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
        time_block: None,
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

    info!(
        "Message saved to local database, ID: {}",
        message.id.clone()
    );

    // 异步发送到后端接口
    let db_conn = state.db_conn.clone();
    let request_client = state.rc.clone();
    let msg_id = message.id.clone();

    tokio::spawn(async move {
        // 发送到后端接口
        let result: Result<Option<MessageResp>, anyhow::Error> = {
            let mut client = request_client.lock().await;
            client
                .im_request(ImUrl::SendMsg, Some(send_data), None::<serde_json::Value>)
                .await
        };

        let mut id = None;

        // 根据发送结果更新消息状态
        let status = match result {
            Ok(Some(mut resp)) => {
                resp.old_msg_id = Some(msg_id.clone());
                id = resp.message.id.clone();
                message.body = resp.message.body.as_ref().and_then(|body| {
                    if body.is_null() {
                        None
                    } else {
                        serde_json::to_string(body).ok()
                    }
                });
                "success"
            }
            _ => "fail",
        };

        // 更新消息状态
        let model = im_message_repository::update_message_status(
            db_conn.deref(),
            message,
            status,
            id,
            login_uid.clone(),
        )
        .await;

        match model {
            Ok(model) => {
                let resp = convert_message_to_resp(model, Some(msg_id));
                success_channel.send(resp).unwrap();
            }
            Err(e) => {
                error!("{:?}", e);
                error_channel.send(msg_id.clone()).unwrap();
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn save_msg(data: MessageResp, state: State<'_, AppData>) -> Result<(), String> {
    info!("save msg: {:?}", serde_json::to_string(&data));
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

#[tauri::command]
pub async fn update_message_recall_status(
    message_id: String,
    message_type: u8,
    message_body: String,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let login_uid = state.user_info.lock().await.uid.clone();

    im_message_repository::update_message_recall_status(
        state.db_conn.deref(),
        &message_id,
        message_type,
        &message_body,
        &login_uid,
    )
    .await
    .map_err(|e| {
        error!("❌ [RECALL] Failed to update message recall status: {}", e);
        e.to_string()
    })?;

    Ok(())
}
