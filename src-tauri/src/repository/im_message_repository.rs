use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use chrono::Utc;
use entity::im_message;
use lazy_static::lazy_static;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, Value};
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, DatabaseConnection, DatabaseTransaction, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set, Statement,
    TryIntoModel,
};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

use tracing::{debug, error, info};

lazy_static! {
    static ref DELETED_TABLE_INITIALIZED: AtomicBool = AtomicBool::new(false);
    static ref ROOM_CLEAR_TABLE_INITIALIZED: AtomicBool = AtomicBool::new(false);
}

/// 重置表初始化标志，在切换数据库时调用
pub fn reset_table_initialization_flags() {
    DELETED_TABLE_INITIALIZED.store(false, Ordering::SeqCst);
    ROOM_CLEAR_TABLE_INITIALIZED.store(false, Ordering::SeqCst);
    info!("Table initialization flags have been reset");
}

#[derive(Clone)]
pub struct MessageWithThumbnail {
    pub message: im_message::Model,
    pub thumbnail_path: Option<String>,
}

impl MessageWithThumbnail {
    pub fn new(message: im_message::Model, thumbnail_path: Option<String>) -> Self {
        Self {
            message,
            thumbnail_path,
        }
    }

    pub fn key(&self) -> (String, String) {
        (self.message.id.clone(), self.message.login_uid.clone())
    }
}

impl From<im_message::Model> for MessageWithThumbnail {
    fn from(message: im_message::Model) -> Self {
        Self {
            message,
            thumbnail_path: None,
        }
    }
}

fn parse_message_id(id: &str) -> Option<i64> {
    id.parse::<i64>().ok()
}

async fn ensure_deleted_message_table<C: ConnectionTrait>(conn: &C) -> Result<(), CommonError> {
    if DELETED_TABLE_INITIALIZED.load(Ordering::SeqCst) {
        return Ok(());
    }

    let backend = conn.get_database_backend();
    let stmt = Statement::from_string(
        backend,
        "CREATE TABLE IF NOT EXISTS im_deleted_message (
            id TEXT NOT NULL,
            room_id TEXT NOT NULL,
            login_uid TEXT NOT NULL,
            deleted_at INTEGER NOT NULL,
            PRIMARY KEY (id, login_uid)
        )"
        .to_string(),
    );
    conn.execute(stmt)
        .await
        .map_err(CommonError::DatabaseError)?;
    DELETED_TABLE_INITIALIZED.store(true, Ordering::SeqCst);
    Ok(())
}

async fn ensure_room_clear_table<C: ConnectionTrait>(conn: &C) -> Result<(), CommonError> {
    if ROOM_CLEAR_TABLE_INITIALIZED.load(Ordering::SeqCst) {
        return Ok(());
    }

    let backend = conn.get_database_backend();
    let stmt = Statement::from_string(
        backend,
        "CREATE TABLE IF NOT EXISTS im_room_clear_record (
            room_id TEXT NOT NULL,
            login_uid TEXT NOT NULL,
            cleared_at INTEGER NOT NULL,
            last_cleared_msg_id TEXT,
            PRIMARY KEY (room_id, login_uid)
        )"
        .to_string(),
    );
    conn.execute(stmt)
        .await
        .map_err(CommonError::DatabaseError)?;
    ROOM_CLEAR_TABLE_INITIALIZED.store(true, Ordering::SeqCst);
    Ok(())
}

