use std::str::FromStr;

use anyhow::Ok;
use base64::{Engine, prelude::BASE64_STANDARD};
use reqwest::header;
use serde_json::json;
use tracing::{error, info};

use crate::{
    pojo::common::ApiResult,
    vo::vo::{LoginReq, LoginResp, RefreshTokenReq, RefreshTokenResp},
};

#[derive(Debug)]
pub struct ImRequestClient {
    client: reqwest::Client,
    base_url: String,
    pub token: Option<String>,
    pub refresh_token: Option<String>,
}

impl ImRequestClient {
    pub fn new(base_url: String) -> Result<Self, anyhow::Error> {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static("application/json"),
        );
        let basic_auth = BASE64_STANDARD.encode("luohuo_web_pro:luohuo_web_pro_secret");
        let basic_auth_value = header::HeaderValue::from_str(&basic_auth)
            .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;
        headers.insert(header::AUTHORIZATION, basic_auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            client: client,
            base_url: base_url,
            token: None,
            refresh_token: None,
        })
    }

    pub fn set_base_url(&mut self, base_url: String) {
        self.base_url = base_url;
    }

    pub async fn request<
        T: serde::de::DeserializeOwned,
        B: serde::Serialize,
        C: serde::Serialize,
    >(
        &mut self,
        method: http::Method,
        path: &str,
        body: Option<B>,
        params: Option<C>,
    ) -> Result<ApiResult<T>, anyhow::Error> {
        let mut retry_count = 0;
        const MAX_RETRY_COUNT: u8 = 2;

        loop {
            let url = format!("{}/{}", self.base_url, path);
            info!("📡 Request URL: {}, Method: {}", &url, method.clone());

            let mut request_builder = self.client.request(method.clone(), &url);

            // 设置请求头
            if let Some(token) = self.token.clone() {
                request_builder = request_builder.header("token", token);
            }

            // 设置请求体
            if let Some(body) = &body {
                request_builder = request_builder.json(body);
            } else {
                request_builder = request_builder.json(&serde_json::json!({}));
            }

            if let Some(params) = &params {
                request_builder = request_builder.query(params);
            }

            // 发送请求
            let response = request_builder.send().await?;
            let result: ApiResult<T> = response.json().await?;

            match result.code {
                Some(406) => {
                    if retry_count >= MAX_RETRY_COUNT {
                        return Err(anyhow::anyhow!("token过期，刷新token失败"));
                    }

                    error!("🔄 Token expired, starting token refresh");
                    self.start_refresh_token().await?;
                    retry_count += 1;
                    continue;
                }
                Some(401) => {
                    error!(
                        "❌ {}; 方法: {}; 失败信息: {}",
                        &url,
                        method,
                        result.msg.clone().unwrap_or_default()
                    );
                    return Err(anyhow::anyhow!("请重新登录"));
                }
                Some(200) => {
                    info!(
                        "✅ Request successful: {}, Method: {}",
                        &url,
                        method.clone()
                    );
                    return Ok(result);
                }
                _ => {
                    error!(
                        "❌ {}; 方法: {}; 失败信息: {}",
                        &url,
                        method,
                        result.msg.clone().unwrap_or_default()
                    );
                    return Err(anyhow::anyhow!(
                        "{}",
                        result.msg.clone().unwrap_or_default()
                    ));
                }
            }
        }
    }

    pub async fn start_refresh_token(&mut self) -> Result<(), anyhow::Error> {
        info!("🔄 Starting token refresh");
        let url = format!("{}/{}", self.base_url, ImUrl::RefreshToken.get_url().1);

        let body = json!({
          "refreshToken": self.refresh_token.clone().unwrap()
        });

        let request_builder = self.client.request(http::Method::POST, &url);
        let response = request_builder.json(&body).send().await?;
        let result: ApiResult<serde_json::Value> = response.json().await?;

        if !result.success {
            error!(
                "❌ 刷新token失败: {}",
                result.msg.clone().unwrap_or_default()
            );
            return Err(anyhow::anyhow!(
                "刷新token失败: {}",
                result.msg.clone().unwrap_or_default()
            ));
        }

        if let Some(token) = result.data.clone().unwrap().get("token").unwrap().as_str() {
            self.token = Some(token.to_owned());
        }

        if let Some(refresh_token) = result
            .data
            .clone()
            .unwrap()
            .get("refreshToken")
            .unwrap()
            .as_str()
        {
            self.refresh_token = Some(refresh_token.to_owned());
        }

        Ok(())
    }

    pub async fn im_request<
        T: serde::de::DeserializeOwned,
        B: serde::Serialize,
        C: serde::Serialize,
    >(
        &mut self,
        url: ImUrl,
        body: Option<B>,
        params: Option<C>,
    ) -> Result<Option<T>, anyhow::Error> {
        let (method, path) = url.get_url();
        let result: ApiResult<T> = self.request(method, path, body, params).await?;
        Ok(result.data)
    }
}

impl ImRequest for ImRequestClient {
    async fn login(&mut self, login_req: LoginReq) -> Result<Option<LoginResp>, anyhow::Error> {
        let result: Option<LoginResp> = self
            .im_request(ImUrl::Login, Some(login_req), None::<serde_json::Value>)
            .await?;

        if let Some(data) = result.clone() {
            self.token = Some(data.token.clone());
            self.refresh_token = Some(data.refresh_token.clone());
        }

        Ok(result)
    }

    async fn refresh_token(
        &mut self,
        refresh_token_req: RefreshTokenReq,
    ) -> Result<Option<RefreshTokenResp>, anyhow::Error> {
        let result: Option<RefreshTokenResp> = self
            .im_request(
                ImUrl::RefreshToken,
                Some(refresh_token_req),
                None::<serde_json::Value>,
            )
            .await?;

        if let Some(data) = result.clone() {
            self.token = Some(data.token.clone());
            self.refresh_token = Some(data.refresh_token.clone());
        }

        Ok(result)
    }
}

