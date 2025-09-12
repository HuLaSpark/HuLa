use serde_json::Value;
use std::collections::HashMap;
use tracing::debug;

/// 消息处理器
/// 负责处理不同类型的 WebSocket 消息
pub struct MessageProcessor {
    message_handlers: HashMap<String, Box<dyn Fn(&Value) + Send + Sync>>,
}

impl MessageProcessor {
    pub fn new() -> Self {
        Self {
            message_handlers: HashMap::new(),
        }
    }

    /// 注册消息处理器
    pub fn register_handler<F>(&mut self, message_type: String, handler: F)
    where
        F: Fn(&Value) + Send + Sync + 'static,
    {
        self.message_handlers
            .insert(message_type, Box::new(handler));
    }

    /// 处理接收到的消息
    pub fn process_message(&self, message: &Value) -> ProcessResult {
        // 尝试解析消息类型
        if let Some(msg_type) = self.extract_message_type(message) {
            debug!("📥 Processing message type: {}", msg_type);

            // 查找对应的处理器
            if let Some(handler) = self.message_handlers.get(&msg_type) {
                handler(message);
                return ProcessResult::Handled;
            } else {
                debug!("🔍 No handler found for message type {}", msg_type);
            }
        }

        ProcessResult::Unhandled
    }

    /// 提取消息类型
    fn extract_message_type(&self, message: &Value) -> Option<String> {
        message.get("type").and_then(|t| {
            if let Some(s) = t.as_str() {
                Some(s.to_string())
            } else if let Some(n) = t.as_u64() {
                Some(n.to_string())
            } else {
                None
            }
        })
    }

    /// 验证消息格式
    pub fn validate_message(&self, message: &Value) -> ValidationResult {
        // 基本结构验证
        if !message.is_object() {
            return ValidationResult::Invalid("Message must be an object".to_string());
        }

        // 检查必需字段
        if message.get("type").is_none() {
            return ValidationResult::Invalid("Message must have a 'type' field".to_string());
        }

        ValidationResult::Valid
    }

    /// 过滤敏感信息
    pub fn sanitize_message(&self, mut message: Value) -> Value {
        // 移除可能的敏感字段
        if let Some(obj) = message.as_object_mut() {
            let sensitive_keys = ["password", "token", "secret", "key"];
            for key in sensitive_keys {
                if obj.contains_key(key) {
                    obj.insert(key.to_string(), Value::String("***".to_string()));
                }
            }
        }
        message
    }
}

impl Default for MessageProcessor {
    fn default() -> Self {
        let mut processor = Self::new();
        processor.register_default_handlers();
        processor
    }
}

impl MessageProcessor {
    /// 注册默认的消息处理器
    fn register_default_handlers(&mut self) {
        // 登录相关消息
        self.register_handler("1".to_string(), |msg| {
            debug!("🔑 Processing login-related message: {:?}", msg);
        });

        // 心跳消息
        self.register_handler("2".to_string(), |_msg| {
            debug!("💓 Received heartbeat message");
        });

        self.register_handler("3".to_string(), |_msg| {
            debug!("💓 Received heartbeat response");
        });

        // 普通聊天消息
        self.register_handler("RECEIVE_MESSAGE".to_string(), |msg| {
            debug!("💬 Received chat message: {:?}", msg);
        });

        // 用户状态变化
        self.register_handler("USER_STATE_CHANGE".to_string(), |msg| {
            debug!("👤 User status changed: {:?}", msg);
        });

        // 视频通话相关
        self.register_handler("VideoCallRequest".to_string(), |msg| {
            debug!("📹 Received video call request: {:?}", msg);
        });

        self.register_handler("CallAccepted".to_string(), |msg| {
            debug!("✅ Call accepted: {:?}", msg);
        });

        self.register_handler("CallRejected".to_string(), |msg| {
            debug!("❌ Call rejected: {:?}", msg);
        });
    }
}

/// 消息处理结果
#[derive(Debug, PartialEq)]
pub enum ProcessResult {
    Handled,
    Unhandled,
}

/// 消息验证结果
#[derive(Debug, PartialEq)]
pub enum ValidationResult {
    Valid,
    Invalid(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_message_validation() {
        let processor = MessageProcessor::new();

        // 有效消息
        let valid_msg = json!({
            "type": "test",
            "data": "some data"
        });
        assert_eq!(
            processor.validate_message(&valid_msg),
            ValidationResult::Valid
        );

        // 无效消息 - 缺少 type
        let invalid_msg = json!({
            "data": "some data"
        });
        assert!(matches!(
            processor.validate_message(&invalid_msg),
            ValidationResult::Invalid(_)
        ));

        // 无效消息 - 不是对象
        let invalid_msg2 = json!("not an object");
        assert!(matches!(
            processor.validate_message(&invalid_msg2),
            ValidationResult::Invalid(_)
        ));
    }

    #[test]
    fn test_message_sanitization() {
        let processor = MessageProcessor::new();

        let sensitive_msg = json!({
            "type": "login",
            "password": "secret123",
            "token": "abc123",
            "data": "normal data"
        });

        let sanitized = processor.sanitize_message(sensitive_msg);
        assert_eq!(sanitized["password"], "***");
        assert_eq!(sanitized["token"], "***");
        assert_eq!(sanitized["data"], "normal data");
    }
}
