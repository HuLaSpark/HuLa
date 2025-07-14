use crate::error::CommonError;
use crate::pojo::common::{CursorPageParam, CursorPageResp};
use anyhow::Context;
use entity::im_message;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};

pub async fn save_all(
    db: &DatabaseConnection,
    messages: Vec<im_message::Model>,
) -> Result<(), CommonError> {
    let active_models: Vec<im_message::ActiveModel> = messages
        .into_iter()
        .map(|message| {
            let msg_active = message.into_active_model();
            msg_active
        })
        .collect();
    im_message::Entity::insert_many(active_models)
        .exec(db)
        .await?;
    Ok(())
}

/// 根据房间ID进行游标分页查询消息
pub async fn cursor_page_messages(
    db: &DatabaseConnection,
    room_id: String,
    cursor_page_param: CursorPageParam,
) -> Result<CursorPageResp<Vec<im_message::Model>>, CommonError> {
    // 查询总数
    let total = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(&room_id))
        .count(db)
        .await
        .with_context(|| "查询消息总数失败")?;

    let mut query = im_message::Entity::find()
        .filter(im_message::Column::RoomId.eq(room_id))
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
