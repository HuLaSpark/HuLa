use crate::AppData;
use crate::repository::im_message_repository;
use entity::{im_message};
use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, QueryOrder, PaginatorTrait, QuerySelect};

use serde::{Deserialize, Serialize};
use std::ops::Deref;
use tauri::State;
use tracing::info;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub id: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
    pub upload_time: String,
    pub sender: UserInfo,
    pub download_url: Option<String>,
    pub is_downloaded: Option<bool>,
    pub status: String, // "uploading", "completed", "expired", "downloading"
    pub thumbnail_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub is_online: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimeGroup {
    pub date: String,
    pub files: Vec<FileInfo>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NavigationItem {
    pub key: String,
    pub label: String,
    pub icon: String,
    pub active: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileQueryParam {
    pub navigation_type: String, // "myFiles", "senders", "sessions"
    pub selected_user: Option<String>,
    pub search_keyword: Option<String>,
    pub room_id: Option<String>,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileQueryResponse {
    pub time_grouped_files: Vec<TimeGroup>,
    pub user_list: Vec<UserInfo>,
    pub has_more: bool,
    pub current_page: u32,
}

/// 查询文件的 Tauri 命令
#[tauri::command]
pub async fn query_files(
    param: FileQueryParam,
    state: State<'_, AppData>,
) -> Result<FileQueryResponse, String> {

    // 获取当前登录用户的 uid
    let login_uid = {
        let user_info = state.user_info.lock().await;
        user_info.uid.clone()
    };

    // 构建查询条件 - 只查询文件类型的消息
    let _query_condition = crate::command::chat_history_command::ChatHistoryQueryCondition {
        room_id: param.room_id.clone().unwrap_or_default(),
        login_uid: login_uid.clone(),
        message_type: Some(vec![4, 6]), // 文件、视频类型
        search_keyword: param.search_keyword.clone(),
        sort_order: crate::command::chat_history_command::SortOrder::Desc,
        date_range: None,
        pagination: crate::command::chat_history_command::PaginationParam {
            page: param.page,
            page_size: param.page_size,
        },
    };

    // 查询数据库
    let messages = match param.navigation_type.as_str() {
        "myFiles" => {
            // 查询所有房间的文件
            query_all_files(state.db_conn.deref(), &login_uid, &param).await?
        }
        "senders" => {
            // 按发送人分组查询文件
            query_files_by_senders(state.db_conn.deref(), &login_uid, &param).await?
        }
        "sessions" | "groups" => {
            // 按会话或群聊分组查询文件
            query_files_by_sessions(state.db_conn.deref(), &login_uid, &param).await?
        }
        _ => {
            return Err("不支持的导航类型".to_string());
        }
    };

    // 转换为文件信息
    let file_infos: Vec<FileInfo> = messages
        .into_iter()
        .filter_map(|msg| convert_message_to_file_info(msg))
        .collect();

    // 提取用户列表
    let user_list = extract_user_list(&file_infos);

    // 按搜索关键词过滤
    let filtered_files: Vec<FileInfo> = if let Some(keyword) = &param.search_keyword {
        file_infos
            .into_iter()
            .filter(|file| {
                file.file_name
                    .to_lowercase()
                    .contains(&keyword.to_lowercase())
            })
            .collect()
    } else {
        file_infos
    };

    // 按时间分组
    let time_grouped_files = group_files_by_time(filtered_files);

    let has_more = time_grouped_files.len() >= param.page_size as usize;

    let response = FileQueryResponse {
        time_grouped_files,
        user_list,
        has_more,
        current_page: param.page,
    };

    Ok(response)
}

/// 查询所有文件
async fn query_all_files(
    db_conn: &sea_orm::DatabaseConnection,
    login_uid: &str,
    param: &FileQueryParam,
) -> Result<Vec<im_message::Model>, String> {
    im_message_repository::query_file_messages(
        db_conn,
        login_uid,
        None, // 查询所有房间
        Some(&[4, 6]), // 文件、视频类型
        param.search_keyword.as_deref(),
        param.page,
        param.page_size,
    )
    .await
    .map_err(|e| e.to_string())
}

/// 按发送人查询文件
async fn query_files_by_senders(
    db_conn: &sea_orm::DatabaseConnection,
    login_uid: &str,
    param: &FileQueryParam,
) -> Result<Vec<im_message::Model>, String> {
    // 如果指定了联系人，查找与该联系人相关的所有文件
    if let Some(contact_uid) = &param.selected_user {

        // 新策略：基于消息交互历史查找共同房间
        // 1. 查找所有涉及目标联系人的消息，获取不重复的房间ID
        let contact_messages = im_message::Entity::find()
            .filter(im_message::Column::LoginUid.eq(login_uid))
            .filter(im_message::Column::Uid.eq(contact_uid))
            .all(db_conn)
            .await
            .map_err(|e| format!("查询联系人消息失败: {}", e))?;

        // 提取不重复的房间ID
        let mut room_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
        for message in contact_messages {
            room_ids.insert(message.room_id);
        }

        // 2. 从这些房间中查询文件消息
        let mut relevant_messages = Vec::new();

        for room_id in room_ids {
            // 查询该房间的文件消息
            let room_files = im_message_repository::query_file_messages(
                db_conn,
                login_uid,
                Some(&room_id), // 指定房间
                Some(&[4, 6]), // 文件、视频类型
                param.search_keyword.as_deref(),
                param.page,
                param.page_size,
            )
            .await
            .map_err(|e| e.to_string())?;

            relevant_messages.extend(room_files);
        }

        Ok(relevant_messages)
    } else {
        // 如果没有指定联系人，查询所有文件
        query_all_files(db_conn, login_uid, param).await
    }
}

/// 按会话查询文件
async fn query_files_by_sessions(
    db_conn: &sea_orm::DatabaseConnection,
    login_uid: &str,
    param: &FileQueryParam,
) -> Result<Vec<im_message::Model>, String> {
    // 如果指定了房间ID，则查询该房间的文件；否则查询所有房间
    let room_id = param.room_id.as_deref();

    im_message_repository::query_file_messages(
        db_conn,
        login_uid,
        room_id,
        Some(&[4, 6]), //文件、视频类型
        param.search_keyword.as_deref(),
        param.page,
        param.page_size,
    )
    .await
    .map_err(|e| e.to_string())
}

/// 将消息转换为文件信息
fn convert_message_to_file_info(message: im_message::Model) -> Option<FileInfo> {
    // 解析消息体中的文件信息
    if let Some(body) = &message.body {
        // 尝试解析为 JSON
        match serde_json::from_str::<serde_json::Value>(body) {
            Ok(file_data) => {
                // 验证消息类型是否为文件类型
                let message_type = message.message_type.unwrap_or(0);
                if message_type != 4 && message_type != 6 {
                    return None;
                }

                // 尝试获取文件名，优先使用 fileName，兼容历史数据，视频消息从URL提取
                let file_name = file_data["fileName"].as_str()
                    .or_else(|| {
                        // 对于视频消息，从URL中提取文件名
                        if message_type == 6 {
                            file_data["url"].as_str().and_then(|url| {
                                url.split('/').last().map(|s| s.split('?').next().unwrap_or(s))
                            })
                        } else {
                            None
                        }
                    });

                let file_name = match file_name {
                    Some(name) => name.to_string(),
                    None => {
                        return None;
                    }
                };
                let file_size = file_data["fileSize"]
                    .as_i64()
                    .or_else(|| file_data["size"].as_i64())
                    .unwrap_or(0);

                let file_type = get_file_type_from_message_type(message_type);
                let upload_time = message.send_time.unwrap_or(0);

                let sender = UserInfo {
                    id: message.uid.clone(),
                    name: message.nickname.clone().unwrap_or("未知用户".to_string()),
                    avatar: "/avatars/default.jpg".to_string(),
                    is_online: None,
                };

                let file_info = FileInfo {
                    id: message.id.clone(),
                    file_name: file_name.clone(),
                    file_size,
                    file_type: file_type.clone(),
                    upload_time: format_timestamp(upload_time),
                    sender,
                    download_url: file_data["url"].as_str().or_else(|| file_data["downloadUrl"].as_str()).map(|s| s.to_string()),
                    is_downloaded: Some(false),
                    status: "completed".to_string(),
                    thumbnail_url: file_data["thumbnailUrl"].as_str().map(|s| s.to_string()),
                };

                return Some(file_info);
            }
            Err(e) => {
                info!("消息体不是有效的 JSON 格式，跳过: {}", e);
                // 不再创建假数据，直接返回 None
            }
        }
    } else {
        info!("消息体为空");
    }

    info!("无法转换消息为文件信息");
    None
}

/// 根据消息类型获取文件类型
fn get_file_type_from_message_type(message_type: u8) -> String {
    match message_type {
        4 => "file".to_string(),
        6 => "video".to_string(),
        _ => "unknown".to_string(),
    }
}

/// 格式化时间戳
fn format_timestamp(timestamp: i64) -> String {
    use chrono::{Local, TimeZone};

    if let Some(dt) = Local.timestamp_opt(timestamp / 1000, 0).single() {
        dt.format("%Y-%m-%d %H:%M:%S").to_string()
    } else {
        "未知时间".to_string()
    }
}

/// 提取用户列表
fn extract_user_list(files: &[FileInfo]) -> Vec<UserInfo> {
    let mut user_map = std::collections::HashMap::new();

    for file in files {
        user_map.insert(file.sender.id.clone(), file.sender.clone());
    }

    user_map.into_values().collect()
}

/// 按时间分组文件
fn group_files_by_time(files: Vec<FileInfo>) -> Vec<TimeGroup> {
    use std::collections::HashMap;

    let mut groups: HashMap<String, Vec<FileInfo>> = HashMap::new();

    for file in files {
        // 从 upload_time 提取日期
        let date = if let Ok(dt) = chrono::DateTime::parse_from_str(&file.upload_time, "%Y-%m-%d %H:%M:%S") {
            dt.format("%Y年%m月%d日").to_string()
        } else {
            "未知时间".to_string()
        };

        groups.entry(date).or_insert_with(Vec::new).push(file);
    }

    let mut time_groups: Vec<TimeGroup> = groups
        .into_iter()
        .map(|(date, mut files)| {
            // 按上传时间降序排序
            files.sort_by(|a, b| b.upload_time.cmp(&a.upload_time));
            TimeGroup { date, files }
        })
        .collect();

    // 按日期降序排序
    time_groups.sort_by(|a, b| b.date.cmp(&a.date));

    time_groups
}

/// 获取导航菜单项
#[tauri::command]
pub async fn get_navigation_items() -> Result<Vec<NavigationItem>, String> {
    let items = vec![
        NavigationItem {
            key: "myFiles".to_string(),
            label: "我的文件".to_string(),
            icon: "file".to_string(),
            active: true,
        },
        NavigationItem {
            key: "senders".to_string(),
            label: "发送人".to_string(),
            icon: "avatar".to_string(),
            active: false,
        },
        NavigationItem {
            key: "sessions".to_string(),
            label: "会话".to_string(),
            icon: "message".to_string(),
            active: false,
        },
        NavigationItem {
            key: "groups".to_string(),
            label: "群聊".to_string(),
            icon: "peoples".to_string(),
            active: false,
        },
    ];

    Ok(items)
}

/// 调试命令：获取数据库中的消息统计信息
#[tauri::command]
pub async fn debug_message_stats(
    state: State<'_, AppData>,
) -> Result<serde_json::Value, String> {
    let login_uid = {
        let user_info = state.user_info.lock().await;
        user_info.uid.clone()
    };

    // 查询总消息数
    let total_messages = im_message::Entity::find()
        .filter(im_message::Column::LoginUid.eq(&login_uid))
        .count(state.db_conn.deref())
        .await
        .map_err(|e| format!("查询总消息数失败: {}", e))?;

    // 查询各种类型的消息数
    let mut stats = serde_json::Map::new();
    stats.insert("total_messages".to_string(), serde_json::Value::Number(serde_json::Number::from(total_messages)));

    // 统计各种消息类型
    for msg_type in 0..=10u8 {
        let count = im_message::Entity::find()
            .filter(im_message::Column::LoginUid.eq(&login_uid))
            .filter(im_message::Column::MessageType.eq(msg_type))
            .count(state.db_conn.deref())
            .await
            .map_err(|e| format!("查询类型 {} 消息数失败: {}", msg_type, e))?;

        if count > 0 {
            stats.insert(format!("type_{}", msg_type), serde_json::Value::Number(serde_json::Number::from(count)));
        }
    }

    // 查询最近的几条文件消息样例
    let sample_messages = im_message::Entity::find()
        .filter(im_message::Column::LoginUid.eq(&login_uid))
        .filter(im_message::Column::MessageType.is_in([4, 6]))
        .order_by_desc(im_message::Column::SendTime)
        .limit(5)
        .all(state.db_conn.deref())
        .await
        .map_err(|e| format!("查询样例消息失败: {}", e))?;

    let samples: Vec<serde_json::Value> = sample_messages
        .into_iter()
        .map(|msg| {
            serde_json::json!({
                "id": msg.id,
                "message_type": msg.message_type,
                "room_id": msg.room_id,
                "sender": msg.uid,
                "nickname": msg.nickname,
                "send_time": msg.send_time,
                "body_length": msg.body.as_ref().map(|b| b.len()).unwrap_or(0),
                "body_content": msg.body.as_ref().map(|b| {
                    if b.len() > 200 { format!("{}...", &b[..200]) } else { b.clone() }
                }).unwrap_or_else(|| "null".to_string()),
                "has_filename": msg.body.as_ref().and_then(|body| {
                    serde_json::from_str::<serde_json::Value>(body).ok()
                }).map(|json| {
                    json["fileName"].as_str()
                        .map(|name| !name.trim().is_empty())
                        .unwrap_or(false)
                }).unwrap_or(false)
            })
        })
        .collect();

    stats.insert("sample_file_messages".to_string(), serde_json::Value::Array(samples));

    Ok(serde_json::Value::Object(stats))
}
