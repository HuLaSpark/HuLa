use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use anyhow::Context;
use entity::{im_message, im_message_mark};
use log::{debug, info};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DatabaseTransaction, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use std::collections::HashMap;

pub async fn save_all<C>(db: &C, messages: Vec<im_message::Model>) -> Result<(), CommonError>
where
    C: ConnectionTrait,
{
    // 为批量数据库操作添加超时机制
    let timeout_duration = tokio::time::Duration::from_secs(120); // 2分钟超时

    match tokio::time::timeout(timeout_duration, save_all_internal(db, messages)).await {
        Ok(result) => result,
        Err(_) => {
            log::error!("批量保存消息超时");
            Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "批量保存消息操作超时，请检查数据库连接状态"
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
            info!("消息处理完成，共 {} 条", count);
        }
    } else {
        // 分批处理
        for (batch_index, chunk) in messages.chunks(BATCH_SIZE).enumerate() {
            info!(
                "正在处理第 {} 批消息，共 {} 条",
                batch_index + 1,
                chunk.len()
            );

            process_message_batch(db, chunk.to_vec())
                .await
                .with_context(|| format!("处理第 {} 批消息失败", batch_index + 1))?;
        }

        info!("所有消息批量处理完成，总计 {} 条", messages.len());
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
        .with_context(|| "查询已存在消息失败")?;

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
            .with_context(|| "删除已存在消息失败")?;

        debug!("删除了 {} 条已存在的消息", existing_messages.len());
    }

    // 插入新消息
    let active_models: Vec<im_message::ActiveModel> = messages
        .into_iter()
        .map(|message| message.into_active_model())
        .collect();

    im_message::Entity::insert_many(active_models)
        .exec(db)
        .await
        .with_context(|| "批量插入消息失败")?;

    Ok(())
}

/// 根据房间ID进行游标分页查询消息（包含消息标记）
pub async fn cursor_page_messages(
    db: &DatabaseConnection,
    room_id: String,
    cursor_page_param: CursorPageParam,
    login_uid: &str,
) -> Result<CursorPageResp<Vec<(im_message::Model, Vec<im_message_mark::Model>)>>, CommonError> {
    // 查询总数
    let total = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(&room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .count(db)
        .await
        .with_context(|| "查询消息总数失败")?;

    // 先查询消息主表，只按 id 降序排序
    let mut message_query = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(&room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .order_by_desc(im_message::Column::Id)
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
        .with_context(|| "查询消息列表失败")?;

    // 如果没有消息，直接返回空结果
    if messages.is_empty() {
        return Ok(CursorPageResp {
            cursor: String::new(),
            is_last: true,
            list: Some(vec![]),
            total,
        });
    }

    // 收集消息ID用于查询消息标记
    let message_ids: Vec<String> = messages.iter().map(|msg| msg.id.clone()).collect();

    // 查询这些消息的标记
    let mut mark_condition = sea_orm::Condition::any();
    for msg_id in &message_ids {
        mark_condition = mark_condition.add(im_message_mark::Column::MsgId.eq(msg_id.clone()));
    }

    let marks_query = im_message_mark::Entity::find()
        .filter(mark_condition)
        .filter(im_message_mark::Column::LoginUid.eq(login_uid));

    let marks = marks_query.all(db).await?;

    // 将标记按消息ID分组
    let mut marks_map: HashMap<String, Vec<im_message_mark::Model>> = HashMap::new();
    for mark in marks {
        marks_map
            .entry(mark.msg_id.clone())
            .or_insert_with(Vec::new)
            .push(mark);
    }

    // 组合消息和标记
    let messages_with_marks: Vec<(im_message::Model, Vec<im_message_mark::Model>)> = messages
        .into_iter()
        .map(|msg| {
            let msg_marks = marks_map.remove(&msg.id).unwrap_or_default();
            (msg, msg_marks)
        })
        .collect();

    // 生成下一页的游标
    let next_cursor = if messages_with_marks.len() < cursor_page_param.page_size as usize {
        String::new() // 已经是最后一页
    } else {
        messages_with_marks
            .last()
            .map(|(msg, _)| msg.id.clone())
            .unwrap_or_default()
    };

    let is_last = messages_with_marks.len() < cursor_page_param.page_size as usize;

    Ok(CursorPageResp {
        cursor: next_cursor,
        is_last,
        list: Some(messages_with_marks),
        total,
    })
}

/// 保存单个消息到数据库
pub async fn save_message(
    db: &DatabaseTransaction,
    message: im_message::Model,
) -> Result<(), CommonError> {
    // 根据消息主键查找是否已存在
    let existing_message =
        im_message::Entity::find_by_id((message.id.clone(), message.login_uid.clone()))
            .one(db)
            .await
            .with_context(|| "查找消息失败")?;

    // 如果已存在，则先删除
    if existing_message.is_some() {
        im_message::Entity::delete_by_id((message.id.clone(), message.login_uid.clone()))
            .exec(db)
            .await
            .with_context(|| "删除已存在消息失败")?;
    }

    // 插入新消息
    let active_model = message.into_active_model();
    im_message::Entity::insert(active_model).exec(db).await?;
    Ok(())
}

/// 更新消息发送状态
pub async fn update_message_status(
    db: &DatabaseConnection,
    message_id: &str,
    status: &str,
    id: Option<String>,
    login_uid: String,
) -> Result<(), CommonError> {
    let mut active_model: im_message::ActiveModel =
        im_message::Entity::find_by_id((message_id.to_string(), login_uid))
            .one(db)
            .await
            .with_context(|| "查找消息失败")?
            .ok_or_else(|| CommonError::UnexpectedError(anyhow::anyhow!("消息不存在")))?
            .into_active_model();

    active_model.send_status = Set(status.to_string());

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
        .set(active_model)
        .filter(im_message::Column::Id.eq(message_id))
        .exec(db)
        .await?;
    Ok(())
}
