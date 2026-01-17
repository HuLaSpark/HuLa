use crate::im_request_client::ImRequestClient;
use crate::repository::im_user_repository;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tracing::{info, warn};

#[derive(Clone, Debug)]
pub struct TokenSnapshot {
    pub token: Option<String>,
    pub refresh_token: Option<String>,
}

/// Token 刷新检测器
/// 用于在 im_request 调用前后检测 token 是否被刷新，并自动持久化到数据库
pub struct TokenRefreshGuard {
    old_tokens: TokenSnapshot,
}

impl TokenRefreshGuard {
    /// 在 im_request 调用前创建，记录当前的 token 和 refresh_token
    pub async fn before_request(client: &Mutex<ImRequestClient>) -> Self {
        let old_tokens = capture_token_snapshot(client).await;
        Self { old_tokens }
    }

    /// 在 im_request 调用后检查 token 是否被刷新，如果是则持久化到数据库
    pub async fn persist_if_refreshed(
        &self,
        client: &Mutex<ImRequestClient>,
        db_conn: &RwLock<DatabaseConnection>,
        uid: &str,
    ) {
        if uid.is_empty() {
            return;
        }

        let (new_token, new_refresh_token, token_changed) = {
            let c = client.lock().await;
            let changed = self.old_tokens.token != c.token
                || self.old_tokens.refresh_token != c.refresh_token;
            (c.token.clone(), c.refresh_token.clone(), changed)
        };

        if token_changed {
            if let (Some(token), Some(refresh_token)) = (new_token, new_refresh_token) {
                match im_user_repository::save_user_tokens(
                    &*db_conn.read().await,
                    uid,
                    &token,
                    &refresh_token,
                )
                .await
                {
                    Ok(_) => {
                        info!(
                            "[TOKEN_PERSIST] SUCCESS: tokens saved for uid: {}, token_len: {}, refresh_len: {}",
                            uid,
                            token.len(),
                            refresh_token.len()
                        );
                    }
                    Err(e) => {
                        warn!(
                            "[TOKEN_PERSIST] FAILED: error saving tokens for uid {}: {}",
                            uid, e
                        );
                    }
                }
            }
        }
    }
}

/// 便捷函数：在 im_request 后检查并持久化刷新的 token
///
/// # Arguments
/// * `old_tokens` - 请求前的 token 快照
/// * `client` - ImRequestClient 的锁
/// * `db_conn` - 数据库连接的锁
/// * `uid` - 用户 ID
pub async fn persist_token_if_refreshed(
    old_tokens: &TokenSnapshot,
    client: &Mutex<ImRequestClient>,
    db_conn: &RwLock<DatabaseConnection>,
    uid: &str,
) {
    if uid.is_empty() {
        return;
    }

    let (new_token, new_refresh_token, token_changed) = {
        let c = client.lock().await;
        let changed = old_tokens.token != c.token || old_tokens.refresh_token != c.refresh_token;
        (c.token.clone(), c.refresh_token.clone(), changed)
    };

    if token_changed {
        if let (Some(token), Some(refresh_token)) = (new_token, new_refresh_token) {
            match im_user_repository::save_user_tokens(
                &*db_conn.read().await,
                uid,
                &token,
                &refresh_token,
            )
            .await
            {
                Ok(_) => {
                    info!(
                        "[TOKEN_PERSIST] SUCCESS: tokens saved for uid: {}, token_len: {}, refresh_len: {}",
                        uid,
                        token.len(),
                        refresh_token.len()
                    );
                }
                Err(e) => {
                    warn!(
                        "[TOKEN_PERSIST] FAILED: error saving tokens for uid {}: {}",
                        uid, e
                    );
                }
            }
        }
    }
}

/// 便捷函数：获取当前的 token 快照用于后续比较
pub async fn capture_token_snapshot(client: &Mutex<ImRequestClient>) -> TokenSnapshot {
    let c = client.lock().await;
    TokenSnapshot {
        token: c.token.clone(),
        refresh_token: c.refresh_token.clone(),
    }
}

pub async fn capture_token_snapshot_arc(client: &Arc<Mutex<ImRequestClient>>) -> TokenSnapshot {
    capture_token_snapshot(client.as_ref()).await
}

pub fn capture_token_snapshot_direct(client: &ImRequestClient) -> TokenSnapshot {
    TokenSnapshot {
        token: client.token.clone(),
        refresh_token: client.refresh_token.clone(),
    }
}

/// 便捷函数：获取当前的 refresh_token 用于后续比较
pub async fn capture_refresh_token(client: &Mutex<ImRequestClient>) -> Option<String> {
    client.lock().await.refresh_token.clone()
}

/// 便捷函数：使用 Arc 包装的类型
pub async fn persist_token_if_refreshed_arc(
    old_tokens: &TokenSnapshot,
    client: &Arc<Mutex<ImRequestClient>>,
    db_conn: &Arc<RwLock<DatabaseConnection>>,
    uid: &str,
) {
    persist_token_if_refreshed(old_tokens, client.as_ref(), db_conn.as_ref(), uid).await
}

pub async fn capture_refresh_token_arc(client: &Arc<Mutex<ImRequestClient>>) -> Option<String> {
    capture_refresh_token(client.as_ref()).await
}

/// 便捷函数：使用直接引用的 ImRequestClient（不需要 Mutex）
pub async fn persist_token_if_refreshed_direct(
    old_tokens: &TokenSnapshot,
    client: &ImRequestClient,
    db_conn: &DatabaseConnection,
    uid: &str,
) {
    if uid.is_empty() {
        return;
    }

    let token_changed =
        old_tokens.token != client.token || old_tokens.refresh_token != client.refresh_token;

    if token_changed {
        if let (Some(token), Some(refresh_token)) =
            (client.token.clone(), client.refresh_token.clone())
        {
            match im_user_repository::save_user_tokens(db_conn, uid, &token, &refresh_token).await {
                Ok(_) => {
                    info!(
                        "[TOKEN_PERSIST] SUCCESS: tokens saved for uid: {}, token_len: {}, refresh_len: {}",
                        uid,
                        token.len(),
                        refresh_token.len()
                    );
                }
                Err(e) => {
                    warn!(
                        "[TOKEN_PERSIST] FAILED: error saving tokens for uid {}: {}",
                        uid, e
                    );
                }
            }
        }
    }
}
