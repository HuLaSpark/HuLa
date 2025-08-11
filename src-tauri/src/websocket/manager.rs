use super::{client::WebSocketClient, types::*};
use anyhow::Result;
use std::sync::{Arc, OnceLock};
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;
use tracing::{error, info, warn};

// 全局 WebSocket 管理器实例
static GLOBAL_WS_MANAGER: OnceLock<Arc<WebSocketManager>> = OnceLock::new();

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
        {
            let mut client_guard = self.client.write().await;
            *client_guard = Some(client);
            info!("✅ WebSocket 客户端实例已存储到管理器");
        }

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
        info!("📤 尝试发送消息: {}", data.to_string().chars().take(100).collect::<String>());

        let client_guard = self.client.read().await;
        if let Some(client) = client_guard.as_ref() {
            // 检查实际连接状态
            let state = client.get_state().await;
            info!("🔍 当前 WebSocket 状态: {:?}", state);

            match state {
                ConnectionState::Connected => {
                    info!("✅ WebSocket 已连接，发送消息");
                    client.send_message(data).await
                }
                _ => {
                    warn!("⚠️ WebSocket 状态为 {:?}，无法发送消息", state);
                    Err(anyhow::anyhow!("WebSocket not in connected state: {:?}", state))
                }
            }
        } else {
            warn!("⚠️ WebSocket 客户端实例不存在，未初始化");
            Err(anyhow::anyhow!("WebSocket client not initialized"))
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
    GLOBAL_WS_MANAGER.get_or_init(|| {
        info!("🚀 创建全局 WebSocket 管理器实例");
        let manager = Arc::new(WebSocketManager::new(app_handle.clone()));

        // 同时在 Tauri 状态中管理，保持兼容性
        app_handle.manage(manager.clone());

        manager
    }).clone()
}

/// 初始化全局 WebSocket 管理器
/// 应该在应用启动时调用
pub fn init_global_websocket_manager(app_handle: &AppHandle) -> Arc<WebSocketManager> {
    let manager = get_websocket_manager(app_handle);
    info!("✅ 全局 WebSocket 管理器已初始化");
    manager
}
