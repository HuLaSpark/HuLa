use std::time::Duration;

/// 应用级别的超时配置
pub struct TimeoutConfig;

impl TimeoutConfig {
    /// 数据库连接超时
    pub const DATABASE_CONNECT_TIMEOUT: Duration = Duration::from_secs(30);

    /// 数据库操作超时
    pub const DATABASE_OPERATION_TIMEOUT: Duration = Duration::from_secs(120);

    /// HTTP 请求超时
    pub const HTTP_REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

    /// HTTP 连接超时
    pub const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

    /// 目录扫描超时
    pub const DIRECTORY_SCAN_TIMEOUT: Duration = Duration::from_secs(300);

    /// 应用初始化超时
    pub const APP_INIT_TIMEOUT: Duration = Duration::from_secs(60);

    /// 锁获取超时
    pub const LOCK_ACQUIRE_TIMEOUT: Duration = Duration::from_millis(100);

    /// Token 刷新超时
    pub const TOKEN_REFRESH_TIMEOUT: Duration = Duration::from_secs(30);
}

/// 为异步操作添加超时的辅助函数
pub async fn with_timeout<T, F>(
    future: F,
    timeout: Duration,
    operation_name: &str,
) -> Result<T, crate::error::CommonError>
where
    F: std::future::Future<Output = Result<T, crate::error::CommonError>>,
{
    match tokio::time::timeout(timeout, future).await {
        Ok(result) => result,
        Err(_) => {
            tracing::error!("Operation '{}' timed out after {:?}", operation_name, timeout);
            Err(crate::error::CommonError::UnexpectedError(anyhow::anyhow!(
                "Operation '{}' timed out after {:?}",
                operation_name,
                timeout
            )))
        }
    }
}
