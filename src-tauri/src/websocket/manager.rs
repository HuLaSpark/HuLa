use super::{client::WebSocketClient, types::*};
use anyhow::Result;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;
use tracing::{error, info, warn};

/// WebSocket 管理器
/// 负责管理 WebSocket 客户端实例的生命周期
pub struct WebSocketManager {
    client: Arc<RwLock<Option<WebSocketClient>>>,
    app_handle: AppHandle,
}

impl WebSocketManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            app_handle,
        }
    }

    /// 初始化 WebSocket 连接
    pub async fn init_connection(&self, config: WebSocketConfig) -> Result<()> {
        info!("🚀 初始化 WebSocket 管理器");

        // 停止现有连接
        self.disconnect().await;

        // 创建新的客户端
        let client = WebSocketClient::new(self.app_handle.clone());

        // 启动连接
        if let Err(e) = client.connect(config).await {
            error!("❌ WebSocket 连接失败: {}", e);
            return Err(e);
        }

        // 存储客户端实例
        *self.client.write().await = Some(client);

        info!("✅ WebSocket 管理器初始化完成");
        Ok(())
    }

    /// 断开连接
    pub async fn disconnect(&self) {
        let mut client_guard = self.client.write().await;
        if let Some(client) = client_guard.take() {
            info!("📡 断开 WebSocket 连接");
            client.disconnect().await;
        }
    }

    /// 发送消息
    pub async fn send_message(&self, data: serde_json::Value) -> Result<()> {
        let client_guard = self.client.read().await;
        if let Some(client) = client_guard.as_ref() {
            client.send_message(data).await
        } else {
            warn!("⚠️ WebSocket 未连接，无法发送消息");
            Err(anyhow::anyhow!("WebSocket not connected"))
        }
    }

    /// 获取连接状态
    pub async fn get_state(&self) -> ConnectionState {
        let client_guard = self.client.read().await;
        if let Some(client) = client_guard.as_ref() {
            client.get_state().await
        } else {
            ConnectionState::Disconnected
        }
    }

    /// 获取连接健康状态
    pub async fn get_health_status(&self) -> Option<ConnectionHealth> {
        let client_guard = self.client.read().await;
        if let Some(client) = client_guard.as_ref() {
            Some(client.get_health_status().await)
        } else {
            None
        }
    }

    /// 强制重连
    pub async fn force_reconnect(&self) -> Result<()> {
        let client_guard = self.client.read().await;
        if let Some(client) = client_guard.as_ref() {
            client.force_reconnect().await
        } else {
            warn!("⚠️ WebSocket 未初始化，无法重连");
            Err(anyhow::anyhow!("WebSocket not initialized"))
        }
    }

    /// 更新配置
    pub async fn update_config(&self, config: WebSocketConfig) -> Result<()> {
        let client_guard = self.client.read().await;
        if let Some(client) = client_guard.as_ref() {
            client.update_config(config).await;
            Ok(())
        } else {
            warn!("⚠️ WebSocket 未初始化，无法更新配置");
            Err(anyhow::anyhow!("WebSocket not initialized"))
        }
    }

    /// 检查是否已连接
    pub async fn is_connected(&self) -> bool {
        matches!(self.get_state().await, ConnectionState::Connected)
    }
}

/// 获取全局 WebSocket 管理器
pub fn get_websocket_manager(app_handle: &AppHandle) -> Arc<WebSocketManager> {
    app_handle
        .try_state::<Arc<WebSocketManager>>()
        .map(|state| state.inner().clone())
        .unwrap_or_else(|| {
            // 如果不存在，创建新实例并存储
            let manager = Arc::new(WebSocketManager::new(app_handle.clone()));
            app_handle.manage(manager.clone());
            manager
        })
}
