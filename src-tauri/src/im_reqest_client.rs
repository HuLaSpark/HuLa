use crate::error::CommonError;
use anyhow::Context;
use reqwest::{header, Client, Method, RequestBuilder};

/// 智能 HTTP 客户端，支持自动 token 管理和过期重试
pub struct ImRequestClient {
    client: Client,
    base_url: String,
    pub token: Option<String>,
}

impl ImRequestClient {
    /// 创建新的请求客户端
    pub async fn new(
        base_url: String,
    ) -> Result<Self, CommonError> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .with_context(|| "创建 HTTP 客户端失败")?;

        Ok(Self {
            client,
            base_url,
            token: None,
        })
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
            format!("{}/{}", self.base_url.trim_end_matches('/'), path.trim_start_matches('/'))
        };

        let request_builder = self.client.request(method, &url);

        // 注意：这里不能直接获取 token，因为这是同步方法
        // token 将在发送请求时异步获取

        RequestBuilderWrapper {
            request_builder,
            client: self,
            url,
        }
    }
}

/// 请求构建器包装器，支持自动重试
pub struct RequestBuilderWrapper<'a> {
    request_builder: RequestBuilder,
    client: &'a ImRequestClient,
    url: String,
}

impl<'a> RequestBuilderWrapper<'a> {
    /// 添加查询参数
    pub fn query<T: serde::Serialize + ?Sized>(mut self, query: &T) -> Self {
        self.request_builder = self.request_builder.query(query);
        self
    }

    /// 添加 JSON 请求体
    pub fn json<T: serde::Serialize + ?Sized>(mut self, json: &T) -> Self {
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
    {
        self.request_builder = self.request_builder.header(key, value);
        self
    }
    
    /// 发送请求并解析 JSON 响应，支持自动 token 刷新
    pub async fn send_json<T: serde::de::DeserializeOwned>(mut self) -> Result<T, CommonError> {
        // 获取 token 并添加到请求头
        if let Some(token) = &self.client.token {
            self.request_builder = self.request_builder.header(header::AUTHORIZATION, format!("Bearer {}", token));
        }
    
        // 第一次尝试
        let response = self.request_builder
            .send()
            .await
            .with_context(|| format!("[{}:{}] 发送请求失败: {}", file!(), line!(), self.url))?;

        let response_text = response
            .text()
            .await
            .with_context(|| format!("[{}:{}] 读取响应体失败", file!(), line!()))?;

        // 解析为目标类型
        serde_json::from_str(&response_text)
            .with_context(|| format!("[{}:{}] 解析 JSON 为目标类型失败", file!(), line!()))
            .map_err(|e| e.into())
    }
}