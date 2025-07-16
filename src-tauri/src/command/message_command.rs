use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::im_message_repository;
use crate::AppData;
use entity::{im_message, im_user};
use entity::im_user::Entity as ImUserEntity;
use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::{AppHandle, Emitter, State};
use crate::im_reqest_client::ImRequestClient;
use sea_orm::DatabaseConnection;
use crate::error::CommonError;
use log::{debug, error, info};
use crate::vo::vo::ChatMessageReq;

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
    pub user_marked: bool
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CursorPageMessageParam {
    room_id: String,
    #[serde(flatten)]
    cursor_page_param: CursorPageParam
}

#[tauri::command]
pub async fn page_msg(param: CursorPageMessageParam, state: State<'_, AppData>) -> Result<CursorPageResp<Vec<MessageResp>>, String> {
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
        &login_uid
    ).await.map_err(|e| e.to_string())?;
    
    // 转换数据库模型为响应模型
    let message_resps: Vec<MessageResp> = db_result.list.unwrap_or_default()
        .into_iter()
        .map(|msg| convert_message_to_resp(msg))
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
fn convert_message_to_resp(msg: im_message::Model) -> MessageResp {
    // 解析消息体
    let body = msg.body.as_ref().and_then(|b| {
        serde_json::from_str(b).ok()
    });
    
    // 解析消息标记
    let message_marks = msg.message_marks.as_ref().and_then(|marks| {
        serde_json::from_str::<HashMap<String, MessageMark>>(marks).ok()
    });
    
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
        old_msg_id: None,
    }
}

/// 检查用户初始化状态并获取消息
pub async fn check_user_init_and_fetch_messages(
    client: &ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
) -> Result<(), CommonError> {
    debug!("检查用户初始化状态并获取消息, uid: {}", uid);
    // 检查用户的 is_init 状态
    if let Ok(user) = ImUserEntity::find()
        .filter(im_user::Column::Id.eq(uid))
        .one(db_conn)
        .await
    {
        if let Some(user_model) = user {
            // 如果 is_init 为 true，调用后端接口获取所有消息
            if user_model.is_init {
                info!("用户 {} 需要初始化，开始获取所有消息", uid);
                if let Err(e) = fetch_all_messages(client, db_conn, uid).await {
                    error!("获取所有消息失败: {}", e);
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
) -> Result<(), CommonError> {
    // 调用后端接口 /chat/msg/list 获取所有消息
    let messages = client
        .get("/chat/msg/list")
        .send_json::<Vec<MessageResp>>()
        .await?;

    if let Some(messages) = messages.data {
        // 转换 MessageResp 为 im_message::Model
        let db_messages: Vec<im_message::Model> = messages
            .into_iter()
            .map(|msg_resp| convert_resp_to_model_for_fetch(msg_resp))
            .collect();
        // 保存到本地数据库
        match im_message_repository::save_all(db_conn, db_messages, uid).await {
            Ok(_) => {
                info!("消息保存到数据库成功");
            }
            Err(e) => {
                error!("保存消息到数据库失败，详细错误: {:?}", e);
                return Err(e.into());
            }
        }
    }

    Ok(())
}

/// 将 MessageResp 转换为数据库模型（用于 fetch_all_messages）
fn convert_resp_to_model_for_fetch(msg_resp: MessageResp) -> im_message::Model {
    use serde_json;
    
    // 序列化消息体为 JSON 字符串
    let body_json = msg_resp.message.body
        .as_ref()
        .and_then(|body| serde_json::to_string(body).ok());
    
    // 序列化消息标记为 JSON 字符串
    let marks_json = msg_resp.message.message_marks
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
        login_uid: String::new(), // 这里暂时设为空字符串，实际使用时会在 save_all 中设置
        send_status: "success".to_string(), // 从后端获取的消息默认为成功状态
    }
}


#[tauri::command]
pub async fn send_msg(data: ChatMessageReq, state: State<'_, AppData>, app: AppHandle) -> Result<(), String> {
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
    let body_json = data.body.as_ref()
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
    
    // 先保存到本地数据库
    if let Err(e) = im_message_repository::save_message(state.db_conn.deref(), message.clone()).await {
        error!("保存消息到数据库失败: {}", e);
        return Err(e.to_string());
    }
    
    info!("消息已保存到本地数据库，ID: {}", message.id.clone());
    
    // 异步发送到后端接口
    let db_conn = state.db_conn.clone();
    let request_client = state.request_client.clone();
    let msg_id = message.id.clone();
    
    tokio::spawn(async move {
        // 发送到后端接口
        let result = {
            let client = request_client.lock().await;
            client.post("/chat/msg")
                .json(&send_data)
                .send_json::<MessageResp>()
                .await
        };

        let mut id = None;
        
        // 根据发送结果更新消息状态
        let status = match result {
            Ok(resp) => {
                info!("消息发送成功，ID: {}", msg_id);
                let mut result = resp.data.clone().unwrap();
                result.old_msg_id = Some(msg_id.clone());
                id = result.message.id.clone();
                
                let _ = app.emit::<MessageResp>("send_msg_success", result);
                "success"
            }
            Err(e) => {
                error!("消息发送失败，ID: {}, 错误: {}", msg_id, e);
                let _ = app.emit::<String>("send_msg_error", msg_id.clone());
                "fail"
            }
        };
        
        // 更新消息状态
        if let Err(e) = im_message_repository::update_message_status(
            db_conn.deref(),
            &msg_id,
            status,
            id,
        ).await {
            error!("更新消息状态失败: {}", e);
        }
    });
    
    Ok(())
}