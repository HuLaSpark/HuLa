use crate::AppData;
use crate::error::CommonError;
use crate::im_request_client::{ImRequestClient, ImUrl};
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::im_message_repository::MessageWithThumbnail;
use crate::repository::{im_message_repository, im_user_repository};
use crate::vo::vo::ChatMessageReq;

use entity::im_user::Entity as ImUserEntity;
use entity::{im_message, im_user};
use once_cell::sync::Lazy;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use sea_orm::{DatabaseConnection, TransactionTrait};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::atomic::{AtomicI64, Ordering};
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
    let mut raw_list = db_result.list.unwrap_or_default();
    raw_list.sort_by(|a, b| {
        let a_time = a.message.send_time.unwrap_or(0);
        let b_time = b.message.send_time.unwrap_or(0);
        a_time.cmp(&b_time)
    });

    // 计算每条消息的 time_block
    let mut message_resps: Vec<MessageResp> = Vec::new();
    for (index, msg) in raw_list.into_iter().enumerate() {
        let mut resp = convert_message_to_resp(msg.clone(), None);

        // 第一条消息始终显示时间
        if index == 0 {
            resp.time_block = Some(1);
        } else if let Some(send_time) = msg.message.send_time {
            // 使用统一的 time_block 计算函数
            resp.time_block = im_message_repository::calculate_time_block(
                state.db_conn.deref(),
                &msg.message.room_id,
                &msg.message.id,
                send_time,
                &login_uid,
            )
            .await
            .map_err(|e| e.to_string())?;
        }

        message_resps.push(resp);
    }

    Ok(CursorPageResp {
        cursor: db_result.cursor,
        is_last: db_result.is_last,
        list: Some(message_resps),
        total: db_result.total,
    })
}

