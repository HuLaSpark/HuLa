use std::collections::HashMap;

use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone, Serialize, Deserialize)]
pub struct WindowPayload {
    pub payload: serde_json::Value,
}

impl WindowPayload {
    pub fn new(payload: serde_json::Value) -> Self {
        WindowPayload { payload }
    }
}

lazy_static! {
    static ref PAYLOAD_CACHE: Mutex<HashMap<String, WindowPayload>> = Mutex::new(HashMap::new());
}

pub async fn push_window_payload(label: String, payload: WindowPayload) -> Option<WindowPayload> {
    let mut payload_cache = PAYLOAD_CACHE.lock().await;
    payload_cache.insert(label, payload)
}

pub async fn get_window_payload(label: String) -> Option<WindowPayload> {
    let mut payload_cache = PAYLOAD_CACHE.lock().await;
    payload_cache.remove(&label)
}
