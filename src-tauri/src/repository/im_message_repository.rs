use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use entity::im_message;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, Value};
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, DatabaseConnection, DatabaseTransaction, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set, TryIntoModel,
};

use tracing::{debug, error, info};

pub async fn save_all<C>(db: &C, messages: Vec<im_message::Model>) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    // 为批量数据库操作添加超时机制
    let timeout_duration = tokio::time::Duration::from_secs(120); // 2分钟超时

    match tokio::time::timeout(timeout_duration, save_all_internal(db, messages)).await {
        Ok(result) => result,
        Err(_) => {
            error!("Batch save messages timeout");
            Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "Batch save messages operation timeout, please check database connection status"
            )))
        }
    }
}

async fn save_all_internal<C>(db: &C, messages: Vec<im_message::Model>) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    // SQLite 的变量限制通常是 999，为了安全起见，我们设置批次大小为 50
    // 考虑到需要先查询再删除再插入，减少批次大小以避免变量限制
    const BATCH_SIZE: usize = 50;

    // 如果数据量小于批次大小，直接处理
    if messages.len() <= BATCH_SIZE {
        if !messages.is_empty() {
            let count = messages.len();
            process_message_batch(db, messages).await?;
            info!("Message processing completed, total {} items", count);
        }
    } else {
        // 分批处理
        for (batch_index, chunk) in messages.chunks(BATCH_SIZE).enumerate() {
            info!(
                "Processing batch {} of messages, total {} items",
                batch_index + 1,
                chunk.len()
            );

            process_message_batch(db, chunk.to_vec())
                .await
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to process batch {} of messages: {}",
                        batch_index + 1,
                        e
                    )
                })?;
        }

        info!(
            "All message batch processing completed, total {} items",
            messages.len()
        );
    }
    Ok(())
}