async fn should_skip_message_insert<C: ConnectionTrait>(
    conn: &C,
    message_id: &str,
    room_id: &str,
    login_uid: &str,
    send_time: Option<i64>,
) -> Result<bool, CommonError> {
    ensure_deleted_message_table(conn).await?;
    let backend = conn.get_database_backend();
    let deleted_stmt = Statement::from_sql_and_values(
        backend,
        "SELECT 1 FROM im_deleted_message WHERE id = ? AND login_uid = ? LIMIT 1",
        vec![
            Value::from(message_id.to_string()),
            Value::from(login_uid.to_string()),
        ],
    );
    if conn.query_one(deleted_stmt).await?.is_some() {
        return Ok(true);
    }

    ensure_room_clear_table(conn).await?;
    let clear_stmt = Statement::from_sql_and_values(
        backend,
        "SELECT cleared_at, last_cleared_msg_id FROM im_room_clear_record WHERE room_id = ? AND login_uid = ? LIMIT 1",
        vec![
            Value::from(room_id.to_string()),
            Value::from(login_uid.to_string()),
        ],
    );

    if let Some(row) = conn.query_one(clear_stmt).await? {
        let cleared_at: i64 = row.try_get("", "cleared_at")?;
        if let Some(send_time) = send_time {
            if send_time <= cleared_at {
                return Ok(true);
            }
        }

        let last_id: Option<String> = row.try_get("", "last_cleared_msg_id")?;
        if let Some(last_id) = last_id {
            if let (Some(current), Ok(threshold)) =
                (parse_message_id(message_id), last_id.parse::<i64>())
            {
                if current <= threshold {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}

fn collect_message_keys(messages: &[MessageWithThumbnail]) -> Vec<(String, String)> {
    messages
        .iter()
        .map(|msg| (msg.message.id.clone(), msg.message.login_uid.clone()))
        .collect()
}

async fn fetch_thumbnail_map<C: ConnectionTrait>(
    conn: &C,
    keys: &[(String, String)],
) -> Result<HashMap<(String, String), String>, CommonError> {
    if keys.is_empty() {
        return Ok(HashMap::new());
    }

    let backend = conn.get_database_backend();
    let mut sql = String::from("SELECT id, login_uid, thumbnail_path FROM im_message WHERE ");
    let mut conditions = Vec::with_capacity(keys.len());
    let mut values = Vec::with_capacity(keys.len() * 2);

    for (id, login_uid) in keys {
        conditions.push("(id = ? AND login_uid = ?)");
        values.push(Value::from(id.clone()));
        values.push(Value::from(login_uid.clone()));
    }

    sql.push_str(&conditions.join(" OR "));

    let stmt = Statement::from_sql_and_values(backend, sql, values);
    let rows = conn.query_all(stmt).await?;

    let mut map = HashMap::new();
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let login_uid: String = row.try_get("", "login_uid")?;
        let path: Option<String> = row.try_get("", "thumbnail_path")?;
        if let Some(path) = path {
            map.insert((id, login_uid), path);
        }
    }

    Ok(map)
}

async fn fetch_thumbnail_path<C: ConnectionTrait>(
    conn: &C,
    id: &str,
    login_uid: &str,
) -> Result<Option<String>, CommonError> {
    let backend = conn.get_database_backend();
    let stmt = Statement::from_sql_and_values(
        backend,
        "SELECT thumbnail_path FROM im_message WHERE id = ? AND login_uid = ? LIMIT 1",
        vec![
            Value::from(id.to_string()),
            Value::from(login_uid.to_string()),
        ],
    );

    if let Some(row) = conn.query_one(stmt).await? {
        let path: Option<String> = row.try_get("", "thumbnail_path")?;
        Ok(path)
    } else {
        Ok(None)
    }
}

async fn update_thumbnail_path<C: ConnectionTrait>(
    conn: &C,
    key: &(String, String),
    path: Option<&str>,
) -> Result<(), CommonError> {
    let backend = conn.get_database_backend();
    let value = match path {
        Some(p) => Value::from(p.to_string()),
        None => Value::String(None),
    };

    let stmt = Statement::from_sql_and_values(
        backend,
        "UPDATE im_message SET thumbnail_path = ? WHERE id = ? AND login_uid = ?",
        vec![
            value,
            Value::from(key.0.clone()),
            Value::from(key.1.clone()),
        ],
    );

    conn.execute(stmt).await?;
    Ok(())
}

async fn enrich_models_with_thumbnails<C: ConnectionTrait>(
    conn: &C,
    messages: Vec<im_message::Model>,
) -> Result<Vec<MessageWithThumbnail>, CommonError> {
    if messages.is_empty() {
        return Ok(vec![]);
    }

    let keys: Vec<(String, String)> = messages
        .iter()
        .map(|msg| (msg.id.clone(), msg.login_uid.clone()))
        .collect();

    let thumbnail_map = fetch_thumbnail_map(conn, &keys).await?;
    let enriched = messages
        .into_iter()
        .map(|message| {
            let key = (message.id.clone(), message.login_uid.clone());
            let path = thumbnail_map.get(&key).cloned();
            MessageWithThumbnail::new(message, path)
        })
        .collect();

    Ok(enriched)
}

pub async fn save_all<C>(db: &C, messages: Vec<MessageWithThumbnail>) -> Result<(), CommonError>
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

async fn save_all_internal<C>(
    db: &C,
    messages: Vec<MessageWithThumbnail>,
) -> Result<(), CommonError>
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
    messages: Vec<MessageWithThumbnail>,
) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    if messages.is_empty() {
        return Ok(());
    }

    let mut filtered_messages = Vec::with_capacity(messages.len());
    for message in messages.into_iter() {
        let skip = should_skip_message_insert(
            db,
            &message.message.id,
            &message.message.room_id,
            &message.message.login_uid,
            message.message.send_time,
        )
        .await?;
        if !skip {
            filtered_messages.push(message);
        }
    }

    if filtered_messages.is_empty() {
        return Ok(());
    }

    let mut messages = filtered_messages;

    let message_keys = collect_message_keys(&messages);
    let existing_thumbnail_map = fetch_thumbnail_map(db, &message_keys).await?;

    for message in &mut messages {
        if message.thumbnail_path.is_none() {
            if let Some(path) = existing_thumbnail_map.get(&message.key()) {
                message.thumbnail_path = Some(path.clone());
            }
        }
    }

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

    if !existing_messages.is_empty() {
        let mut delete_condition = sea_orm::Condition::any();
        for msg in &existing_messages {
            delete_condition = delete_condition.add(
                sea_orm::Condition::all()
                    .add(im_message::Column::Id.eq(msg.id.clone()))
                    .add(im_message::Column::LoginUid.eq(msg.login_uid.clone())),
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
        .iter()
        .map(|message| message.message.clone().into_active_model())
        .collect();

    im_message::Entity::insert_many(active_models)
        .exec(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to batch insert messages: {}", e))?;

    for message in &messages {
        update_thumbnail_path(db, &message.key(), message.thumbnail_path.as_deref()).await?;
    }

    Ok(())
}

/// 根据房间ID进行游标分页查询消息（包含消息标记）
pub async fn cursor_page_messages(
    db: &DatabaseConnection,
    room_id: String,
    cursor_page_param: CursorPageParam,
    login_uid: &str,
) -> Result<CursorPageResp<Vec<MessageWithThumbnail>>, CommonError> {
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

    let enriched = enrich_models_with_thumbnails(db, messages).await?;

    Ok(CursorPageResp {
        cursor: next_cursor,
        is_last,
        list: Some(enriched),
        total,
    })
}

/// 保存单个消息到数据库
pub async fn save_message(
    db: &DatabaseTransaction,
    mut record: MessageWithThumbnail,
) -> Result<MessageWithThumbnail, CommonError> {
    if should_skip_message_insert(
        db,
        &record.message.id,
        &record.message.room_id,
        &record.message.login_uid,
        record.message.send_time,
    )
    .await?
    {
        return Ok(record);
    }

    // 根据消息主键查找是否已存在
    let existing_message = im_message::Entity::find_by_id((
        record.message.id.clone(),
        record.message.login_uid.clone(),
    ))
    .one(db)
    .await
    .map_err(|e| anyhow::anyhow!("Failed to find message: {}", e))?;

    if record.thumbnail_path.is_none() {
        record.thumbnail_path =
            fetch_thumbnail_path(db, &record.message.id, &record.message.login_uid).await?;
    }

    // 如果已存在，则先删除
    if existing_message.is_some() {
        im_message::Entity::delete_by_id((
            record.message.id.clone(),
            record.message.login_uid.clone(),
        ))
        .exec(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to delete existing message: {}", e))?;
    }

    // 如果缺少，就填充time_block，使用统一的计算函数
    if record.message.time_block.is_none() {
        if let Some(current_send_time) = record.message.send_time {
            // 使用统一的 time_block 计算函数
            record.message.time_block = calculate_time_block(
                db,
                &record.message.room_id,
                &record.message.id,
                current_send_time,
                &record.message.login_uid,
            )
            .await?;
        }
    }

    let active_model = record.message.clone().into_active_model();
    im_message::Entity::insert(active_model).exec(db).await?;
    update_thumbnail_path(db, &record.key(), record.thumbnail_path.as_deref()).await?;
    Ok(record)
}

pub async fn delete_message_by_id(
    db: &DatabaseConnection,
    message_id: &str,
    login_uid: &str,
) -> Result<u64, CommonError> {
    let result = im_message::Entity::delete_many()
        .filter(im_message::Column::Id.eq(message_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .exec(db)
        .await?;

    Ok(result.rows_affected)
}

pub async fn delete_messages_by_room(
    db: &DatabaseConnection,
    room_id: &str,
    login_uid: &str,
) -> Result<u64, CommonError> {
    let result = im_message::Entity::delete_many()
        .filter(im_message::Column::RoomId.eq(room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .exec(db)
        .await?;

    Ok(result.rows_affected)
}

pub async fn get_room_max_message_id(
    db: &DatabaseConnection,
    room_id: &str,
    login_uid: &str,
) -> Result<Option<String>, CommonError> {
    let backend = db.get_database_backend();
    let stmt = Statement::from_sql_and_values(
        backend,
        "SELECT MAX(CAST(id AS INTEGER)) as max_id FROM im_message WHERE room_id = ? AND login_uid = ?",
        vec![
            Value::from(room_id.to_string()),
            Value::from(login_uid.to_string()),
        ],
    );

    if let Some(row) = db.query_one(stmt).await? {
        let max_id: Option<i64> = row.try_get("", "max_id")?;
        Ok(max_id.map(|id| id.to_string()))
    } else {
        Ok(None)
    }
}

pub async fn get_room_id_by_message_id(
    db: &DatabaseConnection,
    message_id: &str,
    login_uid: &str,
) -> Result<Option<String>, CommonError> {
    let message = im_message::Entity::find_by_id((message_id.to_string(), login_uid.to_string()))
        .one(db)
        .await?;

    Ok(message.map(|model| model.room_id))
}

pub async fn record_deleted_message(
    db: &DatabaseConnection,
    message_id: &str,
    room_id: &str,
    login_uid: &str,
) -> Result<(), CommonError> {
    ensure_deleted_message_table(db).await?;
    let backend = db.get_database_backend();
    let stmt = Statement::from_sql_and_values(
        backend,
        "INSERT INTO im_deleted_message (id, room_id, login_uid, deleted_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id, login_uid) DO UPDATE SET room_id = excluded.room_id, deleted_at = excluded.deleted_at",
        vec![
            Value::from(message_id.to_string()),
            Value::from(room_id.to_string()),
            Value::from(login_uid.to_string()),
            Value::from(Utc::now().timestamp_millis()),
        ],
    );
    db.execute(stmt).await.map_err(CommonError::DatabaseError)?;
    Ok(())
}

pub async fn record_room_clear(
    db: &DatabaseConnection,
    room_id: &str,
    login_uid: &str,
    last_cleared_msg_id: Option<String>,
) -> Result<(), CommonError> {
    ensure_room_clear_table(db).await?;
    let backend = db.get_database_backend();
    let stmt = Statement::from_sql_and_values(
        backend,
        "INSERT INTO im_room_clear_record (room_id, login_uid, cleared_at, last_cleared_msg_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(room_id, login_uid) DO UPDATE SET cleared_at = excluded.cleared_at, last_cleared_msg_id = excluded.last_cleared_msg_id",
        vec![
            Value::from(room_id.to_string()),
            Value::from(login_uid.to_string()),
            Value::from(Utc::now().timestamp_millis()),
            match last_cleared_msg_id {
                Some(id) => Value::from(id),
                None => Value::String(None),
            },
        ],
    );
    db.execute(stmt).await.map_err(CommonError::DatabaseError)?;
    Ok(())
}

/// 计算消息的 time_block
/// 判断当前消息与前一条消息的时间间隔，如果超过10分钟则返回间隔值
/// 如果是房间的第一条消息，返回 Some(1) 表示始终显示时间
pub async fn calculate_time_block<C>(
    db: &C,
    room_id: &str,
    current_msg_id: &str,
    current_send_time: i64,
    login_uid: &str,
) -> Result<Option<i64>, CommonError>
where
    C: ConnectionTrait,
{
    // 查找该房间的前一条消息（按发送时间排序，排除当前消息）
    let last_message = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .filter(im_message::Column::Id.ne(current_msg_id))
        .filter(im_message::Column::SendTime.lt(current_send_time)) // 按发送时间比较
        .order_by_desc(im_message::Column::SendTime) // 按发送时间降序
        .limit(1)
        .one(db)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to find last message: {}", e))?;

    if let Some(last_msg) = last_message {
        if let Some(last_send_time) = last_msg.send_time {
            let time_diff = current_send_time - last_send_time;
            // 时间间隔阈值：10分钟
            const TIME_BLOCK_THRESHOLD_MS: i64 = 1000 * 60 * 10;
            if time_diff >= TIME_BLOCK_THRESHOLD_MS {
                return Ok(Some(time_diff));
            }
        }
    } else {
        // 房间的第一条消息，始终显示时间
        return Ok(Some(1));
    }

    Ok(None)
}

/// 更新消息发送状态
pub async fn update_message_status(
    db: &DatabaseConnection,
    mut record: MessageWithThumbnail,
    status: &str,
    id: Option<String>,
    login_uid: String,
) -> Result<MessageWithThumbnail, CommonError> {
    let mut active_model: im_message::ActiveModel =
        im_message::Entity::find_by_id((record.message.id.clone(), login_uid.clone()))
            .one(db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to find message: {}", e))?
            .ok_or_else(|| CommonError::UnexpectedError(anyhow::anyhow!("Message not found")))?
            .into_active_model();

    // 使用统一的 time_block 计算函数
    if let Some(send_time) = record.message.send_time {
        let time_block = calculate_time_block(
            db,
            &record.message.room_id,
            &record.message.id,
            send_time,
            &login_uid,
        )
        .await?;

        active_model.time_block = Set(time_block);
    }

    active_model.send_status = Set(status.to_string());
    active_model.body = Set(record.message.body.clone());

    let original_id = record.message.id.clone();

    if status == "success" {
        if let Some(message_id) = id {
            active_model.id = Set(message_id.clone());
            record.message.id = message_id;
        } else {
            return Err(CommonError::RequestError(
                "Message ID is None for successful status".to_string(),
            ));
        }
    }

    im_message::Entity::update_many()
        .set(active_model.clone())
        .filter(im_message::Column::Id.eq(original_id))
        .exec(db)
        .await?;

    let updated_model = active_model.try_into_model()?;
    record.message = updated_model;
    update_thumbnail_path(db, &record.key(), record.thumbnail_path.as_deref()).await?;
    Ok(record)
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
        "[RECALL] Updating message recall status in database, message_id: {}",
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
        "[RECALL] Successfully updated message recall status in database, message_id: {}",
        message_id
    );
    Ok(())
}

/// 支持消息类型筛选、关键词搜索、日期排序和分页
pub async fn query_chat_history(
    db: &DatabaseConnection,
    condition: crate::command::chat_history_command::ChatHistoryQueryCondition,
) -> Result<Vec<MessageWithThumbnail>, CommonError> {
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

    enrich_models_with_thumbnails(db, messages).await
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
) -> Result<Vec<MessageWithThumbnail>, CommonError> {
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

    enrich_models_with_thumbnails(db, messages).await
}
