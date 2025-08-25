// 桌面端依赖
#[cfg(desktop)]
mod desktops;
#[cfg(desktop)]
use common::init::CustomInit;
#[cfg(desktop)]
use common_cmd::{
    audio, default_window_icon, get_files_meta, get_window_payload, push_window_payload,
    screenshot, set_height,
};
#[cfg(target_os = "macos")]
use common_cmd::{hide_title_bar_buttons, set_window_level_above_menubar, show_title_bar_buttons};
#[cfg(target_os = "macos")]
use desktops::app_event;
#[cfg(desktop)]
use desktops::{common_cmd, directory_scanner, init, tray, video_thumbnail::get_video_thumbnail};
#[cfg(desktop)]
use directory_scanner::{cancel_directory_scan, get_directory_usage_info_with_progress};
#[cfg(desktop)]
use init::DesktopCustomInit;
use std::sync::Arc;
pub mod command;
pub mod common;
pub mod configuration;
pub mod error;
mod im_request_client;
pub mod pojo;
pub mod repository;
pub mod timeout_config;
pub mod utils;
mod vo;
pub mod websocket;

use crate::command::request_command::{im_request_command, login_command};
use crate::command::room_member_command::{
    cursor_page_room_members, get_room_members, page_room, update_my_room_info,
};
use crate::command::user_command::remove_tokens;
use crate::configuration::get_configuration;
use crate::error::CommonError;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::ops::Deref;

// 移动端依赖
#[cfg(mobile)]
use common::init::CustomInit;
#[cfg(mobile)]
mod mobiles;

pub struct AppData {
    db_conn: Arc<DatabaseConnection>,
    user_info: Arc<Mutex<UserInfo>>,
    pub rc: Arc<Mutex<im_request_client::ImRequestClient>>,
}

use crate::command::contact_command::{hide_contact_command, list_contacts_command};
use crate::command::message_command::{
    check_user_init_and_fetch_messages, page_msg, save_msg, send_msg, update_message_recall_status,
};
use crate::command::message_mark_command::save_message_mark;

use tauri::{Listener, Manager};
use tokio::sync::Mutex;

pub fn run() {
    #[cfg(desktop)]
    {
        if let Err(e) = setup_desktop() {
            tracing::error!("Failed to setup desktop application: {}", e);
            std::process::exit(1);
        }
    }
    #[cfg(mobile)]
    {
        setup_mobile();
    }
}

#[cfg(desktop)]
fn setup_desktop() -> Result<(), CommonError> {
    // 创建一个缓存实例
    // let cache: Cache<String, String> = Cache::builder()
    //     // Time to idle (TTI):  30 minutes
    //     .time_to_idle(Duration::from_secs(30 * 60))
    //     // Create the cache.
    //     .build();
    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| common_setup(app))
        .invoke_handler(get_invoke_handlers())
        .build(tauri::generate_context!())
        .map_err(|e| {
            CommonError::RequestError(format!("Failed to build tauri application: {}", e))
        })?
        .run(|app_handle, event| {
            #[cfg(target_os = "macos")]
            app_event::handle_app_event(&app_handle, event);
            #[cfg(not(target_os = "macos"))]
            {
                let _ = (app_handle, event);
            }
        });
    Ok(())
}

// 异步初始化应用数据
async fn initialize_app_data(
    app_handle: tauri::AppHandle,
) -> Result<
    (
        Arc<DatabaseConnection>,
        Arc<Mutex<UserInfo>>,
        Arc<Mutex<im_request_client::ImRequestClient>>,
    ),
    CommonError,
> {
    use migration::{Migrator, MigratorTrait};
    use tracing::info;

    // 加载配置
    let configuration = Arc::new(
        get_configuration(&app_handle)
            .map_err(|e| anyhow::anyhow!("Failed to load configuration: {}", e))?,
    );

    // 初始化数据库连接
    let db: Arc<DatabaseConnection> = Arc::new(
        configuration
            .database
            .connection_string(&app_handle)
            .await?,
    );

    // 数据库迁移
    match Migrator::up(db.as_ref(), None).await {
        Ok(_) => {
            info!("Database migration completed");
        }
        Err(e) => {
            eprintln!("Warning: Database migration failed: {}", e);
        }
    }

    let rc: im_request_client::ImRequestClient =
        im_request_client::ImRequestClient::new(configuration.backend.base_url.clone()).unwrap();

    // 创建用户信息
    let user_info = UserInfo {
        token: Default::default(),
        refresh_token: Default::default(),
        uid: Default::default(),
    };
    let user_info = Arc::new(Mutex::new(user_info));

    Ok((db, user_info, Arc::new(Mutex::new(rc))))
}

