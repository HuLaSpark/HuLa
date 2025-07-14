use sea_orm::{DatabaseConnection, EntityTrait, IntoActiveModel};
use entity::im_message;
use crate::error::CommonError;

pub async fn save_all(db: &DatabaseConnection, messages: Vec<im_message::Model>) -> Result<(), CommonError>{
    let active_models: Vec<im_message::ActiveModel> = messages.into_iter()
        .map(|message| {
            let msg_active = message.into_active_model();
            msg_active
        })
        .collect();
    im_message::Entity::insert_many(active_models).exec(db).await?;
    Ok(())
}


