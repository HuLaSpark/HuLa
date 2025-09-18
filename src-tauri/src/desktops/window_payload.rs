use std::collections::HashMap;

use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone, Serialize, Deserialize)]
pub struct WindowPayload {
    pub payload: serde_json::Value,
}

lazy_static! {
    static ref PAYLOAD_CACHE: Mutex<HashMap<String, serde_json::Value>> = Mutex::new(HashMap::new());
}

#[tauri::command]
pub async fn push_window_payload(label: String, payload: serde_json::Value) -> Option<serde_json::Value> {
    let mut payload_cache = PAYLOAD_CACHE.lock().await;
    payload_cache.insert(label, payload)
}

#[tauri::command]
pub async fn get_window_payload(label: String) -> Option<serde_json::Value> {
    let mut payload_cache = PAYLOAD_CACHE.lock().await;
    payload_cache.remove(&label)
}
