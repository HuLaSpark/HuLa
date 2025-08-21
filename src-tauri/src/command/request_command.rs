use tauri::State;

use crate::{
    AppData,
    im_request_client::{ImRequest, ImUrl},
    vo::vo::{LoginReq, LoginResp},
};

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
    Ok(res.data)
}

#[tauri::command]
pub async fn im_request_command(
    state: State<'_, AppData>,
    url: String,
    body: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
) -> Result<Option<serde_json::Value>, String> {
    let mut rc = state.rc.lock().await;

    if let Ok(url) = url.parse::<ImUrl>() {
        let result = rc
            .im_request(url, body, params)
            .await
            .map_err(|e| e.to_string())?;

        return Ok(result.data);
    } else {
        return Err(format!("Invalid URL: {}", url));
    }
}
