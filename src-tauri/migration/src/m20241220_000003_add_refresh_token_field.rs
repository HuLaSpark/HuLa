use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 添加 refresh_token 字段到 im_user 表
        manager
            .alter_table(
                Table::alter()
                    .table(ImUser::Table)
                    .add_column(ColumnDef::new(ImUser::RefreshToken).string())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 移除 refresh_token 字段
        manager
            .alter_table(
                Table::alter()
                    .table(ImUser::Table)
                    .drop_column(ImUser::RefreshToken)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum ImUser {
    Table,
    RefreshToken,
}
