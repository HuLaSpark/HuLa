use sea_orm_migration::{prelude::*, schema::*};
use entity::{im_room_member, im_user};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(im_user::Entity)
                    .if_not_exists()
                    .col(pk_auto(im_user::Column::Id))
                    .col(big_integer_null(im_user::Column::UserId))
                    .col(string_null(im_user::Column::Name))
                    .col(string_null(im_user::Column::Avatar))
                    .col(string_null(im_user::Column::Email))
                    .col(string_null(im_user::Column::Account))
                    .col(integer_null(im_user::Column::Sex))
                    .col(string_null(im_user::Column::OpenId))
                    .col(integer_null(im_user::Column::ActiveStatus))
                    .col(big_integer_null(im_user::Column::UserStateId))
                    .col(date_time_null(im_user::Column::LastOptTime))
                    .col(json_null(im_user::Column::IpInfo))
                    .col(big_integer_null(im_user::Column::ItemId))
                    .col(integer_null(im_user::Column::State))
                    .col(date_time_null(im_user::Column::CreateTime))
                    .col(date_time_null(im_user::Column::UpdateTime))
                    .col(string_null(im_user::Column::Password))
                    .col(date_time_null(im_user::Column::AvatarUpdateTime))
                    .col(integer_null(im_user::Column::Num))
                    .col(boolean_null(im_user::Column::Context))
                    .col(integer_null(im_user::Column::UserType))
                    .to_owned(),
            )
            .await?;
        
        manager.create_table(
            Table::create()
                .table(im_room_member::Entity)
                .col(pk_auto(im_room_member::Column::Id))
                .col(string_null(im_room_member::Column::Uid))
                .col(string_null(im_room_member::Column::Account))
                .col(integer_null(im_room_member::Column::ActiveStatus))
                .col(big_integer_null(im_room_member::Column::RoleId))
                .col(string_null(im_room_member::Column::LocPlace))
                .col(string_null(im_room_member::Column::LastOptTime))
                .to_owned()
        ).await
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        todo!()
    }
}
