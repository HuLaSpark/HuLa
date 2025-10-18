use std::ops::Deref;
use tauri::{Emitter, State};
use tracing::{error, info};

use crate::{
    AppData,
    command::message_command::check_user_init_and_fetch_messages,
    im_request_client::{ImRequest, ImUrl},
    repository::im_user_repository,
    vo::vo::{LoginReq, LoginResp, RefreshTokenReq},
};

#[tauri::command]
pub async fn login_command(
    data: LoginReq,
    state: State<'_, AppData>,
) -> Result<Option<LoginResp>, String> {
    if data.is_auto_login {
        // 自动登录逻辑
        if let Some(uid) = &data.uid {
            info!("Attempting auto login, user ID: {}", uid);

            // 从数据库获取用户的 refresh_token
            match im_user_repository::get_user_tokens(state.db_conn.deref(), uid).await {
                Ok(Some((_, refresh_token))) => {
                    info!(
                        "Found refresh_token for user {}, attempting to refresh login",
                        uid
                    );

                    // 使用 refresh_token 刷新登录
                    let refresh_req = RefreshTokenReq {
                        refresh_token: refresh_token.clone(),
                    };

                    let refresh_result = {
                        let mut rc = state.rc.lock().await;
                        rc.refresh_token(refresh_req).await
                    };

                    match refresh_result {
                        Ok(Some(refresh_resp)) => {
                            info!("Auto login successful, user ID: {}", uid);

                            // 保存新的 token 信息到数据库
                            if let Err(e) = im_user_repository::save_user_tokens(
                                state.db_conn.deref(),
                                uid,
                                &refresh_resp.token,
                                &refresh_resp.refresh_token,
                            )
                            .await
                            {
                                error!("Failed to save new token info: {}", e);
                            }

                            // 转换为 LoginResp 格式返回
                            let login_resp = LoginResp {
                                token: refresh_resp.token,
                                client: "".to_string(), // refresh_token 响应通常不包含 client
                                refresh_token: refresh_resp.refresh_token,
                                expire: refresh_resp.expire,
                                uid: refresh_resp.uid,
                            };

                            handle_login_success(&login_resp, &state, data.async_data).await?;

                            return Ok(Some(login_resp));
                        }
                        Ok(None) => {
                            error!("Auto login failed: refresh token returned empty result");
                        }
                        Err(e) => {
                            error!("Auto login failed: refresh token request failed: {}", e);
                        }
                    }
                }
                Ok(None) => {
                    info!("User {} has no saved token info, cannot auto login", uid);
                }
                Err(e) => {
                    error!("Failed to get token info for user {}: {}", uid, e);
                }
            };
            // 自动登录失败，返回错误让前端切换到手动登录
            return Err("自动登录失败，请手动登录".to_string());
        } else {
            return Err("自动登录缺少用户ID".to_string());
        }
    } else {
        // 手动登录逻辑
        info!("Performing manual login");

        let async_data = data.async_data;
        let res = {
            let mut rc = state.rc.lock().await;
            rc.login(data).await.map_err(|e| e.to_string())?
        }; // 锁在这里被释放

        // 登录成功后处理用户信息和token保存
        if let Some(login_resp) = &res {
            handle_login_success(login_resp, &state, async_data).await?;
        }

        info!("Manual login successful");
        Ok(res)
    }
}

async fn handle_login_success(login_resp: &LoginResp, state: &State<'_, AppData>, async_data: bool) -> Result<(), String> {
    info!("handle_login_success, login_resp: {:?}", login_resp);
    // 从登录响应中获取用户标识，这里使用 uid 作为 uid
    let uid = &login_resp.uid;

    // 设置用户信息
    let mut user_info = state.user_info.lock().await;
    user_info.uid = login_resp.uid.clone();
    user_info.token = login_resp.token.clone();
    user_info.refresh_token = login_resp.refresh_token.clone();
    info!("handle_login_success, user_info: {:?}", user_info);
    // 保存 token 信息到数据库
    im_user_repository::save_user_tokens(
        state.db_conn.deref(),
        uid,
        &login_resp.token,
        &login_resp.refresh_token,
    )
    .await
    .map_err(|e| e.to_string())?;

    let mut client = state.rc.lock().await;
    check_user_init_and_fetch_messages(&mut client, state.db_conn.deref(), uid, async_data).await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[cfg_attr(mobile, allow(unused_variables))]
pub async fn im_request_command(
    state: State<'_, AppData>,
    url: String,
    body: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
    app_handle: tauri::AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    let mut rc = state.rc.lock().await;

    if let Ok(url) = url.parse::<ImUrl>() {
        let result: Result<Option<serde_json::Value>, anyhow::Error> =
            rc.im_request(url, body, params).await;

        match result {
            Ok(data) => {
                return Ok(data);
            }
            Err(e) => {
                tracing::error!("Request error: {}", e);
                if e.to_string().contains("请重新登录") {
                    app_handle.emit_to("home", "relogin", ()).unwrap();
                }
                return Err(e.to_string());
            }
        }
    } else {
        tracing::error!("Invalid URL: {}", url);
        return Err(format!("Invalid URL: {}", url));
    }
}
