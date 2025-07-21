use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 im_user 表
        manager
            .create_table(
                Table::create()
                    .table(ImUser::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ImUser::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(ImUser::UserId).big_integer())
                    .col(ColumnDef::new(ImUser::Name).string())
                    .col(ColumnDef::new(ImUser::Avatar).string())
                    .col(ColumnDef::new(ImUser::Email).string())
                    .col(ColumnDef::new(ImUser::Account).string())
                    .col(ColumnDef::new(ImUser::Sex).integer())
                    .col(ColumnDef::new(ImUser::OpenId).string())
                    .col(ColumnDef::new(ImUser::ActiveStatus).integer())
                    .col(ColumnDef::new(ImUser::UserStateId).big_integer())
                    .col(ColumnDef::new(ImUser::LastOptTime).timestamp())
                    .col(ColumnDef::new(ImUser::IpInfo).json())
                    .col(ColumnDef::new(ImUser::ItemId).big_integer())
                    .col(ColumnDef::new(ImUser::State).integer())
                    .col(ColumnDef::new(ImUser::CreateTime).timestamp())
                    .col(ColumnDef::new(ImUser::UpdateTime).timestamp())
                    .col(ColumnDef::new(ImUser::Password).string())
                    .col(ColumnDef::new(ImUser::AvatarUpdateTime).timestamp())
                    .col(ColumnDef::new(ImUser::Num).integer())
                    .col(ColumnDef::new(ImUser::Context).boolean())
                    .col(ColumnDef::new(ImUser::UserType).integer())
                    .col(
                        ColumnDef::new(ImUser::IsInit)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await?;

        // 创建 im_contact 表
        manager
            .create_table(
                Table::create()
                    .table(ImContact::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ImContact::Id).string().not_null())
                    .col(ColumnDef::new(ImContact::DetailId).string().not_null())
                    .col(ColumnDef::new(ImContact::RoomId).string().not_null())
                    .col(ColumnDef::new(ImContact::ContactType).tiny_unsigned())
                    .col(ColumnDef::new(ImContact::HotFlag).tiny_unsigned())
                    .col(ColumnDef::new(ImContact::Top).boolean())
                    .col(ColumnDef::new(ImContact::Account).string())
                    .col(ColumnDef::new(ImContact::Operate).tiny_unsigned())
                    .col(ColumnDef::new(ImContact::Remark).string())
                    .col(ColumnDef::new(ImContact::MyName).string())
                    .col(ColumnDef::new(ImContact::MuteNotification).tiny_unsigned())
                    .col(ColumnDef::new(ImContact::Hide).boolean())
                    .col(ColumnDef::new(ImContact::ActiveTime).big_integer())
                    .col(ColumnDef::new(ImContact::Shield).boolean())
                    .col(ColumnDef::new(ImContact::Avatar).string())
                    .col(ColumnDef::new(ImContact::ContactName).string())
                    .col(ColumnDef::new(ImContact::Text).string())
                    .col(ColumnDef::new(ImContact::UnreadCount).tiny_unsigned())
                    .col(ColumnDef::new(ImContact::CreateTime).big_integer())
                    .col(ColumnDef::new(ImContact::UpdateTime).big_integer())
                    .col(ColumnDef::new(ImContact::LoginUid).string().not_null())
                    .primary_key(Index::create().col(ImContact::Id).col(ImContact::LoginUid))
                    .to_owned(),
            )
            .await?;

        // 创建 im_room 表
        manager
            .create_table(
                Table::create()
                    .table(ImRoom::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ImRoom::Id).string().not_null())
                    .col(ColumnDef::new(ImRoom::RoomId).string().not_null())
                    .col(ColumnDef::new(ImRoom::GroupId).string())
                    .col(ColumnDef::new(ImRoom::RoomName).string().not_null())
                    .col(ColumnDef::new(ImRoom::Avatar).string())
                    .col(ColumnDef::new(ImRoom::LoginUid).string().not_null())
                    .primary_key(Index::create().col(ImRoom::Id).col(ImRoom::LoginUid))
                    .to_owned(),
            )
            .await?;

        // 创建 im_room_member 表
        manager
            .create_table(
                Table::create()
                    .table(ImRoomMember::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ImRoomMember::Id).string().not_null())
                    .col(ColumnDef::new(ImRoomMember::RoomId).string())
                    .col(ColumnDef::new(ImRoomMember::Uid).string())
                    .col(ColumnDef::new(ImRoomMember::Account).string())
                    .col(ColumnDef::new(ImRoomMember::MyName).string())
                    .col(ColumnDef::new(ImRoomMember::ActiveStatus).tiny_unsigned())
                    .col(ColumnDef::new(ImRoomMember::GroupRole).big_integer())
                    .col(ColumnDef::new(ImRoomMember::LocPlace).string())
                    .col(
                        ColumnDef::new(ImRoomMember::LastOptTime)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ImRoomMember::CreateTime).big_integer())
                    .col(ColumnDef::new(ImRoomMember::Name).string().not_null())
                    .col(ColumnDef::new(ImRoomMember::Avatar).string())
                    .col(ColumnDef::new(ImRoomMember::UserStateId).string())
                    .col(ColumnDef::new(ImRoomMember::LoginUid).string().not_null())
                    .primary_key(
                        Index::create()
                            .col(ImRoomMember::Id)
                            .col(ImRoomMember::LoginUid),
                    )
                    .to_owned(),
            )
            .await?;

        // 创建 im_message 表
        manager
            .create_table(
                Table::create()
                    .table(ImMessage::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ImMessage::Id).string().not_null())
                    .col(ColumnDef::new(ImMessage::Uid).string().not_null())
                    .col(ColumnDef::new(ImMessage::Nickname).string())
                    .col(ColumnDef::new(ImMessage::RoomId).string().not_null())
                    .col(ColumnDef::new(ImMessage::SendTime).big_integer())
                    .col(ColumnDef::new(ImMessage::MessageType).tiny_unsigned())
                    .col(ColumnDef::new(ImMessage::Body).string())
                    .col(ColumnDef::new(ImMessage::MessageMarks).string())
                    .col(ColumnDef::new(ImMessage::CreateTime).big_integer())
                    .col(ColumnDef::new(ImMessage::UpdateTime).big_integer())
                    .col(ColumnDef::new(ImMessage::LoginUid).string().not_null())
                    .col(
                        ColumnDef::new(ImMessage::SendStatus)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .primary_key(Index::create().col(ImMessage::Id).col(ImMessage::LoginUid))
                    .to_owned(),
            )
            .await?;

        // 创建 im_config 表
        manager
            .create_table(
                Table::create()
                    .table(ImConfig::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ImConfig::Id).big_integer().not_null())
                    .col(ColumnDef::new(ImConfig::ConfigKey).string().not_null())
                    .col(ColumnDef::new(ImConfig::ConfigValue).string())
                    .col(ColumnDef::new(ImConfig::LoginUid).string().not_null())
                    .primary_key(Index::create().col(ImConfig::Id).col(ImConfig::LoginUid))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ImConfig::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ImMessage::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ImRoomMember::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ImRoom::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ImContact::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ImUser::Table).to_owned())
            .await?;

        Ok(())
    }
}

