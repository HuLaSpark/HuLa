use super::types::*;
use anyhow::Result;
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use tauri::{AppHandle, Emitter};

use tokio::sync::{Mutex, RwLock, mpsc};
use tokio::task::JoinHandle;
use tokio::time::{Duration, interval, sleep};

use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tracing::{debug, error, info, warn};
use url::Url;

/// WebSocket 客户端
#[derive(Clone)]
pub struct WebSocketClient {
    config: Arc<RwLock<WebSocketConfig>>,
    state: Arc<RwLock<ConnectionState>>,
    app_handle: AppHandle,

    // 心跳相关
    last_pong_time: Arc<AtomicU64>,
    consecutive_failures: Arc<AtomicU32>,
    heartbeat_active: Arc<AtomicBool>,

    // 重连相关
    reconnect_attempts: Arc<AtomicU32>,
    is_reconnecting: Arc<AtomicBool>,

    // 消息队列
    message_sender: Arc<RwLock<Option<mpsc::UnboundedSender<Message>>>>,
    pending_messages: Arc<RwLock<Vec<serde_json::Value>>>,

    // 连接控制
    should_stop: Arc<AtomicBool>,

    // 应用状态跟踪
    is_app_in_background: Arc<AtomicBool>,
    last_foreground_time: Arc<AtomicU64>,
    background_heartbeat_failures: Arc<AtomicU32>,

    // 连接状态标记
    is_ws_connected: Arc<AtomicBool>,

    // 连接互斥锁，防止并发连接
    connection_mutex: Arc<Mutex<()>>,

    // 任务句柄管理
    task_handles: Arc<RwLock<Vec<JoinHandle<()>>>>,

    // 关闭信号发送器
    close_sender: Arc<RwLock<Option<mpsc::UnboundedSender<()>>>>,
}

