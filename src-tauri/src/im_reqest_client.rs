use crate::error::CommonError;
use crate::pojo::common::ApiResult;

use base64::{Engine as _, engine::general_purpose};
use reqwest::{Client, Method, RequestBuilder, header};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, info, warn};

/// 智能 HTTP 客户端，支持自动 token 管理和过期重试
pub struct ImRequestClient {
    client: Client,
    base_url: String,
    pub token: Arc<Mutex<Option<String>>>,
    pub refresh_token: Arc<Mutex<Option<String>>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl ImRequestClient {
    /// 创建新的请求客户端
    pub async fn new(base_url: String) -> Result<Self, CommonError> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .connect_timeout(std::time::Duration::from_secs(10)) // 连接超时
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            client,
            base_url,
            token: Arc::new(Mutex::new(None)),
            refresh_token: Arc::new(Mutex::new(None)),
            app_handle: Arc::new(Mutex::new(None)),
        })
    }

    /// 设置 AppHandle
    pub fn set_app_handle(&self, app_handle: AppHandle) {
        if let Ok(mut handle) = self.app_handle.lock() {
            *handle = Some(app_handle);
        }
    }

    /// 发送 GET 请求
    pub fn get(&self, path: &str) -> RequestBuilderWrapper {
        self.request(Method::GET, path)
    }

    /// 发送 POST 请求
    pub fn post(&self, path: &str) -> RequestBuilderWrapper {
        self.request(Method::POST, path)
    }

    /// 发送 PUT 请求
    pub fn put(&self, path: &str) -> RequestBuilderWrapper {
        self.request(Method::PUT, path)
    }

    /// 发送 DELETE 请求
    pub fn delete(&self, path: &str) -> RequestBuilderWrapper {
        self.request(Method::DELETE, path)
    }

    /// 创建请求构建器
    fn request(&self, method: Method, path: &str) -> RequestBuilderWrapper {
        let url = if path.starts_with("http") {
            path.to_string()
        } else {
            format!(
                "{}/{}",
                self.base_url.trim_end_matches('/'),
                path.trim_start_matches('/')
            )
        };

        let request_builder = self.client.request(method.clone(), &url);

        // 注意：这里不能直接获取 token，因为这是同步方法
        // token 将在发送请求时异步获取

        RequestBuilderWrapper {
            request_builder,
            client: self,
            url,
            method,
            json_body: None,
            headers: Vec::new(),
            query_params: None,
        }
    }

    /// 刷新 token
    pub async fn refresh_token(&self) -> Result<(), CommonError> {
        let current_refresh_token = {
            // 使用 try_lock 避免死锁，不跨 await 持有锁
            match self.refresh_token.try_lock() {
                Ok(guard) => guard.clone(),
                Err(_) => {
                    // 如果无法立即获取锁，则返回错误
                    return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                        "Unable to acquire refresh_token lock, possible lock contention"
                    )));
                }
            }
        };

        // 检查 refresh_token 是否为 None
        let refresh_token_value = match current_refresh_token {
            Some(token) => token,
            None => {
                error!("Attempting to refresh token but refresh_token is empty");
                return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                    "refresh_token is empty, unable to refresh token"
                )));
            }
        };

        info!("Starting to refresh token...");
        // 构建刷新 token 的请求
        let refresh_url = format!("{}/oauth/anyTenant/refresh", self.base_url);
        let request_builder = self.client.request(Method::POST, &refresh_url);

        // 发送请求
        let basic_auth = general_purpose::STANDARD.encode("luohuo_web_pro:luohuo_web_pro_secret");
        let response = request_builder
            .header("Authorization", basic_auth)
            .json(&HashMap::from([("refreshToken", refresh_token_value)]))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to send refresh token request: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to read refresh token response body: {}", e))?;

        // 解析响应
        #[derive(serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct RefreshTokenResponse {
            token: String,
            refresh_token: String,
        }

        let result: ApiResult<RefreshTokenResponse> = match serde_json::from_str(&response_text) {
            Ok(result) => result,
            Err(e) => {
                error!("Refresh token JSON parsing error: {}", e);
                error!("Response content: {}", response_text);
                return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                    "解析刷新 token 响应失败: {}",
                    e
                )));
            }
        };

        if !result.success {
            error!(
                "刷新 token 失败: {}",
                result.msg.clone().unwrap_or_default()
            );
            return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "刷新 token 失败！"
            )));
        }

        // 更新 token 和 refresh_token
        if let Some(data) = result.data {
            info!("Token refresh successful");

            // 分别更新 token 和 refresh_token，避免跨 await 持有锁
            // 更新 token
            if let Ok(mut token_guard) = self.token.try_lock() {
                *token_guard = Some(data.token.clone());
            } else {
                warn!("Failed to update token: unable to acquire lock");
            }

            // 更新 refresh_token
            if let Ok(mut refresh_token_guard) = self.refresh_token.try_lock() {
                *refresh_token_guard = Some(data.refresh_token);
            } else {
                warn!("Failed to update refresh_token: unable to acquire lock");
            }

            Ok(())
        } else {
            error!("Refresh token response data is empty");
            Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "刷新 token 响应数据为空"
            )))
        }
    }
}