/// 将数据库消息模型转换为响应模型
pub fn convert_message_to_resp(
    record: MessageWithThumbnail,
    old_msg_id: Option<String>,
) -> MessageResp {
    let MessageWithThumbnail {
        message: msg,
        thumbnail_path,
    } = record;

    // 解析消息体 - 安全地处理 JSON 解析
    let mut body = msg.body.as_ref().and_then(|body_str| {
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

    inject_thumbnail_path(&mut body, thumbnail_path.as_deref());

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

/// 检查用户初始化状态并获取消息
pub async fn check_user_init_and_fetch_messages(
    client: &mut ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
    async_data: bool,
    force_full: bool,
) -> Result<(), CommonError> {
    // 防止高频同步，10秒内只允许一次同步(比如弱网、网络不好情况下会重复重连)
    static MESSAGE_SYNC_LOCK: Lazy<tokio::sync::Mutex<()>> =
        Lazy::new(|| tokio::sync::Mutex::new(()));
    static LAST_MESSAGE_SYNC_MS: AtomicI64 = AtomicI64::new(0);
    const MESSAGE_SYNC_COOLDOWN_MS: i64 = 10_000;

    info!(
        "Checking user initialization status and fetching messages, uid: {}",
        uid
    );

    let now_ms = chrono::Utc::now().timestamp_millis();
    if !force_full {
        let last = LAST_MESSAGE_SYNC_MS.load(Ordering::Relaxed);
        if now_ms - last < MESSAGE_SYNC_COOLDOWN_MS {
            info!(
                "Skip message sync due to cooldown (last={}ms, now={}ms, uid={})",
                last, now_ms, uid
            );
            return Ok(());
        }
    }

    let guard = match MESSAGE_SYNC_LOCK.try_lock() {
        Ok(g) => g,
        Err(_) => {
            info!(
                "Skip message sync because another sync is in progress, uid={}",
                uid
            );
            return Ok(());
        }
    };

    // 检查用户的 is_init 状态
    if let Ok(user) = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(uid))
        .one(db_conn)
        .await
    {
        if let Some(user_model) = user {
            let should_full_sync = force_full || user_model.is_init;
            // 如果 is_init 为 true，调用后端接口获取所有消息；否则按增量模式同步
            if should_full_sync {
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
                    "User {} incremental/offline message update, async_data: {:?}",
                    uid, async_data
                );
                fetch_all_messages(client, db_conn, uid, async_data)
                    .await
                    .map_err(|e| {
                        error!("Failed to update offline messages: {}", e);
                        e
                    })?;
            }
        }
    }
    LAST_MESSAGE_SYNC_MS.store(now_ms, Ordering::Relaxed);
    drop(guard);
    Ok(())
}

// 获取所有消息并保存到数据库
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

    if let Some(mut messages) = messages {
        // 排序消息（按发送时间）
        messages.sort_by(|a, b| {
            let a_time = a.message.send_time.unwrap_or(0);
            let b_time = b.message.send_time.unwrap_or(0);
            a_time.cmp(&b_time)
        });

        // 批量计算 time_block（先计算，再一次性写库）
        // 以 DB 中最后一条消息的 send_time 作为起点，批次内逐条递进
        const TIME_BLOCK_THRESHOLD_MS: i64 = 1000 * 60 * 10;
        let mut last_send_time_map: HashMap<String, Option<i64>> = HashMap::new();

        for (_index, msg_resp) in messages.iter_mut().enumerate() {
            let room_id = match &msg_resp.message.room_id {
                Some(v) => v.clone(),
                None => continue,
            };
            let send_time = match msg_resp.message.send_time {
                Some(v) => v,
                None => continue,
            };

            // 获取该房间的上一条 send_time（优先使用批次内最新值，否则从 DB 取一次）
            let prev_send_time = match last_send_time_map.get(&room_id) {
                Some(value) => *value,
                None => {
                    let last_time = im_message::Entity::find()
                        .filter(im_message::Column::RoomId.eq(&room_id))
                        .filter(im_message::Column::LoginUid.eq(uid))
                        .order_by_desc(im_message::Column::SendTime)
                        .select_only()
                        .column(im_message::Column::SendTime)
                        .into_tuple::<Option<i64>>()
                        .one(db_conn)
                        .await
                        .map_err(|e| anyhow::anyhow!("Failed to query last send_time: {}", e))?
                        .flatten();
                    last_send_time_map.insert(room_id.clone(), last_time);
                    last_time
                }
            };

            msg_resp.time_block = if let Some(prev) = prev_send_time {
                let gap = send_time - prev;
                if gap >= TIME_BLOCK_THRESHOLD_MS {
                    Some(gap)
                } else {
                    None
                }
            } else {
                // 房间第一条消息始终显示时间
                Some(1)
            };

            // 当前消息成为下一条的参考
            last_send_time_map.insert(room_id, Some(send_time));
        }

        // 开启事务
        let tx = db_conn.begin().await?;

        // 转换 MessageResp 为本地存储模型
        let db_messages: Vec<MessageWithThumbnail> = messages
            .into_iter()
            .map(|msg_resp| convert_resp_to_record_for_fetch(msg_resp, uid.to_string()))
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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncMessagesParam {
    pub async_data: Option<bool>,
    pub full_sync: Option<bool>,
    pub uid: Option<String>,
}

#[tauri::command]
pub async fn sync_messages(
    param: Option<SyncMessagesParam>,
    state: State<'_, AppData>,
) -> Result<(), String> {
    use std::ops::Deref;

    let async_data = param.as_ref().and_then(|p| p.async_data).unwrap_or(true);
    let full_sync = param.as_ref().and_then(|p| p.full_sync).unwrap_or(false);
    let uid = match param.as_ref().and_then(|p| p.uid.clone()) {
        Some(v) if !v.is_empty() => v,
        _ => state.user_info.lock().await.uid.clone(),
    };

    let mut client = state.rc.lock().await;
    check_user_init_and_fetch_messages(
        &mut client,
        state.db_conn.deref(),
        &uid,
        async_data,
        full_sync,
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// 将 MessageResp 转换为数据库模型（用于 fetch_all_messages）
fn convert_resp_to_record_for_fetch(msg_resp: MessageResp, uid: String) -> MessageWithThumbnail {
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

    let model = im_message::Model {
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
        login_uid: uid.to_string(),
        send_status: "success".to_string(),
        time_block: msg_resp.time_block,
    };

    let thumbnail_path = extract_thumbnail_path_from_body(&msg_resp.message.body);
    MessageWithThumbnail::new(model, thumbnail_path)
}

fn extract_thumbnail_path_from_body(body: &Option<serde_json::Value>) -> Option<String> {
    body.as_ref().and_then(|value| {
        value.as_object().and_then(|obj| {
            obj.get("thumbnailPath")
                .or_else(|| obj.get("thumbnail_path"))
                .and_then(|v| v.as_str().map(|s| s.to_string()))
        })
    })
}

fn inject_thumbnail_path(body: &mut Option<serde_json::Value>, path: Option<&str>) {
    let Some(path) = path else {
        return;
    };

    if path.is_empty() {
        return;
    }

    if let Some(val) = body {
        if let Some(map) = val.as_object_mut() {
            let exists = map
                .get("thumbnailPath")
                .and_then(|v| v.as_str())
                .map(|s| !s.is_empty())
                .unwrap_or(false);
            if !exists {
                map.insert(
                    "thumbnailPath".to_string(),
                    serde_json::Value::String(path.to_string()),
                );
            }
        }
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
    let thumbnail_path = extract_thumbnail_path_from_body(&data.body);

    // 创建消息模型
    let message_model = im_message::Model {
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

    let mut message_record = MessageWithThumbnail::new(message_model, thumbnail_path);

    let tx = state
        .db_conn
        .begin()
        .await
        .map_err(|e| CommonError::DatabaseError(e))?;
    // 先保存到本地数据库
    message_record = match im_message_repository::save_message(&tx, message_record).await {
        Ok(record) => record,
        Err(e) => {
            error!("Failed to save message to database: {}", e);
            return Err(e.to_string());
        }
    };
    tx.commit()
        .await
        .map_err(|e| CommonError::DatabaseError(e))?;

    info!(
        "Message saved to local database, ID: {}",
        message_record.message.id.clone()
    );

    let msg_id = message_record.message.id.clone();

    // 异步发送到后端接口
    let db_conn = state.db_conn.clone();
    let request_client = state.rc.clone();
    let mut record_for_send = message_record.clone();

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
                record_for_send.message.body = resp.message.body.as_ref().and_then(|body| {
                    if body.is_null() {
                        None
                    } else {
                        serde_json::to_string(body).ok()
                    }
                });
                if let Some(path) = extract_thumbnail_path_from_body(&resp.message.body) {
                    record_for_send.thumbnail_path = Some(path);
                }
                "success"
            }
            _ => "fail",
        };

        // 更新消息状态
        let model = im_message_repository::update_message_status(
            db_conn.deref(),
            record_for_send,
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
    // 创建 im_message::Model
    let record = convert_resp_to_record_for_fetch(data, state.user_info.lock().await.uid.clone());

    async {
        let tx = state.db_conn.clone().begin().await?;
        // 保存到数据库
        im_message_repository::save_message(&tx, record).await?;
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
#[tauri::command]
pub async fn delete_message(
    message_id: String,
    room_id: Option<String>,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let login_uid = state.user_info.lock().await.uid.clone();

    let resolved_room_id = if let Some(room) = room_id {
        room
    } else {
        im_message_repository::get_room_id_by_message_id(
            state.db_conn.deref(),
            &message_id,
            &login_uid,
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "消息不存在或房间信息缺失".to_string())?
    };

    im_message_repository::delete_message_by_id(state.db_conn.deref(), &message_id, &login_uid)
        .await
        .map_err(|e| {
            error!("Failed to delete message {}: {}", message_id, e);
            e.to_string()
        })?;

    im_message_repository::record_deleted_message(
        state.db_conn.deref(),
        &message_id,
        &resolved_room_id,
        &login_uid,
    )
    .await
    .map_err(|e| {
        error!(
            "Failed to record deletion for message {} in room {}: {}",
            message_id, resolved_room_id, e
        );
        e.to_string()
    })?;

    info!(
        "Deleted message {} for current user {} from local database",
        message_id, login_uid
    );

    Ok(())
}

#[tauri::command]
pub async fn delete_room_messages(
    room_id: String,
    state: State<'_, AppData>,
) -> Result<u64, String> {
    let login_uid = state.user_info.lock().await.uid.clone();

    let last_msg_id =
        im_message_repository::get_room_max_message_id(state.db_conn.deref(), &room_id, &login_uid)
            .await
            .map_err(|e| {
                error!(
                    "Failed to query last message id for room {}: {}",
                    room_id, e
                );
                e.to_string()
            })?;

    let affected_rows =
        im_message_repository::delete_messages_by_room(state.db_conn.deref(), &room_id, &login_uid)
            .await
            .map_err(|e| {
                error!("Failed to delete messages for room {}: {}", room_id, e);
                e.to_string()
            })?;

    im_message_repository::record_room_clear(
        state.db_conn.deref(),
        &room_id,
        &login_uid,
        last_msg_id,
    )
    .await
    .map_err(|e| {
        error!(
            "Failed to record room clear for room {} (user {}): {}",
            room_id, login_uid, e
        );
        e.to_string()
    })?;

    info!(
        "Deleted {} messages for room {} (user {})",
        affected_rows, room_id, login_uid
    );

    Ok(affected_rows)
}
