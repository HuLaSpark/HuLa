use crate::error::CommonError;
use entity::im_message_mark;
use sea_orm::{DatabaseTransaction, EntityTrait, IntoActiveModel};

pub async fn save_msg_mark(
    db: &DatabaseTransaction,
    msg_mark: im_message_mark::Model,
) -> Result<(), CommonError> {
    im_message_mark::Entity::insert(msg_mark.into_active_model())
        .exec(db)
        .await?;

    Ok(())
}