/// 请求构建器包装器，支持自动重试
pub struct RequestBuilderWrapper<'a> {
    request_builder: RequestBuilder,
    client: &'a ImRequestClient,
    url: String,
    method: Method,
    json_body: Option<String>,
    headers: Vec<(String, String)>,
    query_params: Option<String>,
}

impl<'a> RequestBuilderWrapper<'a> {
    /// 添加查询参数
    pub fn query<T: serde::Serialize + ?Sized>(mut self, query: &T) -> Self {
        // 序列化查询参数以便重试时使用和日志记录
        if let Ok(query_string) = serde_json::to_string(query) {
            self.query_params = Some(query_string);
        }
        self.request_builder = self.request_builder.query(query);
        self
    }

    /// 添加 JSON 请求体
    pub fn json<T: serde::Serialize + ?Sized>(mut self, json: &T) -> Self {
        // 序列化 JSON 体以便重试时使用
        if let Ok(json_string) = serde_json::to_string(json) {
            self.json_body = Some(json_string);
        }
        self.request_builder = self.request_builder.json(json);
        self
    }

    /// 添加请求头
    pub fn header<K, V>(mut self, key: K, value: V) -> Self
    where
        header::HeaderName: TryFrom<K>,
        <header::HeaderName as TryFrom<K>>::Error: Into<http::Error>,
        header::HeaderValue: TryFrom<V>,
        <header::HeaderValue as TryFrom<V>>::Error: Into<http::Error>,
        K: Clone,
        V: Clone,
    {
        // 记录请求头以便重试时使用
        if let (Ok(header_name), Ok(header_value)) = (
            header::HeaderName::try_from(key.clone()).map_err(|e| e.into()),
            header::HeaderValue::try_from(value.clone()).map_err(|e| e.into()),
        ) {
            self.headers.push((
                header_name.to_string(),
                header_value.to_str().unwrap_or_default().to_string(),
            ));
        }
        self.request_builder = self.request_builder.header(key, value);
        self
    }

