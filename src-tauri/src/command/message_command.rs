use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::im_message_repository;
use crate::AppData;
use entity::{im_message, im_user};
use entity::im_user::Entity as ImUserEntity;
use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use tauri::State;
use crate::im_reqest_client::ImRequestClient;
use sea_orm::DatabaseConnection;
use crate::error::CommonError;
use log::{debug, error, info};


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageResp {
    pub create_id: Option<String>,
    pub create_time: Option<i64>,
    pub update_id: Option<String>,
    pub update_time: Option<i64>,
    pub from_user: FromUser,
    pub message: Message,
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
    }
}

#[tauri::command]
pub async fn save_all_msg(_room_id: String, _state: State<'_, AppData>) -> Result<(), String> {
    // // 获取当前登录用户的 uid
    // let login_uid = {
    //     let user_info = state.user_info.lock().await;
    //     user_info.uid.clone()
    // };
    //
    // // 后端接口URL（临时占位符）
    // let api_url = format!("https://api.example.com/messages/{}", room_id);
    //
    // // 调用后端接口获取消息数据
    // let request_client = state.request_client.lock().await;
    // let messages: ApiResult<String> = request_client
    //     .get(&api_url)
    //     .send_json()
    //     .await
    //     .map_err(|e| format!("调用后端接口失败: {}", e))?;
    //
    // // 转换 MessageResp 为 im_message::Model
    // let db_messages: Vec<im_message::Model> = messages.data.unwrap()
    //     .into_iter()
    //     .map(|msg_resp| convert_resp_to_model(msg_resp))
    //     .collect();
    //
    // // 保存到本地数据库
    // im_message_repository::save_all(state.db_conn.deref(), db_messages, &login_uid)
    //     .await
    //     .map_err(|e| format!("保存消息到数据库失败: {}", e))?;
    //
    Ok(())
}

/// 将 MessageResp 转换为数据库模型
// fn convert_resp_to_model(msg_resp: MessageResp) -> im_message::Model {
//     // 序列化消息体为 JSON 字符串
//     let body_json = msg_resp.message.body
//         .as_ref()
//         .and_then(|body| serde_json::to_string(body).ok());
//
//     // 序列化消息标记为 JSON 字符串
//     let marks_json = msg_resp.message.message_marks
//         .as_ref()
//         .and_then(|marks| serde_json::to_string(marks).ok());
//
//     im_message::Model {
//         id: msg_resp.message.id.unwrap(),
//         uid: msg_resp.from_user.uid,
//         nickname: msg_resp.from_user.nickname,
//         room_id: msg_resp.message.room_id.unwrap_or_default(),
//         message_type: msg_resp.message.message_type,
//         body: body_json,
//         message_marks: marks_json,
//         send_time: msg_resp.create_time,
//         create_time: msg_resp.create_time,
//         update_time: msg_resp.update_time,
//         login_uid: String::new(), // 这里暂时设为空字符串，实际使用时会在 save_all 中设置
//     }
// }

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
    }
}