pub enum ImUrl {
    Login,
    RefreshToken,
    ForgetPassword,
    CheckToken,
    Logout,
    Register,
    GetQiniuToken,
    InitConfig,
    FileUpload,
    GetAssistantModelList,
    SendCaptcha,
    GetCaptcha,
    Announcement,
    EditAnnouncement,
    DeleteAnnouncement,
    PushAnnouncement,
    GetAnnouncementList,
    ApplyGroup,
    SearchGroup,
    UpdateMyRoomInfo,
    UpdateRoomInfo,
    GroupList,
    GroupListMember,
    GroupDetail,
    GroupInfo,
    RevokeAdmin,
    AddAdmin,
    ExitGroup,
    AcceptInvite,
    InviteList,
    InviteGroupMember,
    RemoveGroupMember,
    CreateGroup,
    Shield,
    Notification,
    DeleteSession,
    SetSessionTop,
    SessionDetailWithFriends,
    SessionDetail,
    GetMsgReadCount,
    GetMsgReadList,
    ModifyFriendRemark,
    DeleteFriend,
    SendAddFriendRequest,
    HandleInvite,
    NoticeUnReadCount,
    RequestNoticePage,
    GetContactList,
    SearchFriend,
    ChangeUserState,
    GetAllUserState,
    UploadAvatar,
    GetEmoji,
    DeleteEmoji,
    AddEmoji,
    RecallMsg,
    BlockUser,
    MarkMsg,
    SetUserBadge,
    ModifyUserInfo,
    GetUserInfoDetail,
    GetMsgList,
    GetMsgPage,
    GetAllUserBaseInfo,
    GetBadgesBatch,
    GetMemberStatistic,
    GetBadgeList,
    FeedDetail,
    FeedList,
    PushFeed,
    DelFeed,
    EditFeed,
    GetFeedPermission,
    SendMsg,
    SetHide,
    GetFriendPage,
    MarkMsgRead,
    CheckEmail,
    MergeMsg,
    GetUserByIds,
    GenerateQRCode,
    CheckQRStatus,
    ScanQRCode,
    ConfirmQRCode,
    MessageSend,
    MessageSendStream,
    MessageListByConversationId,
    MessageDelete,
    MessageDeleteByConversationId,
    MessagePage,
    MessageDeleteByAdmin,

    ConversationCreateMy,
    ConversationUpdateMy,
    ConversationMyList,
    ConversationGetMy,
    ConversationDeleteMy,
    ConversationDeleteByUnpinned,
    ConversationPage,
    ConversationDeleteByAdmin,

    ModelCreate,
    ModelUpdate,
    ModelDelete,
    ModelGet,
    ModelPage,
    ModelSimpleList,

    ChatRoleMyPage,
    ChatRoleGetMy,
    ChatRoleCreateMy,
    ChatRoleUpdateMy,
    ChatRoleDeleteMy,
    ChatRoleCategoryList,
    ChatRoleCreate,
    ChatRoleUpdate,
    ChatRoleDelete,
    ChatRoleGet,
    ChatRolePage,

    ApiKeyCreate,
    ApiKeyUpdate,
    ApiKeyDelete,
    ApiKeyGet,
    ApiKeyPage,
    ApiKeySimpleList,

    ToolCreate,
    ToolUpdate,
    ToolDelete,
    ToolGet,
    ToolPage,
    ToolSimpleList,

    ImageMyPage,
    ImagePublicPage,
    ImageGetMy,
    ImageMyListByIds,
    ImageDraw,
    ImageDeleteMy,
    ImageMidjourneyImagine,
    ImageMidjourneyNotify,
    ImageMidjourneyAction,
    ImagePage,
    ImageUpdate,
    ImageDelete,

    KnowledgePage,
    KnowledgeGet,
    KnowledgeCreate,
    KnowledgeUpdate,
    KnowledgeDelete,
    KnowledgeSimpleList,

    KnowledgeDocumentPage,
    KnowledgeDocumentGet,
    KnowledgeDocumentCreate,
    KnowledgeDocumentCreateList,
    KnowledgeDocumentUpdate,
    KnowledgeDocumentUpdateStatus,
    KnowledgeDocumentDelete,

    KnowledgeSegmentGet,
    KnowledgeSegmentPage,
    KnowledgeSegmentCreate,
    KnowledgeSegmentUpdate,
    KnowledgeSegmentUpdateStatus,
    KnowledgeSegmentSplit,
    KnowledgeSegmentGetProcessList,
    KnowledgeSegmentSearch,

    MindMapGenerateStream,
    MindMapDelete,
    MindMapPage,

    MusicMyPage,
    MusicGenerate,
    MusicDeleteMy,
    MusicGetMy,
    MusicUpdateMy,
    MusicPage,
    MusicDelete,
    MusicUpdate,

    WorkflowCreate,
    WorkflowUpdate,
    WorkflowDelete,
    WorkflowGet,
    WorkflowPage,
    WorkflowTest,

    WriteGenerateStream,
    WriteDelete,
    WritePage,
}

