use std::ops::Deref;
use tauri::{Emitter, State};
use tracing::{error, info};

use crate::{
    AppData,
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
            info!("尝试自动登录，用户ID: {}", uid);

            // 从数据库获取用户的 refresh_token
            match im_user_repository::get_user_tokens(state.db_conn.deref(), uid).await {
                Ok(Some((_, refresh_token))) => {
                    info!("找到用户 {} 的 refresh_token，尝试刷新登录", uid);

                    // 使用 refresh_token 刷新登录
                    let refresh_req = RefreshTokenReq {
                        refresh_token: refresh_token.clone(),
                    };

                    let mut rc = state.rc.lock().await;
                    match rc.refresh_token(refresh_req).await {
                        Ok(Some(refresh_resp)) => {
                            info!("自动登录成功，用户ID: {}", uid);

                            // 保存新的 token 信息到数据库
                            if let Err(e) = im_user_repository::save_user_tokens(
                                state.db_conn.deref(),
                                uid,
                                &refresh_resp.token,
                                &refresh_resp.refresh_token,
                            )
                            .await
                            {
                                error!("保存新的 token 信息失败: {}", e);
                            }

                            // 转换为 LoginResp 格式返回
                            let login_resp = LoginResp {
                                token: refresh_resp.token,
                                client: "".to_string(), // refresh_token 响应通常不包含 client
                                refresh_token: refresh_resp.refresh_token,
                                expire: refresh_resp.expire,
                            };

                            return Ok(Some(login_resp));
                        }
                        Ok(None) => {
                            error!("自动登录失败：刷新 token 返回空结果");
                        }
                        Err(e) => {
                            error!("自动登录失败：刷新 token 请求失败: {}", e);
                        }
                    }
                }
                Ok(None) => {
                    info!("用户 {} 没有保存的 token 信息，无法自动登录", uid);
                }
                Err(e) => {
                    error!("获取用户 {} 的 token 信息失败: {}", uid, e);
                }
            }

            // 自动登录失败，返回错误让前端切换到手动登录
            return Err("自动登录失败，请手动登录".to_string());
        } else {
            return Err("自动登录缺少用户ID".to_string());
        }
    } else {
        // 手动登录逻辑
        info!("进行手动登录");
        let mut rc = state.rc.lock().await;
        let res = rc.login(data).await.map_err(|e| e.to_string())?;
        Ok(res)
    }
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
