use std::str::FromStr;

use anyhow::Ok;
use base64::{Engine, prelude::BASE64_STANDARD};
use reqwest::header;
use serde_json::json;
use tracing::{error, info};

use crate::{
    pojo::common::ApiResult,
    vo::vo::{LoginReq, LoginResp},
};

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
            info!("请求地址: {}", &url);

            let mut request_builder = self.client.request(method.clone(), &url);

            // 设置请求头
            if let Some(token) = self.token.clone() {
                info!("使用token: {:?}", token);
                request_builder = request_builder.header("token", token);
            }

            // 设置请求体
            if let Some(body) = &body {
                request_builder = request_builder.json(body);
            }

            if let Some(params) = &params {
                request_builder = request_builder.query(params);
            }

            // 发送请求
            let response = request_builder.send().await?;
            let result: ApiResult<T> = response.json().await?;

            // 如果code为406，则刷新token
            if result.code == Some(406) {
                if retry_count >= MAX_RETRY_COUNT {
                    return Err(anyhow::anyhow!("token过期，刷新token失败"));
                }

                info!("token过期，开始刷新token");
                self.start_refresh_token().await?;
                retry_count += 1;
                continue;
            }

            info!("请求成功: {}", &url);
            return Ok(result);
        }
    }

    pub async fn start_refresh_token(&mut self) -> Result<(), anyhow::Error> {
        info!("开始刷新token");
        let url = format!("{}/{}", self.base_url, ImUrl::RefreshToken.get_url().1);

        let body = json!({
          "refreshToken": self.refresh_token.clone().unwrap()
        });

        let request_builder = self.client.request(http::Method::POST, &url);
        let response = request_builder.json(&body).send().await?;
        let result: ApiResult<serde_json::Value> = response.json().await?;

        if !result.success {
            error!("刷新token失败: {}", result.msg.clone().unwrap_or_default());
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
    SendCaptcha,
    GetCaptcha,
    EditAnnouncement,
    DeleteAnnouncement,
    PushAnnouncement,
    GetAnnouncementList,
    ApplyGroupList,
    ApplyHandle,
    ApplyGroup,
    SearchGroup,
    UpdateMyRoomInfo,
    UpdateRoomInfo,
    GroupList,
    GroupListMember,
    GroupDetail,
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
    ApplyUnReadCount,
    RequestApplyPage,
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
    ModifyUserName,
    GetUserInfoDetail,
    GetMsgList,
    GetMsgPage,
    GetAllUserBaseInfo,
    GetBadgesBatch,
    GetUserInfoBatch,
    GetMemberStatistic,
    GetBadgeList,
    SendMsg,
    SetHide,
    GetFriendPage,
    MarkMsgRead,
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

            // 验证码相关
            ImUrl::SendCaptcha => (http::Method::POST, "oauth/anyTenant/sendEmailCode"),
            ImUrl::GetCaptcha => (http::Method::GET, "oauth/anyTenant/captcha"),

            // 群公告相关
            ImUrl::EditAnnouncement => (http::Method::POST, "im/room/announcement/edit"),
            ImUrl::DeleteAnnouncement => (http::Method::POST, "im/room/announcement/delete"),
            ImUrl::PushAnnouncement => (http::Method::POST, "im/room/announcement/push"),
            ImUrl::GetAnnouncementList => (http::Method::GET, "im/room/announcement/list"),

            // 群聊申请相关
            ImUrl::ApplyGroupList => (http::Method::GET, "im/room/apply/group/list"),
            ImUrl::ApplyHandle => (http::Method::POST, "im/room/apply/adminHandleApply"),
            ImUrl::ApplyGroup => (http::Method::POST, "im/room/apply/group"),

            // 群聊搜索和管理
            ImUrl::SearchGroup => (http::Method::GET, "im/room/search"),
            ImUrl::UpdateMyRoomInfo => (http::Method::POST, "im/room/updateMyRoomInfo"),
            ImUrl::UpdateRoomInfo => (http::Method::POST, "im/room/updateRoomInfo"),
            ImUrl::GroupList => (http::Method::GET, "im/room/group/list"),
            ImUrl::GroupListMember => (http::Method::GET, "im/room/group/listMember"),
            ImUrl::GroupDetail => (http::Method::GET, "im/room/group"),

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
            ImUrl::ApplyUnReadCount => (http::Method::GET, "im/room/apply/unread"),
            ImUrl::RequestApplyPage => (http::Method::GET, "im/room/apply/page"),
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
            ImUrl::ModifyUserName => (http::Method::PUT, "im/user/name"),
            ImUrl::GetUserInfoDetail => (http::Method::GET, "im/user/userInfo"),
            ImUrl::GetUserInfoBatch => (http::Method::POST, "im/user/summary/userInfo/batch"),
            ImUrl::GetBadgesBatch => (http::Method::POST, "im/user/badges/batch"),
            ImUrl::GetBadgeList => (http::Method::GET, "im/user/badges"),
            ImUrl::BlockUser => (http::Method::PUT, "im/user/black"),

            // 消息相关
            ImUrl::RecallMsg => (http::Method::PUT, "im/chat/msg/recall"),
            ImUrl::MarkMsg => (http::Method::PUT, "im/chat/msg/mark"),
            ImUrl::GetMsgPage => (http::Method::GET, "im/chat/msg/page"),
            ImUrl::GetMsgList => (http::Method::GET, "im/chat/msg/list"),
            ImUrl::GetMemberStatistic => (http::Method::GET, "im/chat/member/statistic"),

            // 群成员信息
            ImUrl::GetAllUserBaseInfo => (http::Method::GET, "im/room/group/member/list"),
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

            // 验证码相关
            "sendCaptcha" => Ok(ImUrl::SendCaptcha),
            "getCaptcha" => Ok(ImUrl::GetCaptcha),

            // 群公告相关
            "editAnnouncement" => Ok(ImUrl::EditAnnouncement),
            "deleteAnnouncement" => Ok(ImUrl::DeleteAnnouncement),
            "pushAnnouncement" => Ok(ImUrl::PushAnnouncement),
            "getAnnouncementList" => Ok(ImUrl::GetAnnouncementList),

            // 群聊申请相关
            "applyGroupList" => Ok(ImUrl::ApplyGroupList),
            "applyHandle" => Ok(ImUrl::ApplyHandle),
            "applyGroup" => Ok(ImUrl::ApplyGroup),

            // 群聊搜索和管理
            "searchGroup" => Ok(ImUrl::SearchGroup),
            "updateMyRoomInfo" => Ok(ImUrl::UpdateMyRoomInfo),
            "updateRoomInfo" => Ok(ImUrl::UpdateRoomInfo),
            "groupList" => Ok(ImUrl::GroupList),
            "groupDetail" => Ok(ImUrl::GroupDetail),

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
            "applyUnReadCount" => Ok(ImUrl::ApplyUnReadCount),
            "requestApplyPage" => Ok(ImUrl::RequestApplyPage),
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
            "modifyUserName" => Ok(ImUrl::ModifyUserName),
            "getUserInfoDetail" => Ok(ImUrl::GetUserInfoDetail),
            "getUserInfoBatch" => Ok(ImUrl::GetUserInfoBatch),
            "getBadgesBatch" => Ok(ImUrl::GetBadgesBatch),
            "getBadgeList" => Ok(ImUrl::GetBadgeList),
            "blockUser" => Ok(ImUrl::BlockUser),

            // 消息相关
            "recallMsg" => Ok(ImUrl::RecallMsg),
            "markMsg" => Ok(ImUrl::MarkMsg),
            "getMsgList" => Ok(ImUrl::GetMsgList),
            "getMsgPage" => Ok(ImUrl::GetMsgPage),
            "getMemberStatistic" => Ok(ImUrl::GetMemberStatistic),

            // 群成员信息
            "getAllUserBaseInfo" => Ok(ImUrl::GetAllUserBaseInfo),
            "sendMsg" => Ok(ImUrl::SendMsg),
            "setHide" => Ok(ImUrl::SetHide),
            "getFriendPage" => Ok(ImUrl::GetFriendPage),
            "markMsgRead" => Ok(ImUrl::MarkMsgRead),
            "groupListMember" => Ok(ImUrl::GroupListMember),

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
            "password": "123456"
        });
        let login_req: LoginReq = serde_json::from_value(login_req)?;
        let result: Option<LoginResp> = request_client.login(login_req).await?;
        println!("{:?}", serde_json::json!(result).to_string());
        Ok(())
    }
}
