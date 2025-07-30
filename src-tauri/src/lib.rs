// 桌面端依赖
#[cfg(desktop)]
mod desktops;
#[cfg(target_os = "macos")]
use common_cmd::hide_title_bar_buttons;
#[cfg(desktop)]
use common_cmd::{
    audio, default_window_icon, get_files_meta, get_window_payload, push_window_payload,
    screenshot, set_height,
};
#[cfg(target_os = "macos")]
use desktops::app_event;
#[cfg(desktop)]
use desktops::{common_cmd, directory_scanner, init, tray, video_thumbnail::get_video_thumbnail};
#[cfg(desktop)]
use directory_scanner::{cancel_directory_scan, get_directory_usage_info_with_progress};
#[cfg(desktop)]
use init::CustomInit;
use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;
pub mod command;
pub mod configuration;
pub mod error;
pub mod im_reqest_client;
pub mod pojo;
pub mod repository;
pub mod timeout_config;
mod vo;

use crate::command::room_member_command::{
    cursor_page_room_members, get_room_members, page_room, update_my_room_info,
};
use crate::configuration::get_configuration;
use crate::error::CommonError;
use crate::im_reqest_client::ImRequestClient;
use anyhow::Context;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::ops::Deref;

// 移动端依赖
#[cfg(mobile)]
use init::CustomInit;
#[cfg(mobile)]
use mobiles::init;
#[cfg(mobile)]
mod mobiles;

pub struct AppData {
    db_conn: Arc<DatabaseConnection>,
    request_client: Arc<Mutex<ImRequestClient>>,
    user_info: Arc<Mutex<UserInfo>>,
    cache: Cache<String, String>,
}

