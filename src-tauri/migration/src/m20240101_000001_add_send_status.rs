use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 添加 send_status 字段到 im_message 表
        manager
            .alter_table(
                Table::alter()
                    .table(ImMessage::Table)
                    .add_column(
                        ColumnDef::new(ImMessage::SendStatus)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 删除 send_status 字段
        manager
            .alter_table(
                Table::alter()
                    .table(ImMessage::Table)
                    .drop_column(ImMessage::SendStatus)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum ImMessage {
    Table,
    SendStatus,
}