// 设置用户信息监听器
fn setup_user_info_listener_early(app_handle: tauri::AppHandle) {
    let app_handle_clone = app_handle.clone();
    app_handle.listen("set_user_info", move |event| {
        let app_handle = app_handle_clone.clone();
        tauri::async_runtime::spawn(async move {
            // 等待AppData状态可用
            if let Some(app_data) = app_handle.try_state::<AppData>() {
                if let Ok(payload) = serde_json::from_str::<UserInfo>(&event.payload()) {
                    // 避免多重锁，分别获取和释放锁
                    // 2. 然后更新用户信息
                    {
                        let mut user_info = app_data.user_info.lock().await;
                        user_info.uid = payload.uid.clone();
                        user_info.token = payload.token.clone();
                        user_info.refresh_token = payload.refresh_token.clone();
                    } // user_info 锁在这里释放

                    // 检查用户的 is_init 状态并获取消息
                    {
                        let mut client = app_data.rc.lock().await;
                        if let Err(e) = check_user_init_and_fetch_messages(
                            &mut client,
                            app_data.db_conn.deref(),
                            &payload.uid,
                        )
                        .await
                        {
                            tracing::error!(
                                "Failed to check user initialization status and fetch messages: {}",
                                e
                            );
                        }
                    }
                }
            }
        });
    });
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub token: String,
    pub refresh_token: String,
    pub uid: String,
}

pub async fn build_request_client() -> Result<reqwest::Client, CommonError> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| anyhow::anyhow!("Reqwest client error: {}", e))?;
    Ok(client)
}

/// 处理退出登录时的窗口管理逻辑
///
/// 该函数会：
/// - 关闭除 login/tray 外的大部分窗口
/// - 隐藏但保留 capture/checkupdate 窗口
/// - 优雅地处理窗口关闭过程中的错误
#[cfg(desktop)]
pub async fn handle_logout_windows(app_handle: &tauri::AppHandle) {
    tracing::info!(
        "🚪 [LOGOUT] Starting to close windows and preserve capture/checkupdate windows"
    );

    let all_windows = app_handle.webview_windows();
    tracing::info!("📋 [LOGOUT] Found {} windows", all_windows.len());

    // 收集需要关闭的窗口和需要隐藏的窗口
    let mut windows_to_close = Vec::new();
    let mut windows_to_hide = Vec::new();

    for (label, window) in all_windows {
        match label.as_str() {
            // 这些窗口完全不处理
            "login" | "tray" => {
                tracing::info!("⏭️ [LOGOUT] Skipping window: {}", label);
            }
            // 这些窗口只隐藏，不销毁
            "capture" | "checkupdate" => {
                tracing::info!("💾 [LOGOUT] Marking window for preservation: {}", label);
                windows_to_hide.push((label, window));
            }
            // 其他窗口需要关闭
            _ => {
                tracing::info!("🗑️ [LOGOUT] Marking window for closure: {}", label);
                windows_to_close.push((label, window));
            }
        }
    }

    // 先隐藏需要保持的窗口
    for (label, window) in windows_to_hide {
        tracing::info!("👁️ [LOGOUT] Hiding window (preserving): {}", label);
        if let Err(e) = window.hide() {
            tracing::warn!("⚠️ [LOGOUT] Failed to hide window {}: {}", label, e);
        }
    }

    // 逐个关闭窗口，添加小延迟以避免并发关闭导致的错误
    for (label, window) in windows_to_close {
        tracing::info!("🔄 [LOGOUT] Closing window: {}", label);

        // 先隐藏窗口，减少用户感知的延迟
        let _ = window.hide();

        // 添加小延迟，让窗口有时间处理正在进行的操作
        // tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        match window.destroy() {
            Ok(_) => {
                tracing::info!("✅ [LOGOUT] Successfully closed window: {}", label);
            }
            Err(error) => {
                // 检查窗口是否还存在
                if app_handle.get_webview_window(&label).is_none() {
                    tracing::info!(
                        "ℹ️ [LOGOUT] Window {} no longer exists, skipping closure",
                        label
                    );
                } else {
                    tracing::warn!(
                        "⚠️ [LOGOUT] Warning when closing window {}: {} (this is usually normal)",
                        label,
                        error
                    );
                }
            }
        }
    }

    tracing::info!(
        "🎉 [LOGOUT] Logout completed - windows closed and capture/checkupdate windows preserved"
    );
}

