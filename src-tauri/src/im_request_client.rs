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
    token: Option<String>,
    refresh_token: Option<String>,
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

    pub fn set_token(&mut self, token: &str) {
        self.token = Some(token.to_string());
    }

    pub fn set_refresh_token(&mut self, refresh_token: &str) {
        self.refresh_token = Some(refresh_token.to_string());
    }

    pub async fn request<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &mut self,
        method: http::Method,
        path: &str,
        body: Option<B>,
        params: Option<B>,
    ) -> Result<ApiResult<T>, anyhow::Error> {
        let mut retry_count = 0;
        const MAX_RETRY_COUNT: u8 = 2;

        loop {
            let url = format!("{}/{}", self.base_url, path);
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

            return Ok(result);
        }
    }

    pub async fn start_refresh_token(&mut self) -> Result<(), anyhow::Error> {
        info!("开始刷新token");
        let url = format!("{}/{}", self.base_url, ImUrl::RefreshToken.get_url());

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

    pub async fn get<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &mut self,
        path: &str,
        params: Option<B>,
    ) -> Result<ApiResult<T>, anyhow::Error> {
        self.request(http::Method::GET, path, None, params).await
    }

    pub async fn post<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &mut self,
        path: &str,
        body: Option<B>,
    ) -> Result<ApiResult<T>, anyhow::Error> {
        self.request(http::Method::POST, path, body, None).await
    }

    pub async fn im_request(&mut self, url: ImUrl, method: http::Method, body: Option<serde_json::Value>, params: Option<serde_json::Value>) -> Result<ApiResult<serde_json::Value>, anyhow::Error>{
      let result: ApiResult<serde_json::Value> = self.request(method, url.get_url(), body, params).await?;
      Ok(result)
    }
  }

impl ImRequest for ImRequestClient {
    async fn login(&mut self, login_req: LoginReq) -> Result<ApiResult<LoginResp>, anyhow::Error> {
        let result: ApiResult<LoginResp> =
            self.post(ImUrl::Login.get_url(), Some(login_req)).await?;

        let login_resp = result.clone();
        if login_resp.success {
            if let Some(data) = login_resp.data {
                self.token = Some(data.token.clone());
                self.refresh_token = Some(data.refresh_token.clone());
            }
        }

        Ok(result)
    }
}

enum ImUrl {
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
    GroupDetail,
    RevokeAdmin,
    AddAdmin,
    ExitGroup,
    AcceptInvite,
    InviteList,
    InviteGroupMember,
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
    GetAllUserBaseInfo,
    GetBadgesBatch,
    GetUserInfoBatch,
    GetMemberStatistic,
    GetBadgeList,
}