/// 处理单批消息：检查存在性，删除已存在的，然后插入新的
async fn process_message_batch<C>(
    db: &C,
    messages: Vec<im_message::Model>,
) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    if messages.is_empty() {
        return Ok(());
    }

    // 收集所有消息的主键用于查询
    let message_keys: Vec<(String, String)> = messages
        .iter()
        .map(|msg| (msg.id.clone(), msg.login_uid.clone()))
        .collect();

    // 查询已存在的消息
    let mut condition = sea_orm::Condition::any();
    for (id, login_uid) in &message_keys {
        condition = condition.add(
            sea_orm::Condition::all()
                .add(im_message::Column::Id.eq(id.clone()))
                .add(im_message::Column::LoginUid.eq(login_uid.clone())),
        );
    }

    let existing_messages = im_message::Entity::find()
        .filter(condition)
        .all(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query existing messages: {}", e))?;

    // 如果有已存在的消息，先删除它们
    if !existing_messages.is_empty() {
        let existing_keys: Vec<(String, String)> = existing_messages
            .iter()
            .map(|msg| (msg.id.clone(), msg.login_uid.clone()))
            .collect();

        let mut delete_condition = sea_orm::Condition::any();
        for (id, login_uid) in &existing_keys {
            delete_condition = delete_condition.add(
                sea_orm::Condition::all()
                    .add(im_message::Column::Id.eq(id.clone()))
                    .add(im_message::Column::LoginUid.eq(login_uid.clone())),
            );
        }

        im_message::Entity::delete_many()
            .filter(delete_condition)
            .exec(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to delete existing messages: {}", e))?;

        debug!("Deleted {} existing messages", existing_messages.len());
    }

    // 插入新消息
    let active_models: Vec<im_message::ActiveModel> = messages
        .into_iter()
        .map(|message| message.into_active_model())
        .collect();

    im_message::Entity::insert_many(active_models)
        .exec(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to batch insert messages: {}", e))?;

    Ok(())
}

/// 根据房间ID进行游标分页查询消息（包含消息标记）
pub async fn cursor_page_messages(
    db: &DatabaseConnection,
    room_id: String,
    cursor_page_param: CursorPageParam,
    login_uid: &str,
) -> Result<CursorPageResp<Vec<im_message::Model>>, CommonError> {
    // 查询总数
    let total = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(&room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .count(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query message count: {}", e))?;

    // 先查询消息主表，按 id 数值降序排序
    let mut message_query = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(&room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .order_by_desc(Expr::col(im_message::Column::Id).cast_as(Alias::new("INTEGER")))
        .limit(cursor_page_param.page_size as u64);

    // 如果提供了游标，添加过滤条件
    if !cursor_page_param.cursor.is_empty() {
        // 使用游标值过滤，获取小于该ID的记录（因为是降序排列）
        message_query = message_query.filter(im_message::Column::Id.lt(&cursor_page_param.cursor));
    }

    // 先查询消息列表
    let messages = message_query
        .all(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to query message list: {}", e))?;

    // 如果没有消息，直接返回空结果
    if messages.is_empty() {
        return Ok(CursorPageResp {
            cursor: String::new(),
            is_last: true,
            list: Some(vec![]),
            total,
            ordered: None,
        });
    }

    // 生成下一页的游标
    let next_cursor = if messages.len() < cursor_page_param.page_size as usize {
        String::new() // 已经是最后一页
    } else {
        messages
            .last()
            .map(|msg| msg.id.clone())
            .unwrap_or_default()
    };

    let is_last = messages.len() < cursor_page_param.page_size as usize;

    Ok(CursorPageResp {
        cursor: next_cursor,
        is_last,
        list: Some(messages),
        total,
        ordered: None,
    })
}

/// 保存单个消息到数据库
pub async fn save_message(
    db: &DatabaseTransaction,
    mut message: im_message::Model,
) -> Result<(), CommonError> {
    // 根据消息主键查找是否已存在
    let existing_message =
        im_message::Entity::find_by_id((message.id.clone(), message.login_uid.clone()))
            .one(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to find message: {}", e))?;

    // 如果已存在，则先删除
    if existing_message.is_some() {
        im_message::Entity::delete_by_id((message.id.clone(), message.login_uid.clone()))
            .exec(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to delete existing message: {}", e))?;
    }

    // 如果缺少，就填充time_block，以便为转发等消息类型呈现时间戳块
    if message.time_block.is_none() {
        if let Some(current_send_time) = message.send_time {
            let last_message = im_message::Entity::find()
                .filter(im_message::Column::RoomId.eq(message.room_id.clone()))
                .filter(im_message::Column::LoginUid.eq(message.login_uid.clone()))
                .filter(im_message::Column::SendTime.lt(current_send_time))
                .order_by_desc(Expr::col(im_message::Column::SendTime))
                .order_by_desc(Expr::col(im_message::Column::Id).cast_as(Alias::new("INTEGER")))
                .limit(1)
                .one(db)
                .await
                .map_err(|e| anyhow::anyhow!("Failed to query last message: {}", e))?;

            if let Some(last_message) = last_message {
                if let Some(last_send_time) = last_message.send_time {
                    if current_send_time - last_send_time >= 1000 * 60 * 15 {
                        message.time_block = Some(current_send_time - last_send_time);
                    }
                }
            }
        }
    }

    // 插入新消息
    let active_model = message.into_active_model();
    im_message::Entity::insert(active_model).exec(db).await?;
    Ok(())
}

/// 更新消息发送状态
pub async fn update_message_status(
    db: &DatabaseConnection,
    message: im_message::Model,
    status: &str,
    id: Option<String>,
    login_uid: String,
) -> Result<im_message::Model, CommonError> {
    let mut active_model: im_message::ActiveModel =
        im_message::Entity::find_by_id((message.id.clone(), login_uid))
            .one(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to find message: {}", e))?
            .ok_or_else(|| CommonError::UnexpectedError(anyhow::anyhow!("Message not found")))?
            .into_active_model();

    // 设置 time_block
    if message.id.starts_with('T') {
        info!("check msg sendTime");
        // 查找该房间的最后一条消息
        let last_message = im_message::Entity::find()
            .filter(im_message::Column::RoomId.eq(&message.room_id))
            .filter(im_message::Column::LoginUid.eq(message.login_uid.clone()))
            .filter(im_message::Column::Id.ne(&message.id))
            .order_by_desc(im_message::Column::Id)
            .limit(1)
            .one(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to find last message: {}", e))?;

        if let Some(last_message) = last_message {
            // 比较时间戳
            if let (Some(last_send_time), Some(send_time)) =
                (last_message.send_time, message.send_time)
            {
                if send_time - last_send_time >= 1000 * 60 * 15 {
                    active_model.time_block = Set(Some(send_time - last_send_time));
                }
            }
        }
    }

    active_model.send_status = Set(status.to_string());
    active_model.body = Set(message.body.clone());

    if status == "success" {
        if let Some(message_id) = id {
            active_model.id = Set(message_id);
        } else {
            return Err(CommonError::RequestError(
                "Message ID is None for successful status".to_string(),
            ));
        }
    }

    im_message::Entity::update_many()
        .set(active_model.clone())
        .filter(im_message::Column::Id.eq(message.id))
        .exec(db)
        .await?;
    Ok(active_model.try_into_model()?)
}

/// 更新消息撤回状态
pub async fn update_message_recall_status(
    db: &DatabaseConnection,
    message_id: &str,
    message_type: u8,
    message_body: &str,
    login_uid: &str,
) -> Result<(), CommonError> {
    info!(
        "🔄 [RECALL] Updating message recall status in database, message_id: {}",
        message_id
    );

    // 查找要更新的消息
    let existing_message = im_message::Entity::find()
        .filter(im_message::Column::Id.eq(message_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to find message: {}", e))?;

    let message = existing_message
        .ok_or_else(|| CommonError::UnexpectedError(anyhow::anyhow!("Message not found")))?;

    // 创建更新模型
    let mut active_model: im_message::ActiveModel = message.into_active_model();

    // 更新消息类型和内容
    active_model.message_type = Set(Some(message_type));
    active_model.body = Set(Some(message_body.to_string()));
    active_model.update_time = Set(Some(chrono::Utc::now().timestamp_millis()));

    // 执行更新
    im_message::Entity::update(active_model)
        .exec(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to update message recall status: {}", e))?;

    info!(
        "✅ [RECALL] Successfully updated message recall status in database, message_id: {}",
        message_id
    );
    Ok(())
}

/// 支持消息类型筛选、关键词搜索、日期排序和分页
pub async fn query_chat_history(
    db: &DatabaseConnection,
    condition: crate::command::chat_history_command::ChatHistoryQueryCondition,
) -> Result<Vec<im_message::Model>, CommonError> {
    info!(
        "查询聊天历史记录 - 房间: {}, 类型: {:?}, 关键词: {:?}",
        condition.room_id, condition.message_type, condition.search_keyword
    );

    // 构建基础查询条件
    let mut conditions = Condition::all()
        .add(im_message::Column::LoginUid.eq(&condition.login_uid))
        .add(im_message::Column::RoomId.eq(&condition.room_id));

    // 消息类型筛选
    if let Some(ref message_types) = condition.message_type {
        let type_condition = message_types
            .iter()
            .fold(Condition::any(), |acc, &msg_type| {
                acc.add(im_message::Column::MessageType.eq(msg_type))
            });
        conditions = conditions.add(type_condition);
    }

    // 关键词搜索（支持消息内容与文件名等字段）
    if let Some(ref keyword) = condition.search_keyword {
        let trimmed = keyword.trim();
        if !trimmed.is_empty() {
            let keyword_pattern = format!("%{}%", trimmed);
            let keyword_pattern_lower = format!("%{}%", trimmed.to_lowercase());

            let mut keyword_condition = Condition::any();
            for json_path in ["$.content", "$.fileName", "$.url"] {
                keyword_condition = keyword_condition.add(Expr::cust_with_values(
                    &format!("JSON_EXTRACT(body, '{}') LIKE ?", json_path),
                    [Value::from(keyword_pattern.clone())],
                ));
            }

            keyword_condition = keyword_condition.add(Expr::cust_with_values(
                "LOWER(body) LIKE ?",
                [Value::from(keyword_pattern_lower)],
            ));

            conditions = conditions.add(keyword_condition);
        }
    }

    // 日期范围筛选
    if let Some(ref date_range) = condition.date_range {
        if let Some(start_time) = date_range.start_time {
            chrono::DateTime::from_timestamp_millis(start_time)
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                .unwrap_or_else(|| "无效时间".to_string());
            conditions = conditions.add(im_message::Column::SendTime.gte(start_time));
        }
        if let Some(end_time) = date_range.end_time {
            chrono::DateTime::from_timestamp_millis(end_time)
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                .unwrap_or_else(|| "无效时间".to_string());
            conditions = conditions.add(im_message::Column::SendTime.lte(end_time));
        }
    }

    // 构建分页查询
    let mut query = im_message::Entity::find().filter(conditions);

    // 应用排序
    query = match condition.sort_order {
        crate::command::chat_history_command::SortOrder::Asc => {
            query.order_by_asc(im_message::Column::SendTime)
        }
        crate::command::chat_history_command::SortOrder::Desc => {
            query.order_by_desc(im_message::Column::SendTime)
        }
    };

    // 应用分页
    let offset = (condition.pagination.page.saturating_sub(1)) * condition.pagination.page_size;
    query = query
        .offset(offset as u64)
        .limit(condition.pagination.page_size as u64);

    // 执行查询
    let messages = query
        .all(db)
        .await
        .map_err(|e| anyhow::anyhow!("查询聊天历史记录失败: {}", e))?;

    Ok(messages)
}

/// 专门用于文件管理的查询函数，支持跨房间查询文件类型消息
pub async fn query_file_messages(
    db: &DatabaseConnection,
    login_uid: &str,
    room_id: Option<&str>,
    message_types: Option<&[u8]>,
    search_keyword: Option<&str>,
    page: u32,
    page_size: u32,
) -> Result<Vec<im_message::Model>, CommonError> {
    // 构建基础查询条件
    let mut conditions = Condition::all().add(im_message::Column::LoginUid.eq(login_uid));

    // 房间ID筛选（如果提供）
    if let Some(room_id) = room_id {
        conditions = conditions.add(im_message::Column::RoomId.eq(room_id));
    }

    // 消息类型筛选
    if let Some(message_types) = message_types {
        let type_condition = message_types
            .iter()
            .fold(Condition::any(), |acc, &msg_type| {
                acc.add(im_message::Column::MessageType.eq(msg_type))
            });
        conditions = conditions.add(type_condition);
    }

    // 关键词搜索（搜索文件名、来源等关键信息）
    if let Some(keyword) = search_keyword {
        let trimmed_keyword = keyword.trim();
        if !trimmed_keyword.is_empty() {
            let keyword_lower = trimmed_keyword.to_lowercase();
            let keyword_pattern = format!("%{}%", keyword_lower);
            use sea_orm::sea_query::Value;

            let json_paths = [
                "$.fileName",
                "$.file_name",
                "$.name",
                "$.originalFileName",
                "$.originalName",
                "$.original_name",
                "$.title",
                "$.fileTitle",
                "$.url",
                "$.downloadUrl",
                "$.content",
            ];

            let mut keyword_condition = Condition::any();

            for path in json_paths {
                let expr = format!("LOWER(JSON_EXTRACT(body, '{}')) LIKE ?", path);
                keyword_condition = keyword_condition.add(Expr::cust_with_values(
                    expr,
                    [Value::from(keyword_pattern.clone())],
                ));
            }

            // 兼容 JSON 中缺少字段时直接在 body 中检索
            keyword_condition = keyword_condition.add(Expr::cust_with_values(
                "LOWER(body) LIKE ?",
                [Value::from(keyword_pattern.clone())],
            ));

            conditions = conditions.add(keyword_condition);
        }
    }

    // 构建分页查询
    let mut query = im_message::Entity::find().filter(conditions);

    // 按发送时间降序排序
    query = query.order_by_desc(im_message::Column::SendTime);

    // 应用分页
    let offset = (page.saturating_sub(1)) * page_size;
    query = query.offset(offset as u64).limit(page_size as u64);

    // 执行查询
    let messages = query
        .all(db)
        .await
        .map_err(|e| anyhow::anyhow!("查询文件消息失败: {}", e))?;

    Ok(messages)
}
