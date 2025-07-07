use anyhow::Context;
use sea_orm::QueryFilter;
use sea_orm::ColumnTrait;
use sea_orm::{DatabaseConnection, EntityTrait};
use entity::im_config;
use crate::error::CommonError;

pub async fn get_token(db: &DatabaseConnection) -> Result<Option<String>, CommonError> {
    // 获取 token
    let token = im_config::Entity::find()
        .filter(im_config::Column::ConfigKey.eq("token"))
        .one(db)
        .await
        .with_context(|| "数据库查询异常")?
        .unwrap();
    
    Ok(token.config_value)
}