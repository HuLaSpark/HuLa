use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::info;

use crate::{AppData, configuration::Settings};

#[tauri::command]
pub async fn get_settings(state: State<'_, AppData>) -> Result<Settings, String> {
    Ok(state.config.lock().await.clone())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsParams {
    base_url: String,
    ws_url: String,
}

#[tauri::command]
pub async fn update_settings(
    state: State<'_, AppData>,
    settings: UpdateSettingsParams,
) -> Result<(), String> {
    let mut config = state.config.lock().await;
    config.backend.base_url = settings.base_url.clone();
    config.backend.ws_url = settings.ws_url;
    info!("update settings: {:?}", config);
    state
        .rc
        .lock()
        .await
        .set_base_url(settings.base_url.clone());
    Ok(())
}