impl ImUrl {
    fn get_url(&self) -> (http::Method, &str) {
        match self {
            // Token 相关
            ImUrl::Login => (http::Method::POST, "oauth/anyTenant/login"),
            ImUrl::RefreshToken => (http::Method::POST, "oauth/anyTenant/refresh"),
            ImUrl::ForgetPassword => (http::Method::PUT, "oauth/anyTenant/password"),
            ImUrl::CheckToken => (http::Method::POST, "oauth/check"),
            ImUrl::Logout => (http::Method::POST, "oauth/anyUser/logout"),
            ImUrl::Register => (http::Method::POST, "oauth/anyTenant/registerByEmail"),

            // 系统相关
            ImUrl::GetQiniuToken => (http::Method::GET, "system/anyTenant/ossToken"),
            ImUrl::InitConfig => (http::Method::GET, "system/anyTenant/config/init"),
            ImUrl::FileUpload => (http::Method::GET, "system/upload/url"),
            ImUrl::GetAssistantModelList => (http::Method::GET, "system/model/list"),

            // 验证码相关
            ImUrl::SendCaptcha => (http::Method::POST, "oauth/anyTenant/sendEmailCode"),
            ImUrl::GetCaptcha => (http::Method::GET, "oauth/anyTenant/captcha"),

            // 群公告相关
            ImUrl::Announcement => (http::Method::GET, "im/room/announcement"),
            ImUrl::EditAnnouncement => (http::Method::POST, "im/room/announcement/edit"),
            ImUrl::DeleteAnnouncement => (http::Method::POST, "im/room/announcement/delete"),
            ImUrl::PushAnnouncement => (http::Method::POST, "im/room/announcement/push"),
            ImUrl::GetAnnouncementList => (http::Method::GET, "im/room/announcement/list"),

            // 群聊申请相关
            ImUrl::ApplyGroup => (http::Method::POST, "im/room/apply/group"),

            // 群聊搜索和管理
            ImUrl::SearchGroup => (http::Method::GET, "im/room/search"),
            ImUrl::UpdateMyRoomInfo => (http::Method::POST, "im/room/updateMyRoomInfo"),
            ImUrl::UpdateRoomInfo => (http::Method::POST, "im/room/updateRoomInfo"),
            ImUrl::GroupList => (http::Method::GET, "im/room/group/list"),
            ImUrl::GroupListMember => (http::Method::GET, "im/room/group/listMember"),
            ImUrl::GroupDetail => (http::Method::GET, "im/room/group/detail"),
            ImUrl::GroupInfo => (http::Method::GET, "im/room/group/info"),

            // 群聊管理员
            ImUrl::RevokeAdmin => (http::Method::DELETE, "im/room/group/admin"),
            ImUrl::AddAdmin => (http::Method::PUT, "im/room/group/admin"),

            // 群聊成员管理
            ImUrl::ExitGroup => (http::Method::DELETE, "im/room/group/member/exit"),
            ImUrl::AcceptInvite => (http::Method::POST, "im/room/group/invite/accept"),
            ImUrl::InviteList => (http::Method::GET, "im/room/group/invite/list"),
            ImUrl::InviteGroupMember => (http::Method::POST, "im/room/group/member"),
            ImUrl::RemoveGroupMember => (http::Method::DELETE, "im/room/group/member"),
            ImUrl::CreateGroup => (http::Method::POST, "im/room/group"),

            // 聊天会话相关
            ImUrl::Shield => (http::Method::POST, "im/chat/setShield"),
            ImUrl::Notification => (http::Method::POST, "im/chat/notification"),
            ImUrl::DeleteSession => (http::Method::DELETE, "im/chat/delete"),
            ImUrl::SetSessionTop => (http::Method::POST, "im/chat/setTop"),
            ImUrl::SessionDetailWithFriends => (http::Method::GET, "im/chat/contact/detail/friend"),
            ImUrl::SessionDetail => (http::Method::GET, "im/chat/contact/detail"),
            ImUrl::SetHide => (http::Method::POST, "im/chat/setHide"),

            // 消息已读未读
            ImUrl::GetMsgReadCount => (http::Method::GET, "im/chat/msg/read"),
            ImUrl::MarkMsgRead => (http::Method::PUT, "im/chat/msg/read"),
            ImUrl::SendMsg => (http::Method::POST, "im/chat/msg"),
            ImUrl::GetMsgReadList => (http::Method::GET, "im/chat/msg/read/page"),

            // 好友相关
            ImUrl::ModifyFriendRemark => (http::Method::POST, "im/user/friend/updateRemark"),
            ImUrl::DeleteFriend => (http::Method::DELETE, "im/user/friend"),
            ImUrl::SendAddFriendRequest => (http::Method::POST, "im/room/apply/apply"),
            ImUrl::HandleInvite => (http::Method::POST, "im/room/apply/handler/apply"),
            ImUrl::NoticeUnReadCount => (http::Method::GET, "im/room/notice/unread"),
            ImUrl::RequestNoticePage => (http::Method::GET, "im/room/notice/page"),
            ImUrl::GetFriendPage => (http::Method::GET, "im/user/friend/page"),
            ImUrl::GetContactList => (http::Method::GET, "im/chat/contact/list"),
            ImUrl::SearchFriend => (http::Method::GET, "im/user/friend/search"),

            // 用户状态相关
            ImUrl::ChangeUserState => (http::Method::POST, "im/user/state/changeState"),
            ImUrl::GetAllUserState => (http::Method::GET, "im/user/state/list"),

            // 用户信息相关
            ImUrl::UploadAvatar => (http::Method::POST, "im/user/avatar"),
            ImUrl::GetEmoji => (http::Method::GET, "im/user/emoji/list"),
            ImUrl::DeleteEmoji => (http::Method::DELETE, "im/user/emoji"),
            ImUrl::AddEmoji => (http::Method::POST, "im/user/emoji"),
            ImUrl::SetUserBadge => (http::Method::PUT, "im/user/badge"),
            ImUrl::ModifyUserInfo => (http::Method::PUT, "im/user/info"),
            ImUrl::GetUserInfoDetail => (http::Method::GET, "im/user/userInfo"),
            ImUrl::GetBadgesBatch => (http::Method::POST, "im/user/badges/batch"),
            ImUrl::GetBadgeList => (http::Method::GET, "im/user/badges"),
            ImUrl::BlockUser => (http::Method::PUT, "im/user/black"),

            // 扫码登录相关
            ImUrl::GenerateQRCode => (http::Method::GET, "oauth/anyTenant/qr/generate"),
            ImUrl::CheckQRStatus => (http::Method::GET, "oauth/anyTenant/qr/status/query"),
            ImUrl::ScanQRCode => (http::Method::POST, "oauth/qrcode/scan"),
            ImUrl::ConfirmQRCode => (http::Method::POST, "oauth/qrcode/confirm"),

            // 消息相关
            ImUrl::RecallMsg => (http::Method::PUT, "im/chat/msg/recall"),
            ImUrl::MarkMsg => (http::Method::PUT, "im/chat/msg/mark"),
            ImUrl::GetMsgPage => (http::Method::GET, "im/chat/msg/page"),
            ImUrl::GetMsgList => (http::Method::POST, "im/chat/msg/list"),
            ImUrl::GetMemberStatistic => (http::Method::GET, "im/chat/member/statistic"),

            // 朋友圈相关
            ImUrl::FeedList => (http::Method::POST, "im/feed/list"),
            ImUrl::PushFeed => (http::Method::POST, "im/feed/pushFeed"),
            ImUrl::GetFeedPermission => (http::Method::GET, "im/feed/getFeedPermission"),
            ImUrl::EditFeed => (http::Method::POST, "im/feed/edit"),
            ImUrl::DelFeed => (http::Method::POST, "im/feed/del"),
            ImUrl::FeedDetail => (http::Method::GET, "im/feed/detail"),

            // ai相关 - 聊天消息
            ImUrl::MessageSend => (http::Method::POST, "ai/chat/message/send"),
            ImUrl::MessageSendStream => (http::Method::POST, "ai/chat/message/send-stream"),
            ImUrl::MessageListByConversationId => {
                (http::Method::GET, "ai/chat/message/list-by-conversation-id")
            }
            ImUrl::MessageDelete => (http::Method::DELETE, "ai/chat/message/delete"),
            ImUrl::MessageDeleteByConversationId => (
                http::Method::DELETE,
                "ai/chat/message/delete-by-conversation-id",
            ),
            ImUrl::MessagePage => (http::Method::GET, "ai/chat/message/page"),
            ImUrl::MessageDeleteByAdmin => {
                (http::Method::DELETE, "ai/chat/message/delete-by-admin")
            }

            // AI 聊天对话
            ImUrl::ConversationCreateMy => (http::Method::POST, "ai/chat/conversation/create-my"),
            ImUrl::ConversationUpdateMy => (http::Method::PUT, "ai/chat/conversation/update-my"),
            ImUrl::ConversationMyList => (http::Method::GET, "ai/chat/conversation/my-list"),
            ImUrl::ConversationGetMy => (http::Method::GET, "ai/chat/conversation/get-my"),
            ImUrl::ConversationDeleteMy => (http::Method::DELETE, "ai/chat/conversation/delete-my"),
            ImUrl::ConversationDeleteByUnpinned => (
                http::Method::DELETE,
                "ai/chat/conversation/delete-by-unpinned",
            ),
            ImUrl::ConversationPage => (http::Method::GET, "ai/chat/conversation/page"),
            ImUrl::ConversationDeleteByAdmin => {
                (http::Method::DELETE, "ai/chat/conversation/delete-by-admin")
            }

            // AI 模型相关接口
            ImUrl::ModelCreate => (http::Method::POST, "ai/model/create"),
            ImUrl::ModelUpdate => (http::Method::PUT, "ai/model/update"),
            ImUrl::ModelDelete => (http::Method::DELETE, "ai/model/delete"),
            ImUrl::ModelGet => (http::Method::GET, "ai/model/get"),
            ImUrl::ModelPage => (http::Method::GET, "ai/model/page"),
            ImUrl::ModelSimpleList => (http::Method::GET, "ai/model/simple-list"),

            // 聊天角色相关接口
            ImUrl::ChatRoleMyPage => (http::Method::GET, "ai/chat-role/my-page"),
            ImUrl::ChatRoleGetMy => (http::Method::GET, "ai/chat-role/get-my"),
            ImUrl::ChatRoleCreateMy => (http::Method::POST, "ai/chat-role/create-my"),
            ImUrl::ChatRoleUpdateMy => (http::Method::PUT, "ai/chat-role/update-my"),
            ImUrl::ChatRoleDeleteMy => (http::Method::DELETE, "ai/chat-role/delete-my"),
            ImUrl::ChatRoleCategoryList => (http::Method::GET, "ai/chat-role/category-list"),
            ImUrl::ChatRoleCreate => (http::Method::POST, "ai/chat-role/create"),
            ImUrl::ChatRoleUpdate => (http::Method::PUT, "ai/chat-role/update"),
            ImUrl::ChatRoleDelete => (http::Method::DELETE, "ai/chat-role/delete"),
            ImUrl::ChatRoleGet => (http::Method::GET, "ai/chat-role/get"),
            ImUrl::ChatRolePage => (http::Method::GET, "ai/chat-role/page"),

            // API 密钥相关接口
            ImUrl::ApiKeyCreate => (http::Method::POST, "ai/api-key/create"),
            ImUrl::ApiKeyUpdate => (http::Method::PUT, "ai/api-key/update"),
            ImUrl::ApiKeyDelete => (http::Method::DELETE, "ai/api-key/delete"),
            ImUrl::ApiKeyGet => (http::Method::GET, "ai/api-key/get"),
            ImUrl::ApiKeyPage => (http::Method::GET, "ai/api-key/page"),
            ImUrl::ApiKeySimpleList => (http::Method::GET, "ai/api-key/simple-list"),

            // AI 工具相关接口
            ImUrl::ToolCreate => (http::Method::POST, "ai/tool/create"),
            ImUrl::ToolUpdate => (http::Method::PUT, "ai/tool/update"),
            ImUrl::ToolDelete => (http::Method::DELETE, "ai/tool/delete"),
            ImUrl::ToolGet => (http::Method::GET, "ai/tool/get"),
            ImUrl::ToolPage => (http::Method::GET, "ai/tool/page"),
            ImUrl::ToolSimpleList => (http::Method::GET, "ai/tool/simple-list"),

            // AI 绘画
            ImUrl::ImageMyPage => (http::Method::GET, "ai/image/my-page"),
            ImUrl::ImagePublicPage => (http::Method::GET, "ai/image/public-page"),
            ImUrl::ImageGetMy => (http::Method::GET, "ai/image/get-my"),
            ImUrl::ImageMyListByIds => (http::Method::GET, "ai/image/my-list-by-ids"),
            ImUrl::ImageDraw => (http::Method::POST, "ai/image/draw"),
            ImUrl::ImageDeleteMy => (http::Method::DELETE, "ai/image/delete-my"),
            ImUrl::ImageMidjourneyImagine => (http::Method::POST, "ai/image/midjourney/imagine"),
            ImUrl::ImageMidjourneyNotify => (http::Method::POST, "ai/image/midjourney/notify"),
            ImUrl::ImageMidjourneyAction => (http::Method::POST, "ai/image/midjourney/action"),
            ImUrl::ImagePage => (http::Method::GET, "ai/image/page"),
            ImUrl::ImageUpdate => (http::Method::PUT, "ai/image/update"),
            ImUrl::ImageDelete => (http::Method::DELETE, "ai/image/delete"),

            // 知识库相关接口
            ImUrl::KnowledgePage => (http::Method::GET, "ai/knowledge/page"),
            ImUrl::KnowledgeGet => (http::Method::GET, "ai/knowledge/get"),
            ImUrl::KnowledgeCreate => (http::Method::POST, "ai/knowledge/create"),
            ImUrl::KnowledgeUpdate => (http::Method::PUT, "ai/knowledge/update"),
            ImUrl::KnowledgeDelete => (http::Method::DELETE, "ai/knowledge/delete"),
            ImUrl::KnowledgeSimpleList => (http::Method::GET, "ai/knowledge/simple-list"),

            // 知识库文档相关接口
            ImUrl::KnowledgeDocumentPage => (http::Method::GET, "ai/knowledge/document/page"),
            ImUrl::KnowledgeDocumentGet => (http::Method::GET, "ai/knowledge/document/get"),
            ImUrl::KnowledgeDocumentCreate => (http::Method::POST, "ai/knowledge/document/create"),
            ImUrl::KnowledgeDocumentCreateList => {
                (http::Method::POST, "ai/knowledge/document/create-list")
            }
            ImUrl::KnowledgeDocumentUpdate => (http::Method::PUT, "ai/knowledge/document/update"),
            ImUrl::KnowledgeDocumentUpdateStatus => {
                (http::Method::PUT, "ai/knowledge/document/update-status")
            }
            ImUrl::KnowledgeDocumentDelete => {
                (http::Method::DELETE, "ai/knowledge/document/delete")
            }

            // 知识库文档片段相关接口
            ImUrl::KnowledgeSegmentGet => (http::Method::GET, "ai/knowledge/segment/get"),
            ImUrl::KnowledgeSegmentPage => (http::Method::GET, "ai/knowledge/segment/page"),
            ImUrl::KnowledgeSegmentCreate => (http::Method::POST, "ai/knowledge/segment/create"),
            ImUrl::KnowledgeSegmentUpdate => (http::Method::PUT, "ai/knowledge/segment/update"),
            ImUrl::KnowledgeSegmentUpdateStatus => {
                (http::Method::PUT, "ai/knowledge/segment/update-status")
            }
            ImUrl::KnowledgeSegmentSplit => (http::Method::GET, "ai/knowledge/segment/split"),
            ImUrl::KnowledgeSegmentGetProcessList => {
                (http::Method::GET, "ai/knowledge/segment/get-process-list")
            }
            ImUrl::KnowledgeSegmentSearch => (http::Method::GET, "ai/knowledge/segment/search"),

            // AI 思维导图相关接口
            ImUrl::MindMapGenerateStream => (http::Method::POST, "ai/mind-map/generate-stream"),
            ImUrl::MindMapDelete => (http::Method::DELETE, "ai/mind-map/delete"),
            ImUrl::MindMapPage => (http::Method::GET, "ai/mind-map/page"),

            // 音乐
            ImUrl::MusicMyPage => (http::Method::GET, "ai/music/my-page"),
            ImUrl::MusicGenerate => (http::Method::POST, "ai/music/generate"),
            ImUrl::MusicDeleteMy => (http::Method::DELETE, "ai/music/delete-my"),
            ImUrl::MusicGetMy => (http::Method::GET, "ai/music/get-my"),
            ImUrl::MusicUpdateMy => (http::Method::POST, "ai/music/update-my"),
            ImUrl::MusicPage => (http::Method::GET, "ai/music/page"),
            ImUrl::MusicDelete => (http::Method::DELETE, "ai/music/delete"),
            ImUrl::MusicUpdate => (http::Method::PUT, "ai/music/update"),

            // 工作流
            ImUrl::WorkflowCreate => (http::Method::POST, "ai/workflow/create"),
            ImUrl::WorkflowUpdate => (http::Method::PUT, "ai/workflow/update"),
            ImUrl::WorkflowDelete => (http::Method::DELETE, "ai/workflow/delete"),
            ImUrl::WorkflowGet => (http::Method::GET, "ai/workflow/get"),
            ImUrl::WorkflowPage => (http::Method::GET, "ai/workflow/page"),
            ImUrl::WorkflowTest => (http::Method::POST, "ai/workflow/test"),

            // 写作
            ImUrl::WriteGenerateStream => (http::Method::POST, "ai/write/generate-stream"),
            ImUrl::WriteDelete => (http::Method::DELETE, "ai/write/delete"),
            ImUrl::WritePage => (http::Method::GET, "ai/write/page"),

            // 群成员信息
            ImUrl::GetAllUserBaseInfo => (http::Method::GET, "im/room/group/member/list"),
            ImUrl::CheckEmail => (http::Method::GET, "oauth/anyTenant/checkEmail"),

            ImUrl::MergeMsg => (http::Method::POST, "im/room/mergeMessage"),
            ImUrl::GetUserByIds => (http::Method::POST, "im/user/getUserByIds"),
        }
    }

