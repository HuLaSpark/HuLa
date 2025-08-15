use crate::error::CommonError;
use entity::im_config;
use sea_orm::QueryFilter;
use sea_orm::{ActiveModelTrait, ColumnTrait, IntoActiveModel, Set};
use sea_orm::{DatabaseConnection, EntityTrait, TransactionTrait};

/// 获取配置列表
pub async fn list_config(
    db: &DatabaseConnection,
    login_uid: &str,
) -> Result<Vec<im_config::Model>, CommonError> {
    let list = im_config::Entity::find()
        .filter(im_config::Column::LoginUid.eq(login_uid))
        .all(db)
        .await?;
    Ok(list)
}

/// 根据配置键获取配置值
pub async fn get_config_by_key(
    db: &DatabaseConnection,
    config_key: &str,
    login_uid: &str,
) -> Result<Option<im_config::Model>, CommonError> {
    let config = im_config::Entity::find()
        .filter(im_config::Column::ConfigKey.eq(config_key))
        .filter(im_config::Column::LoginUid.eq(login_uid))
        .one(db)
        .await
        .map_err(|e| anyhow::anyhow!("查询配置失败: {}", e))?;
    Ok(config)
}

/// 保存或更新配置
pub async fn save_or_update_config(
    db: &DatabaseConnection,
    config_key: &str,
    config_value: Option<String>,
    login_uid: &str,
) -> Result<(), CommonError> {
    // 查找现有配置
    let existing_config = get_config_by_key(db, config_key, login_uid).await?;

    if let Some(config) = existing_config {
        // 更新现有配置
        let mut config_active = config.into_active_model();
        config_active.config_value = Set(config_value);
        config_active.update(db).await?;
    } else {
        // 创建新配置
        let new_config = im_config::Model {
            id: 0, // 自增主键
            config_key: config_key.to_string(),
            config_value,
            login_uid: login_uid.to_string(),
        };
        let mut config_active = new_config.into_active_model();
        config_active.id = sea_orm::NotSet;
        config_active.insert(db).await?;
    }
    Ok(())
}

/// 批量保存配置
pub async fn save_config_batch(
    db: &DatabaseConnection,
    configs: Vec<im_config::Model>,
    login_uid: &str,
) -> Result<(), CommonError> {
    if configs.is_empty() {
        return Ok(());
    }

    // 使用事务确保操作的原子性
    let txn = db.begin().await?;

    // 先删除当前用户的现有配置数据
    im_config::Entity::delete_many()
        .filter(im_config::Column::LoginUid.eq(login_uid))
        .exec(&txn)
        .await
        .map_err(|e| anyhow::anyhow!("删除现有配置数据失败: {}", e))?;

    // 批量插入新的配置数据
    let active_models: Vec<im_config::ActiveModel> = configs
        .into_iter()
        .map(|mut config| {
            config.login_uid = login_uid.to_string();
            let mut active_model = config.into_active_model();
            active_model.id = sea_orm::NotSet;
            active_model
        })
        .collect();

    if !active_models.is_empty() {
        im_config::Entity::insert_many(active_models)
            .exec(&txn)
            .await
            .map_err(|e| anyhow::anyhow!("批量插入配置数据失败: {}", e))?;
    }

    // 提交事务
    txn.commit().await?;
    Ok(())
}

/// 删除配置
pub async fn delete_config(
    db: &DatabaseConnection,
    config_key: &str,
    login_uid: &str,
) -> Result<(), CommonError> {
    im_config::Entity::delete_many()
        .filter(im_config::Column::ConfigKey.eq(config_key))
        .filter(im_config::Column::LoginUid.eq(login_uid))
        .exec(db)
        .await
        .map_err(|e| anyhow::anyhow!("删除配置失败: {}", e))?;
    Ok(())
}
