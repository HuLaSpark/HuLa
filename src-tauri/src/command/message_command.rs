use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::im_message_repository;
use crate::AppData;
use entity::im_message;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageResp {
    create_id: Option<String>,
    create_time: Option<i64>,
    update_id: Option<String>,
    update_time: Option<i64>,
    from_user: FromUser,
    message: Message,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct FromUser {
    uid: String,
    nickname: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct Message {
    id: Option<String>,
    room_id: Option<String>,
    message_type: Option<u8>,
    body: Option<MessageBody>,
    message_marks: Option<HashMap<String, MessageMark>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
enum MessageBody {
    EmojiMsg {
        url: Option<String>,
        reply_msg_id: Option<String>,
        at_uid_last: Option<String>,
        reply: Option<Box<ReplyMsg>>,
    },
    FileMsg {
        file_name: Option<String>,
        reply_msg_id: Option<String>,
        at_uid_list: Option<Vec<String>>,
        reply: Option<Box<ReplyMsg>>,
        size: Option<i64>,
        url: Option<String>,
    },
    ImgMsg {
        width: u16,
        height: u16,
        reply_msg_id: Option<String>,
        at_uid_list: Option<Vec<String>>,
        reply: Option<Box<ReplyMsg>>,
    },
    MergeMsg {
        messages: Vec<MergeMessage>,
        reply_msg_id: Option<String>,
        reply: Option<Box<ReplyMsg>>,
    },
    NoticeMsg {
        id: Option<String>,
        room_id: Option<String>,
        uid: Option<String>,
        content: Option<String>,
        created_time: Option<i64>,
        top: Option<bool>,
        reply_msg_id: Option<String>,
        reply: Option<Box<ReplyMsg>>,
    },
    SoundMsg {
        second: Option<u32>,
        reply_msg_id: Option<String>,
        size: Option<String>,
        url: Option<String>,
    },
    SystemMsg(String),
    TextMsg {
        content: Option<String>,
        url_content_map: Option<HashMap<String, UrlInfo>>,
        at_uid_list: Option<Vec<String>>,
        reply: Option<Box<ReplyMsg>>,
    },
    VideoMsg {
        thumb_width: Option<u32>,
        thumb_height: Option<u32>,
        thumb_size: Option<String>,
        thumb_url: Option<String>,
        reply_msg_id: Option<String>,
        at_uid_list: Option<Vec<String>>,
        reply: Option<Box<ReplyMsg>>,
        size: Option<String>,
        url: Option<String>,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct UrlInfo {
    title: Option<String>,
    description: Option<String>,
    image: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct MergeMessage {
    content: Option<String>,
    created_time: Option<i64>,
    name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct ReplyMsg {
    id: Option<String>,
    uid: Option<String>,
    username: Option<String>,
    #[serde(rename = "type")]
    msg_type: Option<u8>,
    body: Option<Box<MessageBody>>,
    can_callback: u8,
    gap_count: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct MessageMark {
    count: u32,
    user_marked: bool
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
    // 从数据库查询消息
    let db_result = im_message_repository::cursor_page_messages(
        state.db_conn.deref(), 
        param.room_id, 
        param.cursor_page_param
    ).await.map_err(|e| e.to_string())?;
    
    // 转换数据库模型为响应模型
    let message_resps: Vec<MessageResp> = db_result.list.unwrap_or_default()
        .into_iter()
        .map(|msg| convert_message_to_resp(msg))
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
        serde_json::from_str::<MessageBody>(b).ok()
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
        },
    }
}

#[tauri::command]
pub async fn save_all_msg(room_id: String, state: State<'_, AppData>) -> Result<(), String> {
    // 后端接口URL（临时占位符）
    let api_url = format!("https://api.example.com/messages/{}", room_id);
    
    // 调用后端接口获取消息数据
    let request_client = state.request_client.lock().await;
    let messages: Vec<MessageResp> = request_client
        .get(&api_url)
        .send_json()
        .await
        .map_err(|e| format!("调用后端接口失败: {}", e))?;
    
    // 转换 MessageResp 为 im_message::Model
    let db_messages: Vec<im_message::Model> = messages
        .into_iter()
        .map(|msg_resp| convert_resp_to_model(msg_resp))
        .collect();
    
    // 保存到本地数据库
    im_message_repository::save_all(state.db_conn.deref(), db_messages)
        .await
        .map_err(|e| format!("保存消息到数据库失败: {}", e))?;
    
    Ok(())
}

/// 将 MessageResp 转换为数据库模型
fn convert_resp_to_model(msg_resp: MessageResp) -> im_message::Model {
    // 序列化消息体为 JSON 字符串
    let body_json = msg_resp.message.body
        .as_ref()
        .and_then(|body| serde_json::to_string(body).ok());
    
    // 序列化消息标记为 JSON 字符串
    let marks_json = msg_resp.message.message_marks
        .as_ref()
        .and_then(|marks| serde_json::to_string(marks).ok());
    
    im_message::Model {
        id: msg_resp.message.id.unwrap(),
        uid: msg_resp.from_user.uid,
        nickname: msg_resp.from_user.nickname,
        room_id: msg_resp.message.room_id.unwrap_or_default(),
        message_type: msg_resp.message.message_type,
        body: body_json,
        message_marks: marks_json,
        send_time: msg_resp.create_time,
        create_time: msg_resp.create_time,
        update_time: msg_resp.update_time,
    }
}