    fn from_str(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            // Token 相关
            "login" => Ok(ImUrl::Login),
            "refreshToken" => Ok(ImUrl::RefreshToken),
            "forgetPassword" => Ok(ImUrl::ForgetPassword),
            "checkToken" => Ok(ImUrl::CheckToken),
            "logout" => Ok(ImUrl::Logout),
            "register" => Ok(ImUrl::Register),

            // 系统相关
            "getQiniuToken" => Ok(ImUrl::GetQiniuToken),
            "initConfig" => Ok(ImUrl::InitConfig),
            "fileUpload" => Ok(ImUrl::FileUpload),
            "getAssistantModelList" => Ok(ImUrl::GetAssistantModelList),

            // 验证码相关
            "sendCaptcha" => Ok(ImUrl::SendCaptcha),
            "getCaptcha" => Ok(ImUrl::GetCaptcha),

            // 群公告相关
            "announcement" => Ok(ImUrl::Announcement),
            "editAnnouncement" => Ok(ImUrl::EditAnnouncement),
            "deleteAnnouncement" => Ok(ImUrl::DeleteAnnouncement),
            "pushAnnouncement" => Ok(ImUrl::PushAnnouncement),
            "getAnnouncementList" => Ok(ImUrl::GetAnnouncementList),

            // 群聊申请相关
            "applyGroup" => Ok(ImUrl::ApplyGroup),

            // 群聊搜索和管理
            "searchGroup" => Ok(ImUrl::SearchGroup),
            "updateMyRoomInfo" => Ok(ImUrl::UpdateMyRoomInfo),
            "updateRoomInfo" => Ok(ImUrl::UpdateRoomInfo),
            "groupList" => Ok(ImUrl::GroupList),
            "groupDetail" => Ok(ImUrl::GroupDetail),
            "groupInfo" => Ok(ImUrl::GroupInfo),

            // 群聊管理员
            "revokeAdmin" => Ok(ImUrl::RevokeAdmin),
            "addAdmin" => Ok(ImUrl::AddAdmin),

            // 群聊成员管理
            "exitGroup" => Ok(ImUrl::ExitGroup),
            "acceptInvite" => Ok(ImUrl::AcceptInvite),
            "inviteList" => Ok(ImUrl::InviteList),
            "inviteGroupMember" => Ok(ImUrl::InviteGroupMember),
            "removeGroupMember" => Ok(ImUrl::RemoveGroupMember),
            "createGroup" => Ok(ImUrl::CreateGroup),

            // 聊天会话相关
            "shield" => Ok(ImUrl::Shield),
            "notification" => Ok(ImUrl::Notification),
            "deleteSession" => Ok(ImUrl::DeleteSession),
            "setSessionTop" => Ok(ImUrl::SetSessionTop),
            "sessionDetailWithFriends" => Ok(ImUrl::SessionDetailWithFriends),
            "sessionDetail" => Ok(ImUrl::SessionDetail),

            // 消息已读未读
            "getMsgReadCount" => Ok(ImUrl::GetMsgReadCount),
            "getMsgReadList" => Ok(ImUrl::GetMsgReadList),

            // 好友相关
            "modifyFriendRemark" => Ok(ImUrl::ModifyFriendRemark),
            "deleteFriend" => Ok(ImUrl::DeleteFriend),
            "sendAddFriendRequest" => Ok(ImUrl::SendAddFriendRequest),
            "handleInvite" => Ok(ImUrl::HandleInvite),
            "noticeUnReadCount" => Ok(ImUrl::NoticeUnReadCount),
            "requestNoticePage" => Ok(ImUrl::RequestNoticePage),
            "getContactList" => Ok(ImUrl::GetContactList),
            "searchFriend" => Ok(ImUrl::SearchFriend),

            // 用户状态相关
            "changeUserState" => Ok(ImUrl::ChangeUserState),
            "getAllUserState" => Ok(ImUrl::GetAllUserState),

            // 用户信息相关
            "uploadAvatar" => Ok(ImUrl::UploadAvatar),
            "getEmoji" => Ok(ImUrl::GetEmoji),
            "deleteEmoji" => Ok(ImUrl::DeleteEmoji),
            "addEmoji" => Ok(ImUrl::AddEmoji),
            "setUserBadge" => Ok(ImUrl::SetUserBadge),
            "ModifyUserInfo" => Ok(ImUrl::ModifyUserInfo),
            "getUserInfoDetail" => Ok(ImUrl::GetUserInfoDetail),
            "getBadgesBatch" => Ok(ImUrl::GetBadgesBatch),
            "getBadgeList" => Ok(ImUrl::GetBadgeList),
            "blockUser" => Ok(ImUrl::BlockUser),

            // 消息相关
            "recallMsg" => Ok(ImUrl::RecallMsg),
            "markMsg" => Ok(ImUrl::MarkMsg),
            "getMsgList" => Ok(ImUrl::GetMsgList),
            "getMsgPage" => Ok(ImUrl::GetMsgPage),
            "getMemberStatistic" => Ok(ImUrl::GetMemberStatistic),

            // 朋友圈相关
            "feedDetail" => Ok(ImUrl::FeedDetail),
            "feedList" => Ok(ImUrl::FeedList),
            "pushFeed" => Ok(ImUrl::PushFeed),
            "delFeed" => Ok(ImUrl::DelFeed),
            "editFeed" => Ok(ImUrl::EditFeed),
            "getFeedPermission" => Ok(ImUrl::GetFeedPermission),

            // 群成员信息
            "getAllUserBaseInfo" => Ok(ImUrl::GetAllUserBaseInfo),
            "sendMsg" => Ok(ImUrl::SendMsg),
            "setHide" => Ok(ImUrl::SetHide),
            "getFriendPage" => Ok(ImUrl::GetFriendPage),
            "markMsgRead" => Ok(ImUrl::MarkMsgRead),
            "groupListMember" => Ok(ImUrl::GroupListMember),
            "checkEmail" => Ok(ImUrl::CheckEmail),
            "mergeMsg" => Ok(ImUrl::MergeMsg),
            "getUserByIds" => Ok(ImUrl::GetUserByIds),
            "generateQRCode" => Ok(ImUrl::GenerateQRCode),
            "checkQRStatus" => Ok(ImUrl::CheckQRStatus),
            "scanQRCode" => Ok(ImUrl::ScanQRCode),
            "confirmQRCode" => Ok(ImUrl::ConfirmQRCode),

            // ================ AI 聊天消息 ================
            "messageSend" => Ok(ImUrl::MessageSend),
            "messageSendStream" => Ok(ImUrl::MessageSendStream),
            "messageListByConversationId" => Ok(ImUrl::MessageListByConversationId),
            "messageDelete" => Ok(ImUrl::MessageDelete),
            "messageDeleteByConversationId" => Ok(ImUrl::MessageDeleteByConversationId),
            "messagePage" => Ok(ImUrl::MessagePage),
            "messageDeleteByAdmin" => Ok(ImUrl::MessageDeleteByAdmin),

            // ================ AI 聊天对话 ================
            "conversationCreateMy" => Ok(ImUrl::ConversationCreateMy),
            "conversationUpdateMy" => Ok(ImUrl::ConversationUpdateMy),
            "conversationMyList" => Ok(ImUrl::ConversationMyList),
            "conversationGetMy" => Ok(ImUrl::ConversationGetMy),
            "conversationDeleteMy" => Ok(ImUrl::ConversationDeleteMy),
            "conversationDeleteByUnpinned" => Ok(ImUrl::ConversationDeleteByUnpinned),
            "conversationPage" => Ok(ImUrl::ConversationPage),
            "conversationDeleteByAdmin" => Ok(ImUrl::ConversationDeleteByAdmin),

            // ================ AI 模型 ================
            "modelCreate" => Ok(ImUrl::ModelCreate),
            "modelUpdate" => Ok(ImUrl::ModelUpdate),
            "modelDelete" => Ok(ImUrl::ModelDelete),
            "modelGet" => Ok(ImUrl::ModelGet),
            "modelPage" => Ok(ImUrl::ModelPage),
            "modelSimpleList" => Ok(ImUrl::ModelSimpleList),

            // ================ AI 聊天角色 ================
            "chatRoleMyPage" => Ok(ImUrl::ChatRoleMyPage),
            "chatRoleGetMy" => Ok(ImUrl::ChatRoleGetMy),
            "chatRoleCreateMy" => Ok(ImUrl::ChatRoleCreateMy),
            "chatRoleUpdateMy" => Ok(ImUrl::ChatRoleUpdateMy),
            "chatRoleDeleteMy" => Ok(ImUrl::ChatRoleDeleteMy),
            "chatRoleCategoryList" => Ok(ImUrl::ChatRoleCategoryList),
            "chatRoleCreate" => Ok(ImUrl::ChatRoleCreate),
            "chatRoleUpdate" => Ok(ImUrl::ChatRoleUpdate),
            "chatRoleDelete" => Ok(ImUrl::ChatRoleDelete),
            "chatRoleGet" => Ok(ImUrl::ChatRoleGet),
            "chatRolePage" => Ok(ImUrl::ChatRolePage),

            // ================ API 密钥 ================
            "apiKeyCreate" => Ok(ImUrl::ApiKeyCreate),
            "apiKeyUpdate" => Ok(ImUrl::ApiKeyUpdate),
            "apiKeyDelete" => Ok(ImUrl::ApiKeyDelete),
            "apiKeyGet" => Ok(ImUrl::ApiKeyGet),
            "apiKeyPage" => Ok(ImUrl::ApiKeyPage),
            "apiKeySimpleList" => Ok(ImUrl::ApiKeySimpleList),

            // ================ AI 工具 ================
            "toolCreate" => Ok(ImUrl::ToolCreate),
            "toolUpdate" => Ok(ImUrl::ToolUpdate),
            "toolDelete" => Ok(ImUrl::ToolDelete),
            "toolGet" => Ok(ImUrl::ToolGet),
            "toolPage" => Ok(ImUrl::ToolPage),
            "toolSimpleList" => Ok(ImUrl::ToolSimpleList),

            // ================ AI 图像 ================
            "imageMyPage" => Ok(ImUrl::ImageMyPage),
            "imagePublicPage" => Ok(ImUrl::ImagePublicPage),
            "imageGetMy" => Ok(ImUrl::ImageGetMy),
            "imageMyListByIds" => Ok(ImUrl::ImageMyListByIds),
            "imageDraw" => Ok(ImUrl::ImageDraw),
            "imageDeleteMy" => Ok(ImUrl::ImageDeleteMy),
            "imageMidjourneyImagine" => Ok(ImUrl::ImageMidjourneyImagine),
            "imageMidjourneyNotify" => Ok(ImUrl::ImageMidjourneyNotify),
            "imageMidjourneyAction" => Ok(ImUrl::ImageMidjourneyAction),
            "imagePage" => Ok(ImUrl::ImagePage),
            "imageUpdate" => Ok(ImUrl::ImageUpdate),
            "imageDelete" => Ok(ImUrl::ImageDelete),

            // ================ AI 知识库 ================
            "knowledgePage" => Ok(ImUrl::KnowledgePage),
            "knowledgeGet" => Ok(ImUrl::KnowledgeGet),
            "knowledgeCreate" => Ok(ImUrl::KnowledgeCreate),
            "knowledgeUpdate" => Ok(ImUrl::KnowledgeUpdate),
            "knowledgeDelete" => Ok(ImUrl::KnowledgeDelete),
            "knowledgeSimpleList" => Ok(ImUrl::KnowledgeSimpleList),

            // ================ AI 知识库文档 ================
            "knowledgeDocumentPage" => Ok(ImUrl::KnowledgeDocumentPage),
            "knowledgeDocumentGet" => Ok(ImUrl::KnowledgeDocumentGet),
            "knowledgeDocumentCreate" => Ok(ImUrl::KnowledgeDocumentCreate),
            "knowledgeDocumentCreateList" => Ok(ImUrl::KnowledgeDocumentCreateList),
            "knowledgeDocumentUpdate" => Ok(ImUrl::KnowledgeDocumentUpdate),
            "knowledgeDocumentUpdateStatus" => Ok(ImUrl::KnowledgeDocumentUpdateStatus),
            "knowledgeDocumentDelete" => Ok(ImUrl::KnowledgeDocumentDelete),

            // ================ AI 知识库段落 ================
            "knowledgeSegmentGet" => Ok(ImUrl::KnowledgeSegmentGet),
            "knowledgeSegmentPage" => Ok(ImUrl::KnowledgeSegmentPage),
            "knowledgeSegmentCreate" => Ok(ImUrl::KnowledgeSegmentCreate),
            "knowledgeSegmentUpdate" => Ok(ImUrl::KnowledgeSegmentUpdate),
            "knowledgeSegmentUpdateStatus" => Ok(ImUrl::KnowledgeSegmentUpdateStatus),
            "KnowledgeSegmentSplit" => Ok(ImUrl::KnowledgeSegmentSplit),
            "KnowledgeSegmentGetProcessList" => Ok(ImUrl::KnowledgeSegmentGetProcessList),
            "KnowledgeSegmentSearch" => Ok(ImUrl::KnowledgeSegmentSearch),

            // ================ AI 思维导图 ================
            "mindMapGenerateStream" => Ok(ImUrl::MindMapGenerateStream),
            "mindMapDelete" => Ok(ImUrl::MindMapDelete),
            "mindMapPage" => Ok(ImUrl::MindMapPage),

            // ================ AI 音乐 ================
            "musicMyPage" => Ok(ImUrl::MusicMyPage),
            "musicGenerate" => Ok(ImUrl::MusicGenerate),
            "musicDeleteMy" => Ok(ImUrl::MusicDeleteMy),
            "musicGetMy" => Ok(ImUrl::MusicGetMy),
            "musicUpdateMy" => Ok(ImUrl::MusicUpdateMy),
            "musicPage" => Ok(ImUrl::MusicPage),
            "musicDelete" => Ok(ImUrl::MusicDelete),
            "musicUpdate" => Ok(ImUrl::MusicUpdate),

            // ================ AI 工作流 ================
            "workflowCreate" => Ok(ImUrl::WorkflowCreate),
            "workflowUpdate" => Ok(ImUrl::WorkflowUpdate),
            "workflowDelete" => Ok(ImUrl::WorkflowDelete),
            "workflowGet" => Ok(ImUrl::WorkflowGet),
            "workflowPage" => Ok(ImUrl::WorkflowPage),
            "workflowTest" => Ok(ImUrl::WorkflowTest),

            // ================ AI 写作 ================
            "WriteGenerateStream" => Ok(ImUrl::WriteGenerateStream),
            "WriteDelete" => Ok(ImUrl::WriteDelete),
            "WritePage" => Ok(ImUrl::WritePage),

            // 未匹配的字符串
            _ => Err(anyhow::anyhow!("未知的URL类型: {}", s)),
        }
    }
}

