use crate::AppData;
use entity::im_room_member;
use sea_orm::{ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter};
use std::ops::Deref;
use tauri::State;

#[tauri::command]
pub async fn save_room_member(
    room_member: String,
    room_id: String,
    state: State<'_, AppData>,
) -> Result<(), String> {
    let db = state.db_conn.clone();
    let room_members: Vec<im_room_member::Model> = serde_json::from_str(&room_member).unwrap();

    let uids: Vec<_> = room_members
        .iter()
        .filter(|room_member| room_member.uid.is_some())
        .map(|room_member| room_member.uid.clone().unwrap())
        .collect();
    
    let exist_data = im_room_member::Entity::find()
        .filter(im_room_member::Column::RoomId.eq(&room_id))
        .filter(im_room_member::Column::Uid.is_in(&uids))
        .all(db.deref())
        .await
        .map_err(|err| err.to_string())?;
    
    if exist_data.len() > 0 {
        im_room_member::Entity::delete_many()
            .filter(im_room_member::Column::RoomId.eq(&room_id))
            .filter(im_room_member::Column::Uid.is_in(&uids))
            .exec(db.deref())
            .await
            .map_err(|err| err.to_string())?;
    }

    let active_models: Vec<im_room_member::ActiveModel> = room_members.into_iter().map(|room_member| {
        let entity = room_member.clone().into_active_model();
        entity
    }).collect();
    
    im_room_member::Entity::insert_many(active_models).exec(db.deref()).await
        .map_err(|err| err.to_string())?;

    Ok(())
}
