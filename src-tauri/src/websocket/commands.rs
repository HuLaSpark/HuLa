use super::{manager::get_websocket_manager, types::*};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tracing::{error, info};

/// WebSocket 初始化参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitWsParams {
    pub server_url: String,
    pub token: Option<String>,
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
) -> Result<SuccessResponse, String> {
    info!("🚀 收到 WebSocket 初始化请求");

    let manager = get_websocket_manager(&app_handle);

    let config = WebSocketConfig {
        server_url: params.server_url,
        token: params.token,
        client_id: params.client_id,
        ..Default::default()
    };

    match manager.init_connection(config).await {
        Ok(_) => {
            info!("✅ WebSocket 连接初始化成功");
            Ok(SuccessResponse::new())
        }
        Err(e) => {
            error!("❌ WebSocket 连接初始化失败: {}", e);
            Err(format!("连接失败: {}", e))
        }
    }
}

/// 断开 WebSocket 连接
#[tauri::command]
pub async fn ws_disconnect(app_handle: AppHandle) -> Result<SuccessResponse, String> {
    info!("📡 收到 WebSocket 断开请求");

    let manager = get_websocket_manager(&app_handle);
    manager.disconnect().await;

    info!("✅ WebSocket 连接已断开");
    Ok(SuccessResponse::new())
}

/// 发送 WebSocket 消息
#[tauri::command]
pub async fn ws_send_message(
    app_handle: AppHandle,
    params: SendMessageParams,
) -> Result<SuccessResponse, String> {
    let manager = get_websocket_manager(&app_handle);

    match manager.send_message(params.data).await {
        Ok(_) => Ok(SuccessResponse::new()),
        Err(e) => {
            error!("❌ 发送消息失败: {}", e);
            Err(format!("发送失败: {}", e))
        }
    }
}

/// 获取连接状态
#[tauri::command]
pub async fn ws_get_state(
    app_handle: AppHandle,
) -> Result<ConnectionState, String> {
    let manager = get_websocket_manager(&app_handle);
    let state = manager.get_state().await;

    Ok(state)
}

/// 获取连接健康状态
#[tauri::command]
pub async fn ws_get_health(
    app_handle: AppHandle,
) -> Result<ConnectionHealth, String> {
    let manager = get_websocket_manager(&app_handle);

    match manager.get_health_status().await {
        Some(health) => Ok(health),
        None => Err("WebSocket 未初始化".to_string()),
    }
}

/// 强制重连
#[tauri::command]
pub async fn ws_force_reconnect(
    app_handle: AppHandle,
) -> Result<SuccessResponse, String> {
    info!("🔄 收到强制重连请求");

    let manager = get_websocket_manager(&app_handle);

    match manager.force_reconnect().await {
        Ok(_) => {
            info!("✅ WebSocket 重连成功");
            Ok(SuccessResponse::new())
        }
        Err(e) => {
            error!("❌ WebSocket 重连失败: {}", e);
            Err(format!("重连失败: {}", e))
        }
    }
}

/// 更新 WebSocket 配置
#[tauri::command]
pub async fn ws_update_config(
    app_handle: AppHandle,
    params: UpdateConfigParams,
) -> Result<SuccessResponse, String> {
    info!("⚙️ 更新 WebSocket 配置");

    let manager = get_websocket_manager(&app_handle);

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

    match manager.update_config(config).await {
        Ok(_) => {
            info!("✅ WebSocket 配置更新成功");
            Ok(SuccessResponse::new())
        }
        Err(e) => {
            error!("❌ WebSocket 配置更新失败: {}", e);
            Err(format!("配置更新失败: {}", e))
        }
    }
}

/// 检查连接状态
#[tauri::command]
pub async fn ws_is_connected(
    app_handle: AppHandle,
) -> Result<bool, String> {
    let manager = get_websocket_manager(&app_handle);
    let is_connected = manager.is_connected().await;

    Ok(is_connected)
}