impl FromStr for ImUrl {
    type Err = anyhow::Error;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_str(s)
    }
}

pub trait ImRequest {
    async fn login(&mut self, login_req: LoginReq) -> Result<Option<LoginResp>, anyhow::Error>;
    async fn refresh_token(
        &mut self,
        refresh_token_req: RefreshTokenReq,
    ) -> Result<Option<RefreshTokenResp>, anyhow::Error>;
}

// 测试
#[cfg(test)]
mod test {
    use serde_json::json;

    use crate::{
        im_request_client::{ImRequest, ImRequestClient},
        vo::vo::{LoginReq, LoginResp},
    };
    // #[tokio::test]
    // async fn test_get() -> Result<(), anyhow::Error> {
    //     let mut request_client = ImRequestClient::new("http://192.168.1.14:18760".to_string())?;
    //     request_client.set_token("1c40166d-e077-4581-a287-46cfeb942dec");
    //     request_client.set_refresh_token("e8fd2e8a64424a53a3f089482d6fad9e");

    //     let params = Some([("pageSize", "50"), ("cursor", "")]);

    //     let result: ApiResult<serde_json::Value> =
    //         request_client.get("im/user/friend/page", params).await?;

    //     info!("{:?}", serde_json::json!(result).to_string());
    //     Ok(())
    // }

    #[tokio::test]
    async fn test_login() -> Result<(), anyhow::Error> {
        let mut request_client = ImRequestClient::new("http://192.168.1.14:18760".to_string())?;
        let login_req = json!({
            "grantType": "PASSWORD",
            "systemType": "2",
            "deviceType": "MOBILE",
            "account": "ql",
            "client_id": "testClientId",
            "password": "123456"
        });
        let login_req: LoginReq = serde_json::from_value(login_req)?;
        let result: Option<LoginResp> = request_client.login(login_req).await?;
        println!("{:?}", serde_json::json!(result).to_string());
        Ok(())
    }
}