use crate::command::contact_command::{hide_contact_command, list_contacts_command};
use crate::command::message_command::{
    check_user_init_and_fetch_messages, page_msg, save_msg, send_msg,
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
    let cache: Cache<String, String> = Cache::builder()
        // Time to idle (TTI):  30 minutes
        .time_to_idle(Duration::from_secs(30 * 60))
        // Create the cache.
        .build();
    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| common_setup(app, cache))
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
        Arc<Mutex<ImRequestClient>>,
        Arc<Mutex<UserInfo>>,
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
            info!("数据库迁移完成");
        }
        Err(e) => {
            eprintln!("Warning: Database migration failed: {}", e);
        }
    }

    // 创建 HTTP 客户端
    let im_request_client = ImRequestClient::new(configuration.backend.base_url.clone()).await?;

    // 创建用户信息
    let user_info = UserInfo {
        token: Default::default(),
        refresh_token: Default::default(),
        uid: Default::default(),
    };

    let client = Arc::new(Mutex::new(im_request_client));
    let user_info = Arc::new(Mutex::new(user_info));

    Ok((db, client, user_info))
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

                    // 1. 先更新 client 的 token 信息
                    {
                        let client = app_data.request_client.lock().await;
                        // 使用 try_lock 避免阻塞，如果获取不到锁则跳过更新
                        if let Ok(mut token_guard) = client.token.try_lock() {
                            *token_guard = Some(payload.token.clone());
                        } else {
                            tracing::warn!("无法获取 token 锁，跳过 token 更新");
                        }

                        if let Ok(mut refresh_token_guard) = client.refresh_token.try_lock() {
                            *refresh_token_guard = Some(payload.refresh_token.clone());
                        } else {
                            tracing::warn!("无法获取 refresh_token 锁，跳过 refresh_token 更新");
                        }
                    } // client 锁在这里释放

                    // 2. 然后更新用户信息
                    {
                        let mut user_info = app_data.user_info.lock().await;
                        user_info.uid = payload.uid.clone();
                        user_info.token = payload.token.clone();
                        user_info.refresh_token = payload.refresh_token.clone();
                    } // user_info 锁在这里释放

                    // 检查用户的 is_init 状态并获取消息
                    {
                        let client = app_data.request_client.lock().await;
                        if let Err(e) = check_user_init_and_fetch_messages(
                            &*client,
                            app_data.db_conn.deref(),
                            &payload.uid,
                        )
                        .await
                        {
                            tracing::error!("检查用户初始化状态并获取消息失败: {}", e);
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
        .with_context(|| "Reqwest client 异常")?;
    Ok(client)
}

// 设置登出事件监听器
#[cfg(desktop)]
fn setup_logout_listener(app_handle: tauri::AppHandle) {
    let app_handle_clone = app_handle.clone();
    app_handle.listen("logout", move |_event| {
        let app_handle = app_handle_clone.clone();
        tauri::async_runtime::spawn(async move {
            tracing::info!("[LOGOUT] 开始关闭所有非login窗口");

            let all_windows = app_handle.webview_windows();
            tracing::info!("[LOGOUT] 获取到 {} 个窗口", all_windows.len());

            // 收集需要关闭的窗口
            let mut windows_to_close = Vec::new();
            for (label, window) in all_windows {
                // 跳过 login 窗口，不关闭它
                if label != "login" && label != "tray" {
                    windows_to_close.push((label, window));
                }
            }

            // 逐个关闭窗口，添加小延迟以避免并发关闭导致的错误
            for (label, window) in windows_to_close {
                tracing::info!("[LOGOUT] 正在关闭窗口: {}", label);

                // 先隐藏窗口，减少用户感知的延迟
                let _ = window.hide();

                // 添加小延迟，让窗口有时间处理正在进行的操作
                // tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

                match window.destroy() {
                    Ok(_) => {
                        tracing::info!("[LOGOUT] 成功关闭窗口: {}", label);
                    }
                    Err(error) => {
                        // 检查窗口是否还存在
                        if app_handle.get_webview_window(&label).is_none() {
                            tracing::info!("[LOGOUT] 窗口 {} 已不存在，跳过关闭", label);
                        } else {
                            tracing::warn!(
                                "[LOGOUT] 关闭窗口 {} 时出现警告: {} (这通常是正常的)",
                                label,
                                error
                            );
                        }
                    }
                }
            }

            tracing::info!("[LOGOUT] 所有非login窗口关闭完成");
        });
    });
}

#[cfg(mobile)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn setup_mobile() {
    // 创建一个缓存实例
    let cache: Cache<String, String> = Cache::builder()
        // Time to idle (TTI):  30 minutes
        .time_to_idle(Duration::from_secs(30 * 60))
        // Create the cache.
        .build();

    if let Err(e) = tauri::Builder::default()
        .init_plugin()
        .setup(move |app| common_setup(app, cache))
        .invoke_handler(get_invoke_handlers())
        .run(tauri::generate_context!())
    {
        log::error!("Failed to run mobile application: {}", e);
        std::process::exit(1);
    }
}

// 公共的 setup 函数
fn common_setup(
    app: &mut tauri::App,
    cache: Cache<String, String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();
    setup_user_info_listener_early(app.handle().clone());
    #[cfg(desktop)]
    setup_logout_listener(app.handle().clone());

    // 异步初始化应用数据，避免阻塞主线程
    match tauri::async_runtime::block_on(initialize_app_data(app_handle.clone())) {
        Ok((db, client, user_info)) => {
            // 使用 manage 方法在运行时添加状态
            app_handle.manage(AppData {
                db_conn: db.clone(),
                request_client: client.clone(),
                user_info: user_info.clone(),
                cache,
            });
            let client_guard = tauri::async_runtime::block_on(client.lock());
            client_guard.set_app_handle(app_handle.clone());
            drop(client_guard);
        }
        Err(e) => {
            tracing::error!("初始化应用数据失败: {}", e);
        }
    }

    #[cfg(desktop)]
    tray::create_tray(app.handle())?;
    Ok(())
}

// 公共的命令处理器函数
fn get_invoke_handlers() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static
{
    use crate::command::user_command::{save_user_info, update_user_last_opt_time};
    #[cfg(desktop)]
    use crate::desktops::common_cmd::set_badge_count;

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
        save_message_mark
    ]
}
