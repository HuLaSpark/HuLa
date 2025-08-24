use tauri::State;

use crate::{im_request_client::{ImRequest, ImUrl}, vo::vo::{LoginReq, LoginResp}, AppData};
#[cfg(desktop)]
use crate::handle_logout_windows;

#[tauri::command]
pub async fn login_command(
    data: LoginReq,
    state: State<'_, AppData>,
) -> Result<Option<LoginResp>, String> {
    let res = state
        .rc
        .lock()
        .await
        .login(data)
        .await
        .map_err(|e| e.to_string())?;
    Ok(res)
}

#[tauri::command]
#[cfg_attr(mobile, allow(unused_variables))]
pub async fn im_request_command(
    state: State<'_, AppData>,
    url: String,
    body: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
    app_handle: tauri::AppHandle
) -> Result<Option<serde_json::Value>, String> {
    let mut rc = state.rc.lock().await;

    if let Ok(url) = url.parse::<ImUrl>() {
        let result: Result<Option<serde_json::Value>, anyhow::Error> = rc
            .im_request(url, body, params)
            .await;

        match result {
          Ok(data) => {
            return Ok(data);
          }
          Err(e) => {
            if e.to_string().contains("请重新登录") {
              #[cfg(desktop)]
              handle_logout_windows(&app_handle).await;
            }
            return Err(e.to_string())
          }
        }
    } else {
        tracing::error!("Invalid URL: {}", url);
        return Err(format!("Invalid URL: {}", url));
    }
}
