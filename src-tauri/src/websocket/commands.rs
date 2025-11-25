use crate::AppData;

use super::{client::WebSocketClient, types::*};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, OnceLock};
use tauri::{AppHandle, State};
use tokio::sync::RwLock;
use tracing::{error, info};

// 全局 WebSocket 客户端实例
static GLOBAL_WS_CLIENT: OnceLock<Arc<RwLock<Option<WebSocketClient>>>> = OnceLock::new();

/// 获取全局 WebSocket 客户端容器
pub fn get_websocket_client_container() -> &'static Arc<RwLock<Option<WebSocketClient>>> {
    GLOBAL_WS_CLIENT.get_or_init(|| {
        info!("Creating global WebSocket client container");
        Arc::new(RwLock::new(None))
    })
}

/// WebSocket 初始化参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitWsParams {
    pub client_id: String,
}

/// WebSocket 消息发送参数
#[derive(Debug, Deserialize)]
pub struct SendMessageParams {
    pub data: serde_json::Value,
}

/// WebSocket 配置更新参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConfigParams {
    pub heartbeat_interval: Option<u64>,
    pub heartbeat_timeout: Option<u64>,
    pub max_reconnect_attempts: Option<u32>,
    pub reconnect_delay_ms: Option<u64>,
}

/// 成功响应结构
#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: Option<String>,
}

impl SuccessResponse {
    pub fn new() -> Self {
        Self {
            success: true,
            message: None,
        }
    }
}

/// 初始化 WebSocket 连接
#[tauri::command]
pub async fn ws_init_connection(
    app_handle: AppHandle,
    params: InitWsParams,
    state: State<'_, AppData>,
) -> Result<SuccessResponse, String> {
    info!("Received WebSocket initialization request");

    let client_container = get_websocket_client_container();
    let rc = state.rc.lock().await;

    let config = WebSocketConfig {
        server_url: state.config.lock().await.backend.ws_url.clone(),
        client_id: params.client_id,
        token: rc.token.clone(),
        ..Default::default()
    };

    // 获取或创建客户端实例
    let client = {
        let mut client_guard = client_container.write().await;

        // 检查是否已有客户端实例
        if let Some(existing_client) = client_guard.as_ref() {
            // 如果已有客户端且已连接，直接返回成功
            if existing_client.is_connected() {
                info!("WebSocket already connected, skipping duplicate connection");
                return Ok(SuccessResponse::new());
            }

            // 如果已有客户端但未连接，使用现有客户端
            info!("Reconnecting using existing WebSocket client instance");
            existing_client.clone()
        } else {
            // 如果没有客户端，创建新实例
            info!("Creating new WebSocket client instance");
            let new_client = WebSocketClient::new(app_handle);
            *client_guard = Some(new_client.clone());
            new_client
        }
    };

    tokio::spawn(async move {
        match client.connect(config).await {
            Ok(_) => {
                info!("WebSocket connection initialized successfully");
            }
            Err(e) => {
                error!(" WebSocket connection initialization failed: {}", e);
            }
        }
    });

    Ok(SuccessResponse::new())
}

/// 断开 WebSocket 连接
#[tauri::command]
pub async fn ws_disconnect(_app_handle: AppHandle) -> Result<SuccessResponse, String> {
    info!("Received WebSocket disconnect request");

    let client_container = get_websocket_client_container();
    let mut client_guard = client_container.write().await;

    if let Some(client) = client_guard.take() {
        client.internal_disconnect().await;
    }

    info!("WebSocket connection disconnected");
    Ok(SuccessResponse::new())
}

/// 发送 WebSocket 消息
#[tauri::command]
pub async fn ws_send_message(
    _app_handle: AppHandle,
    params: SendMessageParams,
) -> Result<SuccessResponse, String> {
    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        match client.send_message(params.data).await {
            Ok(_) => Ok(SuccessResponse::new()),
            Err(e) => {
                error!(" Failed to send message: {}", e);
                Err(format!("发送失败: {}", e))
            }
        }
    } else {
        error!(" WebSocket not initialized");
        Err("WebSocket 未初始化".to_string())
    }
}

/// 获取连接状态
#[tauri::command]
pub async fn ws_get_state(_app_handle: AppHandle) -> Result<ConnectionState, String> {
    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        Ok(client.get_state().await)
    } else {
        Ok(ConnectionState::Disconnected)
    }
}

/// 获取连接健康状态
#[tauri::command]
pub async fn ws_get_health(_app_handle: AppHandle) -> Result<ConnectionHealth, String> {
    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        Ok(client.get_health_status().await)
    } else {
        Err("WebSocket 未初始化".to_string())
    }
}

/// 强制重连
#[tauri::command]
pub async fn ws_force_reconnect(_app_handle: AppHandle) -> Result<SuccessResponse, String> {
    info!("Received force reconnect request");

    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        match client.force_reconnect().await {
            Ok(_) => {
                info!("WebSocket reconnected successfully");
                Ok(SuccessResponse::new())
            }
            Err(e) => {
                error!(" WebSocket reconnection failed: {}", e);
                Err(format!("重连失败: {}", e))
            }
        }
    } else {
        error!(" WebSocket not initialized, cannot reconnect");
        Err("WebSocket 未初始化".to_string())
    }
}

/// 更新 WebSocket 配置
#[tauri::command]
pub async fn ws_update_config(
    _app_handle: AppHandle,
    params: UpdateConfigParams,
) -> Result<SuccessResponse, String> {
    info!("Updating WebSocket configuration");

    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        // 获取当前配置（这里需要添加获取当前配置的方法）
        let mut config = WebSocketConfig::default();

        // 更新配置
        if let Some(interval) = params.heartbeat_interval {
            config.heartbeat_interval = interval;
        }
        if let Some(timeout) = params.heartbeat_timeout {
            config.heartbeat_timeout = timeout;
        }
        if let Some(attempts) = params.max_reconnect_attempts {
            config.max_reconnect_attempts = attempts;
        }
        if let Some(delay) = params.reconnect_delay_ms {
            config.reconnect_delay_ms = delay;
        }

        client.update_config(config).await;
        info!("WebSocket configuration updated successfully");
        Ok(SuccessResponse::new())
    } else {
        error!(" WebSocket not initialized, cannot update configuration");
        Err("WebSocket 未初始化".to_string())
    }
}

/// 检查连接状态
#[tauri::command]
pub async fn ws_is_connected(_app_handle: AppHandle) -> Result<bool, String> {
    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        Ok(client.is_connected())
    } else {
        Ok(false)
    }
}

/// 设置应用后台状态
#[tauri::command]
pub async fn ws_set_app_background_state(
    _app_handle: AppHandle,
    is_background: bool,
) -> Result<SuccessResponse, String> {
    info!(
        "收到应用状态变更请求: {}",
        if is_background { "后台" } else { "前台" }
    );

    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        client.set_app_background_state(is_background);
    }

    Ok(SuccessResponse::new())
}

/// 获取应用后台状态
#[tauri::command]
pub async fn ws_get_app_background_state(_app_handle: AppHandle) -> Result<bool, String> {
    let client_container = get_websocket_client_container();
    let client_guard = client_container.read().await;

    if let Some(client) = client_guard.as_ref() {
        Ok(client.is_app_in_background())
    } else {
        Ok(false)
    }
}