    /// 发送请求并解析 JSON 响应，支持自动 token 刷新
    pub async fn send_json<T: serde::de::DeserializeOwned>(
        mut self,
    ) -> Result<ApiResult<T>, CommonError> {
        // 记录请求信息
        let mut log_message = format!("Sending request to: {} [{}]", self.url, self.method);

        // 添加查询参数信息
        if let Some(ref query_params) = self.query_params {
            log_message.push_str(&format!(" Query params: {}", query_params));
        }

        // 添加请求体信息
        if let Some(ref json_body) = self.json_body {
            log_message.push_str(&format!(" Request body: {}", json_body));
        }

        info!("{}", log_message);

        // 获取 token 并添加到请求头，避免跨 await 持有锁
        let current_token = match self.client.token.try_lock() {
            Ok(token_guard) => token_guard.clone(),
            Err(_) => {
                warn!("Unable to immediately acquire token lock");
                None
            }
        };

        // 添加基础认证头
        let basic_auth = general_purpose::STANDARD.encode("luohuo_web_pro:luohuo_web_pro_secret");
        self.request_builder = self.request_builder.header("Authorization", basic_auth);

        if let Some(token) = &current_token {
            self.request_builder = self.request_builder.header("token", token);
        } else {
            warn!("No token set");
        }

        let response = self.request_builder.send().await.map_err(|e| {
            anyhow::anyhow!(
                "[{}:{}] Failed to send request '{}': {}",
                file!(),
                line!(),
                self.url,
                e
            )
        })?;

        let response_text = response.text().await.map_err(|e| {
            anyhow::anyhow!(
                "[{}:{}] Failed to read response body: {}",
                file!(),
                line!(),
                e
            )
        })?;

        debug!("Starting to parse response");
        // 解析为目标类型
        let result: ApiResult<T> = match serde_json::from_str(&response_text) {
            Ok(result) => result,
            Err(e) => {
                error!("JSON parsing error: {}", e);
                // error!("响应内容: {}", response_text);
                return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                    "Failed to parse JSON: {}",
                    e
                )));
            }
        };

        // token 过期，尝试刷新 token 并重试
        if result.code == Some(406) {
            info!("Detected token expiration, attempting to refresh token");

            // 尝试刷新 token
            match self.client.refresh_token().await {
                Ok(()) => {
                    info!("Token refresh successful, resending request");

                    // 重新构建请求（因为原来的 request_builder 已经被消费了）
                    let mut new_request_builder =
                        self.client.client.request(self.method.clone(), &self.url);

                    // 添加保存的 JSON 体
                    if let Some(json_body) = &self.json_body {
                        new_request_builder = new_request_builder
                            .header(header::CONTENT_TYPE, "application/json")
                            .body(json_body.clone());
                    }

                    // 添加保存的请求头
                    for (key, value) in &self.headers {
                        new_request_builder = new_request_builder.header(key, value);
                    }

                    // 获取新的 token
                    let new_token = {
                        if let Ok(token_guard) = self.client.token.lock() {
                            token_guard.clone()
                        } else {
                            None
                        }
                    };

                    // 添加基础认证头
                    let basic_auth =
                        general_purpose::STANDARD.encode("luohuo_web_pro:luohuo_web_pro_secret");
                    new_request_builder = new_request_builder.header("Authorization", basic_auth);

                    if let Some(token) = &new_token {
                        new_request_builder = new_request_builder.header("token", token);
                    }

                    // 重新发送请求
                    info!("Retrying request to: {}", self.url);
                    let retry_response = new_request_builder.send().await.map_err(|e| {
                        anyhow::anyhow!(
                            "[{}:{}] Failed to retry request '{}': {}",
                            file!(),
                            line!(),
                            self.url,
                            e
                        )
                    })?;

                    let retry_response_text = retry_response.text().await.map_err(|e| {
                        anyhow::anyhow!(
                            "[{}:{}] Failed to read retry response body: {}",
                            file!(),
                            line!(),
                            e
                        )
                    })?;

                    // 解析重试响应
                    let retry_result: ApiResult<T> =
                        match serde_json::from_str(&retry_response_text) {
                            Ok(result) => result,
                            Err(e) => {
                                error!("Retry request JSON parsing error: {}", e);
                                // error!("响应内容: {}", retry_response_text);
                                return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                                    "Failed to parse retry request JSON: {}",
                                    e
                                )));
                            }
                        };

                    if !&retry_result.success {
                        error!(
                            "Retry request failed: {}",
                            &retry_result.msg.clone().unwrap_or_default()
                        );
                        return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                            "Retry request failed!"
                        )));
                    }

                    debug!("Retry request successful");

                    // 发送 token_expired 事件到前端，包含当前的 token 和 refreshToken
                    if let Ok(app_handle_guard) = self.client.app_handle.lock() {
                        if let Some(app_handle) = app_handle_guard.as_ref() {
                            let token_info = {
                                let current_token =
                                    if let Ok(token_guard) = self.client.token.lock() {
                                        token_guard.clone()
                                    } else {
                                        warn!("Failed to acquire token lock");
                                        None
                                    };
                                let current_refresh_token = if let Ok(refresh_token_guard) =
                                    self.client.refresh_token.lock()
                                {
                                    refresh_token_guard.clone()
                                } else {
                                    warn!("Failed to acquire refresh_token lock");
                                    None
                                };
                                serde_json::json!({
                                    "token": current_token,
                                    "refreshToken": current_refresh_token
                                })
                            };

                            if let Err(emit_err) =
                                app_handle.emit("refresh_token_event", token_info)
                            {
                                error!("Failed to send refresh_token event: {:?}", emit_err);
                            }
                        }
                    }

                    return Ok(retry_result);
                }
                Err(e) => {
                    error!("Failed to refresh token: {:?}", e);
                    return Err(CommonError::TokenExpired);
                }
            }
        }

        if !&result.success {
            error!(
                "Request failed: {}",
                &result.msg.clone().unwrap_or_default()
            );
            return Err(CommonError::UnexpectedError(anyhow::anyhow!(
                "Request failed!"
            )));
        }

        debug!("Parsing completed");
        Ok(result)
    }
}