// 设置登出事件监听器
#[cfg(desktop)]
fn setup_logout_listener(app_handle: tauri::AppHandle) {
    let app_handle_clone = app_handle.clone();
    app_handle.listen("logout", move |_event| {
        let app_handle = app_handle_clone.clone();
        tauri::async_runtime::spawn(async move {
            handle_logout_windows(&app_handle).await;
        });
    });
}

#[cfg(mobile)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn setup_mobile() {
    // 创建一个缓存实例
    // let cache: Cache<String, String> = Cache::builder()
    //     // Time to idle (TTI):  30 minutes
    //     .time_to_idle(Duration::from_secs(30 * 60))
    //     // Create the cache.
    //     .build();

    if let Err(e) = tauri::Builder::default()
        .init_plugin()
        .setup(move |app| common_setup(app))
        .invoke_handler(get_invoke_handlers())
        .run(tauri::generate_context!())
    {
        tracing::log::error!("Failed to run mobile application: {}", e);
        std::process::exit(1);
    }
}

// 公共的 setup 函数
fn common_setup(
    app: &mut tauri::App,
) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();
    setup_user_info_listener_early(app.handle().clone());
    #[cfg(desktop)]
    setup_logout_listener(app.handle().clone());

    // 异步初始化应用数据，避免阻塞主线程
    match tauri::async_runtime::block_on(initialize_app_data(app_handle.clone())) {
        Ok((db, user_info, rc)) => {
            // 使用 manage 方法在运行时添加状态
            app_handle.manage(AppData {
                db_conn: db.clone(),
                user_info: user_info.clone(),
                rc: rc,
            });
        }
        Err(e) => {
            tracing::error!("Failed to initialize application data: {}", e);
            return Err(format!("Failed to initialize app data: {}", e).into());
        }
    }

    #[cfg(desktop)]
    tray::create_tray(app.handle())?;
    Ok(())
}

// 公共的命令处理器函数
fn get_invoke_handlers() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static
{
    use crate::command::user_command::{
        get_user_tokens, save_user_info, update_user_last_opt_time,
    };
    #[cfg(desktop)]
    use crate::desktops::common_cmd::set_badge_count;
    use crate::websocket::commands::{
        ws_disconnect, ws_force_reconnect, ws_get_app_background_state, ws_get_health,
        ws_get_state, ws_init_connection, ws_is_connected, ws_send_message,
        ws_set_app_background_state, ws_update_config,
    };

    tauri::generate_handler![
        // 桌面端特定命令
        #[cfg(desktop)]
        default_window_icon,
        #[cfg(desktop)]
        screenshot,
        #[cfg(desktop)]
        audio,
        #[cfg(desktop)]
        set_height,
        #[cfg(desktop)]
        get_video_thumbnail,
        #[cfg(target_os = "macos")]
        hide_title_bar_buttons,
        #[cfg(target_os = "macos")]
        show_title_bar_buttons,
        #[cfg(target_os = "macos")]
        set_window_level_above_menubar,
        #[cfg(desktop)]
        push_window_payload,
        #[cfg(desktop)]
        get_window_payload,
        #[cfg(desktop)]
        get_files_meta,
        #[cfg(desktop)]
        get_directory_usage_info_with_progress,
        #[cfg(desktop)]
        cancel_directory_scan,
        #[cfg(desktop)]
        set_badge_count,
        // 通用命令（桌面端和移动端都支持）
        save_user_info,
        get_user_tokens,
        remove_tokens,
        update_user_last_opt_time,
        page_room,
        get_room_members,
        update_my_room_info,
        cursor_page_room_members,
        list_contacts_command,
        hide_contact_command,
        page_msg,
        send_msg,
        save_msg,
        update_message_recall_status,
        save_message_mark,
        // WebSocket 相关命令
        ws_init_connection,
        ws_disconnect,
        ws_send_message,
        ws_get_state,
        ws_get_health,
        ws_force_reconnect,
        ws_update_config,
        ws_is_connected,
        ws_set_app_background_state,
        ws_get_app_background_state,
        login_command,
        im_request_command,
    ]
}