impl ImUrl {
    fn get_url(&self) -> &str {
        match self {
            // Token 相关
            ImUrl::Login => "oauth/anyTenant/login",
            ImUrl::RefreshToken => "oauth/anyTenant/refresh",
            ImUrl::ForgetPassword => "oauth/anyTenant/password",
            ImUrl::CheckToken => "oauth/check",
            ImUrl::Logout => "oauth/anyUser/logout",
            ImUrl::Register => "oauth/anyTenant/registerByEmail",

            // 系统相关
            ImUrl::GetQiniuToken => "system/anyTenant/ossToken",
            ImUrl::InitConfig => "system/anyTenant/config/init",
            ImUrl::FileUpload => "system/upload/url",

            // 验证码相关
            ImUrl::SendCaptcha => "oauth/anyTenant/sendEmailCode",
            ImUrl::GetCaptcha => "oauth/anyTenant/captcha",

            // 群公告相关
            ImUrl::EditAnnouncement => "im/room/announcement/edit",
            ImUrl::DeleteAnnouncement => "im/room/announcement/delete",
            ImUrl::PushAnnouncement => "im/room/announcement/push",
            ImUrl::GetAnnouncementList => "im/room/announcement/list",

            // 群聊申请相关
            ImUrl::ApplyGroupList => "im/room/apply/group/list",
            ImUrl::ApplyHandle => "im/room/apply/adminHandleApply",
            ImUrl::ApplyGroup => "im/room/apply/group",

            // 群聊搜索和管理
            ImUrl::SearchGroup => "im/room/search",
            ImUrl::UpdateMyRoomInfo => "im/room/updateMyRoomInfo",
            ImUrl::UpdateRoomInfo => "im/room/updateRoomInfo",
            ImUrl::GroupList => "im/room/group/list",
            ImUrl::GroupDetail => "im/room/group",

            // 群聊管理员
            ImUrl::RevokeAdmin => "im/room/group/admin",
            ImUrl::AddAdmin => "im/room/group/admin",

            // 群聊成员管理
            ImUrl::ExitGroup => "im/room/group/member/exit",
            ImUrl::AcceptInvite => "im/room/group/invite/accept",
            ImUrl::InviteList => "im/room/group/invite/list",
            ImUrl::InviteGroupMember => "im/room/group/member",
            ImUrl::CreateGroup => "im/room/group",

            // 聊天会话相关
            ImUrl::Shield => "im/chat/setShield",
            ImUrl::Notification => "im/chat/notification",
            ImUrl::DeleteSession => "im/chat/delete",
            ImUrl::SetSessionTop => "im/chat/setTop",
            ImUrl::SessionDetailWithFriends => "im/chat/contact/detail/friend",
            ImUrl::SessionDetail => "im/chat/contact/detail",

            // 消息已读未读
            ImUrl::GetMsgReadCount => "im/chat/msg/read",
            ImUrl::GetMsgReadList => "im/chat/msg/read/page",

            // 好友相关
            ImUrl::ModifyFriendRemark => "im/user/friend/updateRemark",
            ImUrl::DeleteFriend => "im/user/friend",
            ImUrl::SendAddFriendRequest => "im/room/apply/apply",
            ImUrl::HandleInvite => "im/room/apply/handler/apply",
            ImUrl::ApplyUnReadCount => "im/room/apply/unread",
            ImUrl::RequestApplyPage => "im/room/apply/page",
            ImUrl::GetContactList => "im/user/friend/page",
            ImUrl::SearchFriend => "im/user/friend/search",

            // 用户状态相关
            ImUrl::ChangeUserState => "im/user/state/changeState",
            ImUrl::GetAllUserState => "im/user/state/list",

            // 用户信息相关
            ImUrl::UploadAvatar => "im/user/avatar",
            ImUrl::GetEmoji => "im/user/emoji/list",
            ImUrl::DeleteEmoji => "im/user/emoji",
            ImUrl::AddEmoji => "im/user/emoji",
            ImUrl::SetUserBadge => "im/user/badge",
            ImUrl::ModifyUserName => "im/user/name",
            ImUrl::GetUserInfoDetail => "im/user/userInfo",
            ImUrl::GetUserInfoBatch => "im/user/summary/userInfo/batch",
            ImUrl::GetBadgesBatch => "im/user/badges/batch",
            ImUrl::GetBadgeList => "im/user/badges",
            ImUrl::BlockUser => "im/user/black",

            // 消息相关
            ImUrl::RecallMsg => "im/chat/msg/recall",
            ImUrl::MarkMsg => "im/chat/msg/mark",
            ImUrl::GetMsgList => "im/chat/msg/page",
            ImUrl::GetMemberStatistic => "im/chat/member/statistic",

            // 群成员信息
            ImUrl::GetAllUserBaseInfo => "im/room/group/member/list",
        }
    }
}

trait ImRequest {
    async fn login(&mut self, login_req: LoginReq) -> Result<ApiResult<LoginResp>, anyhow::Error>;
}

// 测试
mod test {
    use crate::im_request_client::ImRequest;
    use serde_json::json;
    use tracing::info;

    use crate::{
        im_request_client::ImRequestClient,
        pojo::common::ApiResult,
        vo::vo::{LoginReq, LoginResp},
    };

    #[tokio::test]
    async fn test_get() -> Result<(), anyhow::Error> {
        let mut request_client = ImRequestClient::new("http://192.168.1.14:18760".to_string())?;
        request_client.set_token("1c40166d-e077-4581-a287-46cfeb942dec");
        request_client.set_refresh_token("e8fd2e8a64424a53a3f089482d6fad9e");

        let params = Some([("pageSize", "50"), ("cursor", "")]);

        let result: ApiResult<serde_json::Value> =
            request_client.get("im/user/friend/page", params).await?;

        info!("{:?}", serde_json::json!(result).to_string());
        Ok(())
    }

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
        let result: ApiResult<LoginResp> = request_client.login(login_req).await?;
        println!("{:?}", serde_json::json!(result).to_string());
        Ok(())
    }
}
