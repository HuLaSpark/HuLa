use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use crate::repository::im_user_repository;
use anyhow::Context;
use entity::im_message;
use log::{debug, info};
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set, TransactionTrait,
};

pub async fn save_all(
    db: &DatabaseConnection,
    messages: Vec<im_message::Model>,
    login_uid: &str,
) -> Result<(), CommonError> {
    // SQLite 的变量限制通常是 999，为了安全起见，我们设置批次大小为 100
    // 每个消息大约有 10-15 个字段，所以 100 条消息大约使用 1000-1500 个变量
    const BATCH_SIZE: usize = 100;

    let active_models: Vec<im_message::ActiveModel> = messages
        .into_iter()
        .map(|mut message| {
            message.login_uid = login_uid.to_string();
            let msg_active = message.into_active_model();
            msg_active
        })
        .collect();

    // 使用事务确保消息插入和用户状态更新的原子性
    let txn = db.begin().await.with_context(|| "开始事务失败")?;

    // 如果数据量小于批次大小，直接插入
    if active_models.len() <= BATCH_SIZE {
        if !active_models.is_empty() {
            let count = active_models.len();
            im_message::Entity::insert_many(active_models)
                .exec(&txn)
                .await
                .with_context(|| "批量插入消息失败")?;
            info!("消息插入完成，共 {} 条", count);
        }
    } else {
        // 分批插入
        for (batch_index, chunk) in active_models.chunks(BATCH_SIZE).enumerate() {
            debug!(
                "正在插入第 {} 批消息，共 {} 条",
                batch_index + 1,
                chunk.len()
            );

            im_message::Entity::insert_many(chunk.to_vec())
                .exec(&txn)
                .await
                .with_context(|| format!("插入第 {} 批消息失败", batch_index + 1))?;
        }

        info!("所有消息批量插入完成，总计 {} 条", active_models.len());
    }

    // 消息保存完成后，将用户的 is_init 状态设置为 false
    im_user_repository::update_user_init_status(&txn, login_uid, false)
        .await
        .with_context(|| "更新用户 is_init 状态失败")?;

    // 提交事务
    txn.commit().await.with_context(|| "提交事务失败")?;

    Ok(())
}

/// 根据房间ID进行游标分页查询消息
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
        .with_context(|| "查询消息总数失败")?;

    let mut query = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(room_id))
        .filter(im_message::Column::LoginUid.eq(login_uid))
        .order_by_desc(im_message::Column::Id)
        .limit(cursor_page_param.page_size as u64);

    // 如果提供了游标，添加过滤条件
    if !cursor_page_param.cursor.is_empty() {
        // 使用游标值过滤，获取小于该ID的记录（因为是降序排列）
        query = query.filter(im_message::Column::Id.lt(&cursor_page_param.cursor));
    }

    let messages = query.all(db).await.with_context(|| "查询消息列表失败")?;

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
    })
}

/// 保存单个消息到数据库
pub async fn save_message(
    db: &DatabaseConnection,
    message: im_message::Model,
) -> Result<(), CommonError> {
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
) -> Result<(), CommonError> {
    let mut active_model: im_message::ActiveModel = im_message::Entity::find_by_id(message_id)
        .one(db)
        .await
        .with_context(|| "查找消息失败")?
        .ok_or_else(|| CommonError::UnexpectedError(anyhow::anyhow!("消息不存在")))?
        .into_active_model();

    active_model.send_status = Set(status.to_string());

    if status == "success" {
        active_model.id = Set(id.unwrap());
    }

    im_message::Entity::update_many()
        .set(active_model)
        .filter(im_message::Column::Id.eq(message_id))
        .exec(db)
        .await?;
    Ok(())
}
