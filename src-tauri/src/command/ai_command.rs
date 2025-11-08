use crate::AppData;
use crate::im_request_client::ImUrl;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{State, ipc::Channel};
use tracing::{error, info};

/// SSE 流式数据事件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SseStreamEvent {
    /// 事件类型: "chunk" | "done" | "error"
    pub event_type: String,
    /// 数据内容
    pub data: Option<String>,
    /// 错误信息
    pub error: Option<String>,
    /// 请求ID，用于区分不同的请求
    pub request_id: String,
}

/// AI 消息发送请求参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMessageRequest {
    pub conversation_id: String,
    pub content: String,
    pub use_context: Option<bool>,
}

/// 发送 AI 消息并监听 SSE 流式响应
#[tauri::command]
pub async fn ai_message_send_stream(
    state: State<'_, AppData>,
    body: AiMessageRequest,
    request_id: String,
    on_event: Channel<SseStreamEvent>,
) -> Result<(), String> {
    info!(
        "🤖 开始发送 AI 流式消息请求, conversation_id: {}, request_id: {}",
        body.conversation_id, request_id
    );

    // 使用 ImRequestClient 发送流式请求
    let response = {
        let mut rc = state.rc.lock().await;
        let (method, path) = ImUrl::MessageSendStream.get_url();

        rc.request_stream(method, path, Some(body), None::<serde_json::Value>)
            .await
            .map_err(|e| {
                error!("❌ 发送流式请求失败: {}", e);
                let error_event = SseStreamEvent {
                    event_type: "error".to_string(),
                    data: None,
                    error: Some(e.to_string()),
                    request_id: request_id.clone(),
                };
                let _ = on_event.send(error_event);
                e.to_string()
            })?
    }; // 锁在这里释放

    info!("✅ SSE 连接已建立，开始监听流式数据...");

    // 在后台任务中处理 SSE 事件流
    let request_id_clone = request_id.clone();

    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        let mut full_content = String::new();
        let mut buffer = String::new();

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    // 将字节转换为字符串
                    if let Ok(text) = String::from_utf8(chunk.to_vec()) {
                        info!("🔍 收到原始数据块 (长度: {}): {:?}", text.len(), text);
                        buffer.push_str(&text);

                        // 处理 SSE 格式的数据
                        // SSE 格式: data: <content>\n\n
                        while let Some(pos) = buffer.find("\n\n") {
                            let message = buffer[..pos].to_string();
                            buffer = buffer[pos + 2..].to_string();

                            info!("📦 处理SSE消息: {:?}", message);

                            // 解析 SSE 消息
                            for line in message.lines() {
                                info!("📝 处理行: {:?}", line);

                                if let Some(data) = line.strip_prefix("data: ") {
                                    info!("📨 收到 SSE 数据: {}", data);

                                    // 累积内容
                                    full_content.push_str(data);

                                    // 发送数据块事件到前端
                                    let chunk_event = SseStreamEvent {
                                        event_type: "chunk".to_string(),
                                        data: Some(data.to_string()),
                                        error: None,
                                        request_id: request_id_clone.clone(),
                                    };

                                    if let Err(e) = on_event.send(chunk_event) {
                                        error!("❌ 发送 chunk 事件失败: {}", e);
                                    }
                                } else if line.starts_with("data:") {
                                    // 处理没有空格的情况: data:<content>
                                    let data = &line[5..];
                                    info!("📨 收到 SSE 数据 (无空格): {}", data);

                                    // 累积内容
                                    full_content.push_str(data);

                                    // 发送数据块事件到前端
                                    let chunk_event = SseStreamEvent {
                                        event_type: "chunk".to_string(),
                                        data: Some(data.to_string()),
                                        error: None,
                                        request_id: request_id_clone.clone(),
                                    };

                                    if let Err(e) = on_event.send(chunk_event) {
                                        error!("❌ 发送 chunk 事件失败: {}", e);
                                    }
                                }
                            }
                        }
                    } else {
                        error!("❌ 无法将字节转换为UTF-8字符串");
                    }
                }
                Err(e) => {
                    error!("❌ 读取流数据失败: {}", e);
                    let error_event = SseStreamEvent {
                        event_type: "error".to_string(),
                        data: None,
                        error: Some(e.to_string()),
                        request_id: request_id_clone.clone(),
                    };

                    if let Err(e) = on_event.send(error_event) {
                        error!("❌ 发送 error 事件失败: {}", e);
                    }
                    break;
                }
            }
        }

        // 流结束，发送完成事件
        info!("✅ SSE 流正常结束，总内容长度: {}", full_content.len());
        let done_event = SseStreamEvent {
            event_type: "done".to_string(),
            data: Some(full_content),
            error: None,
            request_id: request_id_clone.clone(),
        };

        if let Err(e) = on_event.send(done_event) {
            error!("❌ 发送 done 事件失败: {}", e);
        }

        info!("🏁 SSE 流处理完成");
    });

    Ok(())
}