// 定义表和列的枚举
#[derive(DeriveIden)]
enum ImUser {
    Table,
    Id,
    UserId,
    Name,
    Avatar,
    Email,
    Account,
    Sex,
    OpenId,
    ActiveStatus,
    UserStateId,
    LastOptTime,
    IpInfo,
    ItemId,
    State,
    CreateTime,
    UpdateTime,
    Password,
    AvatarUpdateTime,
    Num,
    Context,
    UserType,
    IsInit,
}

#[derive(DeriveIden)]
enum ImContact {
    Table,
    Id,
    DetailId,
    RoomId,
    ContactType,
    HotFlag,
    Top,
    Account,
    Operate,
    Remark,
    MyName,
    MuteNotification,
    Hide,
    ActiveTime,
    Shield,
    Avatar,
    ContactName,
    Text,
    UnreadCount,
    CreateTime,
    UpdateTime,
    LoginUid,
}

#[derive(DeriveIden)]
enum ImRoom {
    Table,
    Id,
    RoomId,
    GroupId,
    RoomName,
    Avatar,
    LoginUid,
}

#[derive(DeriveIden)]
enum ImRoomMember {
    Table,
    Id,
    RoomId,
    Uid,
    Account,
    MyName,
    ActiveStatus,
    GroupRole,
    LocPlace,
    LastOptTime,
    CreateTime,
    Name,
    Avatar,
    UserStateId,
    LoginUid,
}

#[derive(DeriveIden)]
enum ImMessage {
    Table,
    Id,
    Uid,
    Nickname,
    RoomId,
    SendTime,
    MessageType,
    Body,
    MessageMarks,
    CreateTime,
    UpdateTime,
    LoginUid,
    SendStatus,
}

#[derive(DeriveIden)]
enum ImConfig {
    Table,
    Id,
    ConfigKey,
    ConfigValue,
    LoginUid,
}
