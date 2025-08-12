/// WebSocket 模块
/// 提供 WebSocket 连接管理、心跳机制、消息处理等功能
pub mod client;
pub mod commands;
pub mod manager;
pub mod message;
pub mod types;

pub use client::WebSocketClient;
pub use manager::WebSocketManager;
pub use message::MessageProcessor;
pub use types::*;
