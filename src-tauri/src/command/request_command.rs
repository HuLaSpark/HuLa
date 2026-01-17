use migration::{Migrator, MigratorTrait};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::{
    AppData,
    command::message_command::check_user_init_and_fetch_messages,
    command::token_helper::capture_token_snapshot_direct,
    configuration::get_configuration,
    im_request_client::{ImRequest, ImUrl},
    repository::{im_message_repository::reset_table_initialization_flags, im_user_repository},
    vo::vo::{LoginReq, LoginResp},
};

#[tauri::command]
pub async fn login_command(
    data: LoginReq,
    state: State<'_, AppData>,
    app_handle: AppHandle,
) -> Result<Option<LoginResp>, String> {
    if data.is_auto_login {
        // 自动登录逻辑
        if let Some(uid) = &data.uid {
            // 先切换到用户专属数据库
            switch_to_user_database(&state, &app_handle, uid).await?;

            // 从数据库获取用户的 refresh_token
            let db_result =
                im_user_repository::get_user_tokens(&*state.db_conn.read().await, uid).await;
            match db_result {
                Ok(Some((token, refresh_token))) => {
                    if refresh_token.is_empty() {
                        let check_result: Result<Option<serde_json::Value>, anyhow::Error> = {
                            let mut rc = state.rc.lock().await;
                            rc.token = Some(token.clone());
                            rc.im_request(
                                ImUrl::CheckToken,
                                None::<serde_json::Value>,
                                None::<serde_json::Value>,
                            )
                            .await
                        };

                        if check_result.is_ok() {
                            let login_resp = LoginResp {
                                token,
                                client: "".to_string(),
                                refresh_token: refresh_token.clone(),
                                expire: "".to_string(),
                                uid: uid.clone(),
                            };
                            handle_login_success(&login_resp, &state, data.async_data).await?;
                            return Ok(Some(login_resp));
                        }
                    }

                    // 使用 start_refresh_token 刷新登录（不会添加 token 头，适合自动登录场景）
                    let refresh_result = {
                        let mut rc = state.rc.lock().await;
                        // 设置 ImRequestClient 内部的 refresh_token
                        rc.refresh_token = Some(refresh_token.clone());
                        rc.start_refresh_token().await
                    };

                    match refresh_result {
                        Ok(()) => {
                            // 从 ImRequestClient 中获取刷新后的 token
                            let rc = state.rc.lock().await;
                            let new_token = rc.token.clone().unwrap_or_default();
                            let new_refresh_token = rc.refresh_token.clone().unwrap_or_default();
                            drop(rc);

                            // 保存新的 token 信息到数据库
                            im_user_repository::save_user_tokens(
                                &*state.db_conn.read().await,
                                uid,
                                &new_token,
                                &new_refresh_token,
                            )
                            .await
                            .ok();

                            // 转换为 LoginResp 格式返回
                            let login_resp = LoginResp {
                                token: new_token,
                                client: "".to_string(),
                                refresh_token: new_refresh_token,
                                expire: "".to_string(),
                                uid: uid.clone(),
                            };

                            handle_login_success(&login_resp, &state, data.async_data).await?;

                            return Ok(Some(login_resp));
                        }
                        Err(e) => {
                            let err_str = e.to_string();
                            if err_str.contains("network_error") {
                                return Err("网络连接失败，请检查网络后重试".to_string());
                            }
                        }
                    }
                }
                Ok(None) => {}
                Err(_) => {}
            };
            // 自动登录失败，返回错误让前端切换到手动登录
            return Err("自动登录失败，请手动登录".to_string());
        } else {
            return Err("自动登录缺少用户ID".to_string());
        }
    } else {
        // 手动登录逻辑
        let async_data = data.async_data;
        let res = {
            let mut rc = state.rc.lock().await;
            rc.login(data).await.map_err(|e| e.to_string())?
        }; // 锁在这里被释放

        // 登录成功后处理用户信息和token保存
        if let Some(login_resp) = &res {
            // 先切换到用户专属数据库
            switch_to_user_database(&state, &app_handle, &login_resp.uid).await?;
            handle_login_success(login_resp, &state, async_data).await?;
        }

        Ok(res)
    }
}

