use crate::AppData;
use crate::command::message_command::MessageResp;
use crate::repository::im_message_repository;

use serde::{Deserialize, Serialize};
use std::ops::Deref;
use tauri::State;
use tracing::{error, info};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatHistoryQueryParam {
    pub room_id: String,
    pub message_type: Option<String>, // "all", "image", "file"
    pub search_keyword: Option<String>,
    pub sort_order: Option<String>, // "asc", "desc"
    pub date_range: Option<DateRange>,
    pub pagination: PaginationParam,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DateRange {
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PaginationParam {
    pub page: u32,
    pub page_size: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatHistoryResponse {
    pub messages: Vec<MessageResp>,
    pub has_more: bool,
    pub current_page: u32,
}

/// 查询聊天历史记录的Tauri命令
#[tauri::command]
pub async fn query_chat_history(
    param: ChatHistoryQueryParam,
    state: State<'_, AppData>,
) -> Result<ChatHistoryResponse, String> {
    info!(
        "查询聊天历史记录 - 房间ID: {}, 消息类型: {:?}, 搜索关键词: {:?}, 排序: {:?}, 页码: {}",
        param.room_id,
        param.message_type,
        param.search_keyword,
        param.sort_order,
        param.pagination.page
    );

    // 获取当前登录用户的 uid
    let login_uid = {
        let user_info = state.user_info.lock().await;
        user_info.uid.clone()
    };

    // 构建查询条件
    let query_condition = ChatHistoryQueryCondition {
        room_id: param.room_id.clone(),
        login_uid: login_uid.clone(),
        message_type: parse_message_type(&param.message_type),
        search_keyword: param.search_keyword.clone(),
        sort_order: parse_sort_order(&param.sort_order),
        date_range: param.date_range.clone(),
        pagination: param.pagination.clone(),
    };

    // 查询数据库
    let messages =
        im_message_repository::query_chat_history(state.db_conn.deref(), query_condition)
            .await
            .map_err(|e| {
                error!("查询聊天历史记录失败: {}", e);
                e.to_string()
            })?;

    // 转换为响应格式
    let message_resps: Vec<MessageResp> = messages
        .into_iter()
        .map(|msg| crate::command::message_command::convert_message_to_resp(msg))
        .collect();

    // 根据返回的消息数量判断是否还有更多数据
    let has_more = message_resps.len() >= param.pagination.page_size as usize;

    let response = ChatHistoryResponse {
        messages: message_resps,
        has_more,
        current_page: param.pagination.page,
    };

    Ok(response)
}

/// 内部查询条件结构
#[derive(Debug, Clone)]
pub struct ChatHistoryQueryCondition {
    pub room_id: String,
    pub login_uid: String,
    pub message_type: Option<Vec<u8>>,
    pub search_keyword: Option<String>,
    pub sort_order: SortOrder,
    pub date_range: Option<DateRange>,
    pub pagination: PaginationParam,
}

#[derive(Debug, Clone)]
pub enum SortOrder {
    Asc,
    Desc,
}

/// 解析消息类型筛选条件
fn parse_message_type(message_type: &Option<String>) -> Option<Vec<u8>> {
    match message_type {
        Some(msg_type) => match msg_type.as_str() {
            "image" => {
                // 图片和视频类型的消息类型ID
                // 根据项目实际的消息类型枚举定义这些值
                Some(vec![3, 6]) // 假设3=图片, 6=视频
            }
            "file" => {
                // 文件类型的消息类型ID
                Some(vec![4]) // 假设4=文件
            }
            "all" | _ => None, // 不筛选，返回所有类型
        },
        None => None,
    }
}

/// 解析排序方式
fn parse_sort_order(sort_order: &Option<String>) -> SortOrder {
    match sort_order {
        Some(order) => match order.as_str() {
            "asc" => SortOrder::Asc,
            "desc" | _ => SortOrder::Desc,
        },
        None => SortOrder::Desc, // 默认降序（最新的在前）
    }
}
