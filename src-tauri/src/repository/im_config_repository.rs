use crate::error::CommonError;
use anyhow::Context;
use entity::im_config;
use sea_orm::{ActiveModelTrait, ColumnTrait, IntoActiveModel, Set};
use sea_orm::QueryFilter;
use sea_orm::{DatabaseConnection, EntityTrait};

pub async fn get_token(db: &DatabaseConnection) -> Result<Option<String>, CommonError> {
    // 获取 token
    let token: Option<im_config::Model> = im_config::Entity::find()
        .filter(im_config::Column::ConfigKey.eq("token"))
        .one(db)
        .await
        .with_context(|| "数据库查询异常")?;

    match token {
        None => Ok(None),
        Some(data) => Ok(data.config_value),
    }
}

pub async fn save_or_update_token(db: &DatabaseConnection, token: String, refresh_token: String) -> Result<(), CommonError> {
    // 处理 token - 如果存在则更新，不存在则插入
    let existing_token = im_config::Entity::find()
        .filter(im_config::Column::ConfigKey.eq("token"))
        .one(db)
        .await
        .with_context(|| "查询现有token失败")?;

    match existing_token {
        Some(existing) => {
            // 更新现有记录
            let mut token_active = existing.into_active_model();
            token_active.config_value = Set(Some(token));
            token_active
                .update(db)
                .await
                .with_context(|| "更新token失败")?;
        }
        None => {
            // 插入新记录
            let token = im_config::ActiveModel {
                id: Default::default(),
                config_key: Set("token".to_string()),
                config_value: Set(Some(token)),
            };
            token
                .insert(db)
                .await
                .with_context(|| "插入新token失败")?;
        }
    }

    // 处理 refresh_token - 如果存在则更新，不存在则插入
    let existing_refresh_token = im_config::Entity::find()
        .filter(im_config::Column::ConfigKey.eq("refresh_token"))
        .one(db)
        .await
        .with_context(|| "查询现有refresh_token失败")?;

    match existing_refresh_token {
        Some(existing) => {
            // 更新现有记录
            let mut refresh_token_active = existing.into_active_model();
            refresh_token_active.config_value = Set(Some(refresh_token));
            refresh_token_active
                .update(db)
                .await
                .with_context(|| "更新refresh_token失败")?;
        }
        None => {
            // 插入新记录
            let refresh_token = im_config::ActiveModel {
                id: Default::default(),
                config_key: Set("refresh_token".to_string()),
                config_value: Set(Some(refresh_token)),
            };
            refresh_token
                .insert(db)
                .await
                .with_context(|| "插入新refresh_token失败")?;
        }
    }
    
    Ok(())
}