/// 切换到用户专属数据库
async fn switch_to_user_database(
    state: &State<'_, AppData>,
    app_handle: &AppHandle,
    uid: &str,
) -> Result<(), String> {
    // 获取配置
    let configuration = get_configuration(app_handle)
        .map_err(|e| format!("Failed to load configuration: {}", e))?;

    // 创建新的数据库连接
    let new_db = configuration
        .database
        .connection_string(app_handle, Some(uid))
        .await
        .map_err(|e| e.to_string())?;

    // 执行数据库迁移
    if let Err(e) = Migrator::up(&new_db, None).await {
        tracing::warn!("Database migration warning for user {}: {}", uid, e);
    }

    // 重置表初始化标志，确保新数据库会创建必要的表
    reset_table_initialization_flags();

    // 替换数据库连接
    {
        let mut db_guard = state.db_conn.write().await;
        *db_guard = new_db;
    }

    Ok(())
}

async fn handle_login_success(
    login_resp: &LoginResp,
    state: &State<'_, AppData>,
    async_data: bool,
) -> Result<(), String> {
    // 从登录响应中获取用户标识，这里使用 uid 作为 uid
    let uid = &login_resp.uid;

    // 设置用户信息
    let mut user_info = state.user_info.lock().await;
    user_info.uid = login_resp.uid.clone();
    user_info.token = login_resp.token.clone();
    user_info.refresh_token = login_resp.refresh_token.clone();
    // 保存 token 信息到数据库
    im_user_repository::save_user_tokens(
        &*state.db_conn.read().await,
        uid,
        &login_resp.token,
        &login_resp.refresh_token,
    )
    .await
    .map_err(|e| e.to_string())?;

    let mut client = state.rc.lock().await;
    check_user_init_and_fetch_messages(
        &mut client,
        &*state.db_conn.read().await,
        uid,
        async_data,
        false,
    )
    .await
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
    let user_uid = state.user_info.lock().await.uid.clone();
    let mut rc = state.rc.lock().await;

    // 记录请求前的 token，用于检测是否被刷新
    let old_tokens = capture_token_snapshot_direct(&rc);

    if let Ok(url) = url.parse::<ImUrl>() {
        let result: Result<Option<serde_json::Value>, anyhow::Error> =
            rc.im_request(url, body, params).await;

        // 无论请求成功还是失败，都检查 token 是否被刷新，如果是则保存到数据库
        // 这确保了即使请求重试后失败，刷新后的 token 也能被持久化
        if let (Some(new_token), Some(new_refresh_token)) =
            (rc.token.clone(), rc.refresh_token.clone())
        {
            if old_tokens.token != rc.token || old_tokens.refresh_token != rc.refresh_token {
                if !user_uid.is_empty() {
                    im_user_repository::save_user_tokens(
                        &*state.db_conn.read().await,
                        &user_uid,
                        &new_token,
                        &new_refresh_token,
                    )
                    .await
                    .ok();
                }
            }
        }

        match result {
            Ok(data) => {
                return Ok(data);
            }
            Err(e) => {
                if e.to_string().contains("请重新登录") {
                    if user_uid.is_empty() {
                    } else {
                        if app_handle.get_webview_window("home").is_some() {
                            if let Err(err) = app_handle.emit_to("home", "relogin", ()) {
                                let _ = err;
                            }
                        } else if app_handle.get_webview_window("mobile-home").is_some() {
                            if let Err(err) = app_handle.emit_to("mobile-home", "relogin", ()) {
                                let _ = err;
                            }
                        } else {
                            if let Err(err) = app_handle.emit("relogin", ()) {
                                let _ = err;
                            }
                        }
                    }
                }
                return Err(e.to_string());
            }
        }
    } else {
        return Err(format!("Invalid URL: {}", url));
    }
}