impl WebSocketClient {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            config: Arc::new(RwLock::new(WebSocketConfig::default())),
            state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
            app_handle,
            last_pong_time: Arc::new(AtomicU64::new(0)),
            consecutive_failures: Arc::new(AtomicU32::new(0)),
            heartbeat_active: Arc::new(AtomicBool::new(false)),
            reconnect_attempts: Arc::new(AtomicU32::new(0)),
            is_reconnecting: Arc::new(AtomicBool::new(false)),
            message_sender: Arc::new(RwLock::new(None)),
            pending_messages: Arc::new(RwLock::new(Vec::new())),
            should_stop: Arc::new(AtomicBool::new(false)),
            is_app_in_background: Arc::new(AtomicBool::new(false)),
            last_foreground_time: Arc::new(AtomicU64::new(
                chrono::Utc::now().timestamp_millis() as u64
            )),
            background_heartbeat_failures: Arc::new(AtomicU32::new(0)),
            is_ws_connected: Arc::new(AtomicBool::new(false)),
            connection_mutex: Arc::new(Mutex::new(())),
            task_handles: Arc::new(RwLock::new(Vec::new())),
            close_sender: Arc::new(RwLock::new(None)),
        }
    }

    /// 初始化连接
    pub async fn connect(&self, config: WebSocketConfig) -> Result<()> {
        // 获取连接锁，确保同时只有一个连接操作
        let _lock: tokio::sync::MutexGuard<'_, ()> = self.connection_mutex.lock().await;
        info!("🚀 初始化 WebSocket 连接到: {}", config.server_url);

        // 在锁保护下再次检查连接状态
        if self.is_ws_connected.load(Ordering::SeqCst) {
            warn!("⚠️ WebSocket 已连接，忽略重复连接请求");
            return Ok(());
        }

        // 更新配置
        *self.config.write().await = config;
        self.should_stop.store(false, Ordering::SeqCst);

        // 开始连接循环
        self.connection_loop().await?;

        Ok(())
    }

    /// 断开连接
    pub async fn disconnect(&self) {
        let _lock = self.connection_mutex.lock().await;
        self.internal_disconnect().await;
    }

    /// 内部断开连接方法（不获取锁）
    async fn internal_disconnect(&self) {
        info!("📡 断开 WebSocket 连接");
        self.should_stop.store(true, Ordering::SeqCst);

        // 更新连接状态
        self.is_ws_connected.store(false, Ordering::SeqCst);

        // 取消所有任务
        let mut handles = self.task_handles.write().await;
        let task_count = handles.len();
        for handle in handles.drain(..) {
            handle.abort();
        }
        info!("🛑 已取消 {} 个异步任务", task_count);

        // 发送关闭信号以主动关闭 WebSocket 连接
        if let Some(close_sender) = self.close_sender.write().await.take() {
            if let Err(_) = close_sender.send(()) {
                warn!("⚠️ 发送关闭信号失败，连接可能已经关闭");
            } else {
                info!("📤 已发送 WebSocket 关闭信号");
            }
        }

        // 清理消息发送器
        *self.message_sender.write().await = None;

        // 更新状态
        self.update_state(ConnectionState::Disconnected, false)
            .await;

        // 重置计数器
        self.consecutive_failures.store(0, Ordering::SeqCst);
        self.reconnect_attempts.store(0, Ordering::SeqCst);
        self.heartbeat_active.store(false, Ordering::SeqCst);

        info!("✅ WebSocket 连接已完全断开");
    }

    /// 发送消息
    pub async fn send_message(&self, data: serde_json::Value) -> Result<()> {
        // 首先检查连接状态
        let current_state = self.get_state().await;

        match current_state {
            ConnectionState::Connected => {
                let sender = self.message_sender.read().await;

                if let Some(sender) = sender.as_ref() {
                    let message = Message::Text(data.to_string());
                    sender.send(message.clone()).map_err(|e| {
                        anyhow::anyhow!("Failed to queue message for sending: {}", e)
                    })?;
                    info!("📤 消息已发送 {:?}", message);
                    Ok(())
                } else {
                    warn!("📤 连接状态为 Connected 但 sender 未就绪，消息加入待发队列");
                    // 连接未完全建立，将消息加入待发队列
                    let mut pending = self.pending_messages.write().await;
                    pending.push(data);

                    // 限制队列长度
                    if pending.len() > 100 {
                        pending.remove(0);
                        warn!("📤 待发队列已满，丢弃最旧消息");
                    }

                    // 返回错误，让上层知道消息没有立即发送
                    Err(anyhow::anyhow!(
                        "Connection not fully established, message queued"
                    ))
                }
            }
            ConnectionState::Connecting | ConnectionState::Reconnecting => {
                // 连接中，将消息加入待发队列
                let mut pending = self.pending_messages.write().await;
                pending.push(data);
                warn!(
                    "📤 正在连接中，消息已加入待发队列 (队列长度: {})",
                    pending.len()
                );

                // 限制队列长度
                if pending.len() > 100 {
                    pending.remove(0);
                    warn!("📤 待发队列已满，丢弃最旧消息");
                }

                Err(anyhow::anyhow!("WebSocket is connecting, message queued"))
            }
            _ => {
                warn!(
                    "📤 WebSocket 未连接 (状态: {:?})，无法发送消息",
                    current_state
                );
                Err(anyhow::anyhow!(
                    "WebSocket not connected (state: {:?})",
                    current_state
                ))
            }
        }
    }

    /// 获取连接健康状态
    pub async fn get_health_status(&self) -> ConnectionHealth {
        let last_pong = self.last_pong_time.load(Ordering::SeqCst);
        let failures = self.consecutive_failures.load(Ordering::SeqCst);
        let now = chrono::Utc::now().timestamp_millis() as u64;

        let is_healthy = if last_pong == 0 {
            // 如果还没有收到过pong，根据连接状态判断
            matches!(*self.state.read().await, ConnectionState::Connected)
        } else {
            now - last_pong < 30000 // 30秒内收到过pong认为健康
        };

        ConnectionHealth {
            is_healthy,
            last_pong_time: if last_pong == 0 {
                None
            } else {
                Some(last_pong)
            },
            consecutive_failures: failures,
            round_trip_time: None, // 可以在心跳时计算
        }
    }

    /// 强制重连
    pub async fn force_reconnect(&self) -> Result<()> {
        info!("🔄 强制重新连接");

        // 获取连接锁
        let _lock = self.connection_mutex.lock().await;

        self.reconnect_attempts.store(0, Ordering::SeqCst);

        // 先断开当前连接
        self.internal_disconnect().await;

        // 重新连接
        let config = self.config.read().await.clone();

        // 更新配置
        *self.config.write().await = config.clone();
        self.should_stop.store(false, Ordering::SeqCst);

        // 开始连接循环
        self.connection_loop().await
    }

    /// 主连接循环
    async fn connection_loop(&self) -> Result<()> {
        loop {
            // 检查是否应该停止
            if self.should_stop.load(Ordering::SeqCst) {
                info!("🛑 收到停止信号，退出连接循环");
                break;
            }

            match self.try_connect().await {
                Ok(_) => {
                    info!("✅ WebSocket 连接已建立");
                    self.reconnect_attempts.store(0, Ordering::SeqCst);
                    self.is_reconnecting.store(false, Ordering::SeqCst);

                    // 监控连接状态，直到断开
                    while self.is_ws_connected.load(Ordering::SeqCst)
                        && !self.should_stop.load(Ordering::SeqCst)
                    {
                        sleep(Duration::from_millis(100)).await;
                    }

                    info!("🔄 连接已断开，准备重连...");
                    self.is_reconnecting.store(true, Ordering::SeqCst);
                    self.update_state(ConnectionState::Reconnecting, true).await;
                    // 清理当前连接状态
                    self.cleanup_connection_state().await;

                    continue;
                }
                Err(e) => {
                    let attempts = self.reconnect_attempts.fetch_add(1, Ordering::SeqCst) + 1;
                    let config = self.config.read().await;

                    error!(
                        "❌ WebSocket 连接失败 (尝试 {}/{}): {}",
                        attempts, config.max_reconnect_attempts, e
                    );

                    if attempts >= config.max_reconnect_attempts {
                        self.emit_error("连接失败次数过多，停止重试".to_string(), None)
                            .await;
                        self.is_ws_connected.store(false, Ordering::SeqCst);
                        self.update_state(ConnectionState::Error, false).await;

                        // 重新登录
                        self.app_handle.emit_to("home", "relogin", ()).unwrap();
                        return Err(anyhow::anyhow!("Max reconnection attempts reached"));
                    }

                    // 指数退避延迟
                    let delay = std::cmp::min(
                        config.reconnect_delay_ms * (2_u64.pow(attempts.saturating_sub(1))),
                        15000, // 最大15秒
                    );

                    info!("🔄 {}ms 后重试连接...", delay);
                    self.update_state(ConnectionState::Reconnecting, true).await;
                    sleep(Duration::from_millis(delay)).await;
                }
            }
        }
        Ok(())
    }

    /// 清理连接状态
    async fn cleanup_connection_state(&self) {
        // 停止心跳
        self.heartbeat_active.store(false, Ordering::SeqCst);

        // 清理消息发送器
        *self.message_sender.write().await = None;

        // 清理关闭信号发送器
        *self.close_sender.write().await = None;

        // 重置连接状态
        self.is_ws_connected.store(false, Ordering::SeqCst);

        info!("🧹 连接状态已清理");
    }

    /// 尝试建立连接
    async fn try_connect(&self) -> Result<()> {
        let config = self.config.read().await.clone();

        // 构建连接URL
        let mut url = Url::parse(&config.server_url)
            .map_err(|e| anyhow::anyhow!("Invalid WebSocket URL '{}': {}", config.server_url, e))?;

        url.query_pairs_mut()
            .append_pair("clientId", &config.client_id);

        if let Some(ref token) = config.token {
            url.query_pairs_mut().append_pair("Token", token);
        }

        let url_str = url.as_str();
        info!("🔗 连接到 WebSocket: {}", url_str);
        self.update_state(ConnectionState::Connecting, false).await;

        // 建立连接
        let (ws_stream, _) = connect_async(url_str)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to connect to WebSocket '{}': {}", url_str, e))?;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        // 创建消息通道
        let (msg_sender, mut msg_receiver) = mpsc::unbounded_channel();
        *self.message_sender.write().await = Some(msg_sender);

        // 创建关闭信号通道
        let (close_sender, mut close_receiver) = mpsc::unbounded_channel();
        *self.close_sender.write().await = Some(close_sender);

        // 更新连接状态
        self.update_state(
            ConnectionState::Connected,
            self.is_reconnecting.load(Ordering::SeqCst),
        )
        .await;

        // 标记为已连接
        self.is_ws_connected.store(true, Ordering::SeqCst);

        // 发送待发消息
        self.send_pending_messages().await?;

        // 启动心跳
        self.start_heartbeat().await;

        // 处理消息发送
        let message_sender_task = {
            let should_stop = self.should_stop.clone();
            let is_ws_connected = self.is_ws_connected.clone();
            tokio::spawn(async move {
                while !should_stop.load(Ordering::SeqCst) {
                    tokio::select! {
                        Some(message) = msg_receiver.recv() => {
                            if let Err(e) = ws_sender.send(message).await {
                                error!("❌ 发送消息失败: {}", e);
                                is_ws_connected.store(false, Ordering::SeqCst);
                                break;
                            }
                        }
                        Some(_) = close_receiver.recv() => {
                            info!("🔒 收到关闭信号，主动关闭 WebSocket 连接");
                            if let Err(e) = ws_sender.close().await {
                                warn!("⚠️ 关闭 WebSocket 连接时出错: {}", e);
                            } else {
                                info!("✅ WebSocket 连接已主动关闭");
                            }
                            break;
                        }
                        else => break,
                    }
                }
            })
        };

        // 处理消息接收
        let message_receiver_task = {
            let app_handle = self.app_handle.clone();
            let last_pong_time = self.last_pong_time.clone();
            let consecutive_failures = self.consecutive_failures.clone();
            let is_ws_connected = self.is_ws_connected.clone();

            tokio::spawn(async move {
                while let Some(msg) = ws_receiver.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            Self::handle_message_static(
                                text,
                                &app_handle,
                                &last_pong_time,
                                &consecutive_failures,
                            )
                            .await;
                        }
                        Ok(Message::Binary(data)) => {
                            if let Ok(text) = String::from_utf8(data) {
                                Self::handle_message_static(
                                    text,
                                    &app_handle,
                                    &last_pong_time,
                                    &consecutive_failures,
                                )
                                .await;
                            }
                        }
                        Ok(Message::Close(_)) => {
                            info!("📡 WebSocket 连接已关闭");
                            is_ws_connected.store(false, Ordering::SeqCst);
                            break;
                        }
                        Err(e) => {
                            error!("❌ WebSocket 接收消息错误: {}", e);
                            is_ws_connected.store(false, Ordering::SeqCst);
                            break;
                        }
                        _ => {}
                    }
                }
            })
        };

        // 启动后台任务监控
        let should_stop = self.should_stop.clone();
        let heartbeat_active = self.heartbeat_active.clone();
        let message_sender_ref = self.message_sender.clone();

        let monitor_task = tokio::spawn(async move {
            // 等待任务完成或停止信号
            tokio::select! {
                _ = message_sender_task => {
                    info!("📤 消息发送任务结束");
                }
                _ = message_receiver_task => {
                    info!("📥 消息接收任务结束");
                }
                _ = async {
                    while !should_stop.load(Ordering::SeqCst) {
                        sleep(Duration::from_millis(100)).await;
                    }
                } => {
                    info!("🛑 收到停止信号");
                }
            }

            // 清理
            heartbeat_active.store(false, Ordering::SeqCst);
            *message_sender_ref.write().await = None;
        });

        // 保存监控任务句柄
        let mut handles = self.task_handles.write().await;
        handles.push(monitor_task);

        info!("✅ WebSocket 连接和后台任务已启动");
        Ok(())
    }

    /// 处理收到的消息（静态方法，用于异步任务）
    async fn handle_message_static(
        text: String,
        app_handle: &AppHandle,
        last_pong_time: &Arc<AtomicU64>,
        consecutive_failures: &Arc<AtomicU32>,
    ) {
        info!("📥 收到消息: {}", text);

        // 尝试解析心跳响应
        if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
            match ws_msg {
                WsMessage::HeartbeatResponse { timestamp: _ } => {
                    let now = chrono::Utc::now().timestamp_millis() as u64;
                    last_pong_time.store(now, Ordering::SeqCst);
                    consecutive_failures.store(0, Ordering::SeqCst);

                    info!("💓 收到心跳响应");

                    let health = ConnectionHealth {
                        is_healthy: true,
                        last_pong_time: Some(now),
                        consecutive_failures: 0,
                        round_trip_time: None,
                    };

                    let _ = app_handle.emit(
                        "websocket-event",
                        &WebSocketEvent::HeartbeatStatusChanged { health },
                    );
                    return;
                }
                _ => {}
            }
        }

        // 处理业务消息
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&text) {
            // 处理具体的业务消息类型
            Self::process_business_message(&json_value, app_handle).await;

            // 同时发送原始消息事件（保持兼容性）
            let _ = app_handle.emit(
                "websocket-event",
                &WebSocketEvent::MessageReceived {
                    message: json_value,
                },
            );
        } else {
            // 非JSON消息，直接转发
            let _ = app_handle.emit(
                "websocket-event",
                &WebSocketEvent::MessageReceived {
                    message: serde_json::Value::String(text),
                },
            );
        }
    }

    /// 处理业务消息类型
    async fn process_business_message(message: &serde_json::Value, app_handle: &AppHandle) {
        // 提取消息类型
        let message_type = message.get("type").and_then(|t| t.as_str()).unwrap_or("");

        // 提取消息数据
        let data = message.get("data");

        debug!("🔍 处理业务消息类型: {}", message_type);

        // 根据消息类型进行处理并发送对应的事件
        match message_type {
            // 登录相关
            "loginQrCode" => {
                info!("📱 获取登录二维码");
                let _ = app_handle.emit("ws-login-qr-code", data);
            }
            "waitingAuthorize" => {
                info!("⏳ 等待授权");
                let _ = app_handle.emit("ws-waiting-authorize", data);
            }
            "loginSuccess" => {
                info!("✅ 登录成功");
                let _ = app_handle.emit_to("home", "ws-login-success", data);
            }

            // 消息相关
            "receiveMessage" => {
                info!("💬 收到消息");
                let _ = app_handle.emit_to("home", "ws-receive-message", data);
            }
            "msgRecall" => {
                info!("🔄 消息撤回");
                let _ = app_handle.emit_to("home", "ws-msg-recall", data);
            }
            "msgMarkItem" => {
                info!("👍 消息点赞/倒赞");
                let _ = app_handle.emit_to("home", "ws-msg-mark-item", data);
            }

            // 用户状态相关
            "online" => {
                info!("🟢 用户上线");
                let _ = app_handle.emit_to("home", "ws-online", data);
            }
            "offline" => {
                info!("🔴 用户下线");
                let _ = app_handle.emit_to("home", "ws-offline", data);
            }
            "userStateChange" => {
                info!("🔄 用户状态改变");
                let _ = app_handle.emit_to("home", "ws-user-state-change", data);
            }

            // 好友相关
            "newApply" => {
                info!("👥 新的Apply申请");
                let _ = app_handle.emit_to("home", "ws-request-new-apply", data);
            }
            "requestApprovalFriend" => {
                info!("✅ 同意好友申请");
                let _ = app_handle.emit_to("home", "ws-request-approval-friend", data);
            }
            "memberChange" => {
                info!("🔄 成员变动");
                let _ = app_handle.emit_to("home", "ws-member-change", data);
            }

            // 房间/群聊相关
            "roomInfoChange" => {
                info!("🏠 群聊信息变更");
                let _ = app_handle.emit_to("home", "ws-room-info-change", data);
            }
            "myRoomInfoChange" => {
                info!("👤 我在群里的信息变更");
                let _ = app_handle.emit_to("home", "ws-my-room-info-change", data);
            }
            "roomGroupNoticeMsg" => {
                info!("📢 群公告发布");
                let _ = app_handle.emit_to("home", "ws-room-group-notice-msg", data);
            }
            "roomEditGroupNoticeMsg" => {
                info!("✏️ 群公告编辑");
                let _ = app_handle.emit_to("home", "ws-room-edit-group-notice-msg", data);
            }
            "roomDissolution" => {
                info!("💥 群解散");
                let _ = app_handle.emit_to("home", "ws-room-dissolution", data);
            }

            // 视频通话相关
            "VideoCallRequest" => {
                info!("📞 收到通话请求");
                let _ = app_handle.emit("ws-video-call-request", data);
            }
            "CallAccepted" => {
                info!("✅ 通话被接受");
                let _ = app_handle.emit("ws-call-accepted", data);
            }
            "CallRejected" => {
                info!("❌ 通话被拒绝");
                let _ = app_handle.emit("ws-call-rejected", data);
            }
            "RoomClosed" => {
                info!("🏠 房间已关闭");
                let _ = app_handle.emit("ws-room-closed", data);
            }
            "WEBRTC_SIGNAL" => {
                info!("📡 信令消息");
                let _ = app_handle.emit("ws-webrtc-signal", data);
            }
            "JoinVideo" => {
                info!("📹 用户加入视频");
                let _ = app_handle.emit("ws-join-video", data);
            }
            "LeaveVideo" => {
                info!("📹 用户离开视频");
                let _ = app_handle.emit("ws-leave-video", data);
            }
            "DROPPED" => {
                info!("📞 通话挂断");
                let _ = app_handle.emit("ws-dropped", data);
            }

            "CANCEL" => {
                info!("📞 通话取消");
                let _ = app_handle.emit("ws-cancel", data);
            }

            "TIMEOUT" => {
                info!("📞 通话超时");
                let _ = app_handle.emit("ws-timeout", data);
            }

            // 系统相关
            "tokenExpired" => {
                warn!("🔑 Token 过期");
                let _ = app_handle.emit("ws-token-expired", data);
            }
            "invalidUser" => {
                warn!("🚫 无效用户");
                let _ = app_handle.emit("ws-invalid-user", data);
            }

            // 未知消息类型
            _ => {
                warn!("❓ 接收到未处理的消息类型: {}", message_type);
                // 发送通用的未知消息事件
                let _ = app_handle.emit("ws-unknown-message", message);
            }
        }
    }

    /// 启动心跳机制
    async fn start_heartbeat(&self) {
        if self.heartbeat_active.swap(true, Ordering::SeqCst) {
            return; // 已经在运行
        }

        let config = self.config.read().await.clone();
        let interval_ms = config.heartbeat_interval;
        let timeout_ms = config.heartbeat_timeout;

        let heartbeat_task = {
            let heartbeat_active = self.heartbeat_active.clone();
            let should_stop = self.should_stop.clone();
            let last_pong_time = self.last_pong_time.clone();
            let consecutive_failures = self.consecutive_failures.clone();
            let message_sender = self.message_sender.clone();
            let is_app_in_background = self.is_app_in_background.clone();
            let background_heartbeat_failures = self.background_heartbeat_failures.clone();
            let is_ws_connected = self.is_ws_connected.clone();

            tokio::spawn(async move {
                let mut heartbeat_interval = interval(Duration::from_millis(interval_ms));

                while heartbeat_active.load(Ordering::SeqCst) && !should_stop.load(Ordering::SeqCst)
                {
                    heartbeat_interval.tick().await;

                    // 发送心跳
                    let heartbeat_msg = WsMessage::Heartbeat;
                    if let Ok(json) = serde_json::to_value(&heartbeat_msg) {
                        let sender = message_sender.read().await;
                        if let Some(sender) = sender.as_ref() {
                            let message = Message::Text(json.to_string());
                            if let Err(e) = sender.send(message) {
                                error!("❌ 发送心跳失败: {}", e);
                                break;
                            }
                        } else {
                            warn!("❌ 心跳发送失败：连接未建立");
                            break;
                        }
                    }

                    // 检查心跳超时
                    let last_pong = last_pong_time.load(Ordering::SeqCst);
                    if last_pong > 0 {
                        let now = chrono::Utc::now().timestamp_millis() as u64;
                        let time_since_pong = now - last_pong;

                        // 根据应用状态调整超时策略
                        let is_background = is_app_in_background.load(Ordering::SeqCst);
                        let effective_timeout = if is_background {
                            // 后台模式下更宽松的超时时间（2分钟）
                            120000
                        } else {
                            timeout_ms
                        };

                        if time_since_pong > effective_timeout {
                            let failures = if is_background {
                                background_heartbeat_failures.fetch_add(1, Ordering::SeqCst) + 1
                            } else {
                                consecutive_failures.fetch_add(1, Ordering::SeqCst) + 1
                            };

                            warn!(
                                "⚠️ 心跳超时 ({}模式, 连续失败: {}, {}ms前收到最后心跳)",
                                if is_background { "后台" } else { "前台" },
                                failures,
                                time_since_pong
                            );

                            // 后台模式下更宽松的重连策略
                            let max_failures = if is_background { 5 } else { 3 };
                            if failures >= max_failures {
                                error!("💔 心跳连续超时，触发重连");
                                // 心跳失败时标记连接断开
                                is_ws_connected.store(false, Ordering::SeqCst);
                                break;
                            }
                        }
                    }
                }

                info!("💓 心跳任务结束");
            })
        };

        // 保存心跳任务句柄
        let mut handles = self.task_handles.write().await;
        handles.push(heartbeat_task);
    }

    /// 发送待发消息
    async fn send_pending_messages(&self) -> Result<()> {
        // 先取出所有待发消息
        let messages_to_send = {
            let mut pending = self.pending_messages.write().await;
            if pending.is_empty() {
                return Ok(());
            }

            info!("📤 准备发送 {} 条待发消息", pending.len());
            pending.drain(..).collect::<Vec<_>>()
        };

        // 获取发送器
        let sender = self.message_sender.read().await;
        if let Some(sender) = sender.as_ref() {
            let mut failed_messages = Vec::new();

            // 尝试发送每条消息
            for message in messages_to_send {
                let text_message = Message::Text(message.to_string());
                if let Err(e) = sender.send(text_message) {
                    error!("❌ 发送待发消息失败: {}", e);
                    failed_messages.push(message);
                }
            }

            // 如果有失败的消息，重新加入队列
            if !failed_messages.is_empty() {
                let mut pending = self.pending_messages.write().await;
                for msg in failed_messages.into_iter().rev() {
                    pending.insert(0, msg); // 插入到队列前面
                }
                return Err(anyhow::anyhow!("Some pending messages failed to send"));
            }

            info!("✅ 所有待发消息已发送");
        } else {
            // 发送器未就绪，将消息重新加入队列
            let mut pending = self.pending_messages.write().await;
            for msg in messages_to_send.into_iter().rev() {
                pending.insert(0, msg);
            }
            warn!("⚠️ 发送器未就绪，消息已重新加入队列");
            return Err(anyhow::anyhow!("Message sender not ready"));
        }

        Ok(())
    }

    /// 更新连接状态
    async fn update_state(&self, new_state: ConnectionState, is_reconnection: bool) {
        let mut state = self.state.write().await;
        if *state != new_state {
            *state = new_state.clone();
            drop(state);

            info!("🔄 连接状态变更: {:?}", new_state);
            self.emit_event(WebSocketEvent::ConnectionStateChanged {
                state: new_state,
                is_reconnection,
            })
            .await;
        }
    }

    /// 发送事件到前端
    async fn emit_event(&self, event: WebSocketEvent) {
        if let Err(e) = self.app_handle.emit("websocket-event", &event) {
            error!("❌ 发送WebSocket事件失败: {}", e);
        }
    }

    /// 发送错误事件
    async fn emit_error(
        &self,
        message: String,
        details: Option<std::collections::HashMap<String, serde_json::Value>>,
    ) {
        self.emit_event(WebSocketEvent::Error { message, details })
            .await;
    }

    /// 获取当前状态
    pub async fn get_state(&self) -> ConnectionState {
        self.state.read().await.clone()
    }

    /// 更新配置
    pub async fn update_config(&self, new_config: WebSocketConfig) {
        *self.config.write().await = new_config;
    }

    /// 设置应用后台状态
    pub fn set_app_background_state(&self, is_background: bool) {
        let was_background = self
            .is_app_in_background
            .swap(is_background, Ordering::SeqCst);

        if is_background && !was_background {
            info!("📱 应用进入后台模式");
            // 重置后台心跳失败计数
            self.background_heartbeat_failures
                .store(0, Ordering::SeqCst);
        } else if !is_background && was_background {
            let now = chrono::Utc::now().timestamp_millis() as u64;
            self.last_foreground_time.store(now, Ordering::SeqCst);
            info!("📱 应用从后台恢复到前台");

            // 检查是否需要重连
            tokio::spawn({
                let client = self.clone();
                async move {
                    client.check_and_recover_connection().await;
                }
            });
        }
    }

    /// 检查并恢复连接（从后台恢复时调用）
    async fn check_and_recover_connection(&self) {
        let current_state = self.get_state().await;
        let last_pong = self.last_pong_time.load(Ordering::SeqCst);
        let now = chrono::Utc::now().timestamp_millis() as u64;

        info!(
            "🔍 检查连接状态: {:?}, 最后心跳: {}ms前",
            current_state,
            if last_pong > 0 { now - last_pong } else { 0 }
        );

        match current_state {
            ConnectionState::Connected => {
                // 检查心跳是否过期
                if last_pong > 0 && now - last_pong > 60000 {
                    // 60秒无心跳
                    warn!("💔 连接可能已断开，强制重连");
                    if let Err(e) = self.force_reconnect().await {
                        warn!("💔 自动重连失败: {}", e);
                        // 通知前端需要重连
                        if let Err(emit_err) = self.app_handle.emit(
                            "ws-connection-lost",
                            serde_json::json!({
                                "reason": "auto_reconnect_failed",
                                "error": e.to_string(),
                                "timestamp": chrono::Utc::now().timestamp_millis()
                            }),
                        ) {
                            error!("发送连接丢失事件失败: {}", emit_err);
                        }
                    }
                } else {
                    // 发送一个心跳来测试连接
                    self.send_test_heartbeat().await;
                }
            }
            ConnectionState::Disconnected | ConnectionState::Error => {
                info!("🔄 连接已断开，尝试重新连接");
                if let Err(e) = self.force_reconnect().await {
                    warn!("💔 自动重连失败: {}", e);
                    // 通知前端需要重连
                    if let Err(emit_err) = self.app_handle.emit(
                        "ws-connection-lost",
                        serde_json::json!({
                            "reason": "auto_reconnect_failed",
                            "error": e.to_string(),
                            "timestamp": chrono::Utc::now().timestamp_millis()
                        }),
                    ) {
                        error!("发送连接丢失事件失败: {}", emit_err);
                    }
                }
            }
            _ => {
                info!("🔄 连接状态: {:?}，等待连接完成", current_state);
            }
        }
    }

    /// 发送测试心跳
    async fn send_test_heartbeat(&self) {
        let heartbeat_msg = WsMessage::Heartbeat;
        if let Ok(json) = serde_json::to_value(&heartbeat_msg) {
            match self.send_message(json).await {
                Ok(_) => {
                    info!("💓 发送测试心跳成功");
                }
                Err(e) => {
                    warn!("💔 测试心跳发送失败: {}", e);
                    // 通过事件通知前端需要重连
                    if let Err(emit_err) = self.app_handle.emit(
                        "ws-connection-lost",
                        serde_json::json!({
                            "reason": "test_heartbeat_failed",
                            "error": e.to_string(),
                            "timestamp": chrono::Utc::now().timestamp_millis()
                        }),
                    ) {
                        error!("发送连接丢失事件失败: {}", emit_err);
                    }
                }
            }
        }
    }

    /// 获取应用后台状态
    pub fn is_app_in_background(&self) -> bool {
        self.is_app_in_background.load(Ordering::SeqCst)
    }

    /// 检查 WebSocket 是否已连接
    pub fn is_connected(&self) -> bool {
        self.is_ws_connected.load(Ordering::SeqCst)
    }
}
