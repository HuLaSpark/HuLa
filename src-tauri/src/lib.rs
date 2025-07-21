// 桌面端依赖
#[cfg(desktop)]
mod desktops;
#[cfg(target_os = "macos")]
use common_cmd::hide_title_bar_buttons;
#[cfg(desktop)]
use common_cmd::{
    audio, default_window_icon, get_files_meta, get_window_payload, push_window_payload,
    screenshot, set_badge_count, set_height,
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

use crate::command::contact_command::list_contacts_command;
use crate::command::message_command::{
    check_user_init_and_fetch_messages, page_msg, save_msg, send_msg,
};
use tauri::Listener;
use tokio::sync::Mutex;

pub async fn run() {
    #[cfg(desktop)]
    {
        setup_desktop().await.unwrap();
    }
    #[cfg(mobile)]
    {
        setup_mobile();
    }
}

#[cfg(desktop)]
async fn setup_desktop() -> Result<(), CommonError> {
    use crate::command::user_command::save_user_info;

    let configuration = Arc::new(get_configuration().expect("加载配置文件失败"));
    let db = Arc::new(configuration.database.connection_string().await?);

    let im_request_client =
        ImRequestClient::new(configuration.clone().backend.base_url.clone()).await?;
    let user_info = UserInfo {
        token: Default::default(),
        refresh_token: Default::default(),
        uid: Default::default(),
    };

    // 创建一个缓存实例
    let cache: Cache<String, String> = Cache::builder()
        // Time to idle (TTI):  30 minutes
        .time_to_idle(Duration::from_secs(30 * 60))
        // Create the cache.
        .build();

    let client = Arc::new(Mutex::new(im_request_client));
    let user_info = Arc::new(Mutex::new(user_info));
    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .manage(AppData {
            db_conn: db.clone(),
            request_client: client.clone(),
            user_info: user_info.clone(),
            cache,
        })
        .setup(move |app| {
            // 设置 AppHandle 到 ImRequestClient（使用 spawn 避免运行时嵌套）
            let client_clone = client.clone();
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let client_guard = client_clone.lock().await;
                client_guard.set_app_handle(app_handle);
            });

            // 监听前端事件，保存登录用户信息
            setup_user_info_listener(app, client.clone(), user_info.clone(), db.clone());
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            default_window_icon,
            screenshot,
            audio,
            set_height,
            set_badge_count,
            get_video_thumbnail,
            #[cfg(target_os = "macos")]
            hide_title_bar_buttons,
            save_user_info,
            page_room,
            get_room_members,
            update_my_room_info,
            cursor_page_room_members,
            list_contacts_command,
            page_msg,
            send_msg,
            save_msg,
            push_window_payload,
            get_window_payload,
            get_files_meta,
            get_directory_usage_info_with_progress,
            cancel_directory_scan
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
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

/// 设置用户信息事件监听器
fn setup_user_info_listener(
    app: &tauri::App,
    client: Arc<Mutex<ImRequestClient>>,
    user_info: Arc<Mutex<UserInfo>>,
    db_conn: Arc<DatabaseConnection>,
) {
    app.listen("set_user_info", {
        let client = client.clone();
        let user_info = user_info.clone();
        let db_conn = db_conn.clone();
        move |event| {
            let client = client.clone();
            let user_info = user_info.clone();
            let db_conn = db_conn.clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(payload) = serde_json::from_str::<UserInfo>(&event.payload()) {
                    let client = client.lock().await;

                    // 更新 client 的 token
                    if let Ok(mut token_guard) = client.token.lock() {
                        *token_guard = Some(payload.token.clone());
                    }

                    if let Ok(mut refresh_token_guard) = client.refresh_token.lock() {
                        *refresh_token_guard = Some(payload.refresh_token.clone());
                    }

                    // 更新 client 的 refresh_token（如果有的话）
                    // 这里假设 UserInfo 可能包含 refresh_token，如果没有则保持原值
                    let mut user_info = user_info.lock().await;
                    user_info.uid = payload.uid.clone();
                    user_info.token = payload.token.clone();
                    user_info.refresh_token = payload.refresh_token.clone();

                    // 检查用户的 is_init 状态并获取消息
                    if let Err(e) =
                        check_user_init_and_fetch_messages(&client, db_conn.deref(), &payload.uid)
                            .await
                    {
                        log::error!("检查用户初始化状态并获取消息失败: {}", e);
                    }
                }
            });
        }
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

#[cfg(mobile)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn setup_mobile() {
    tauri::Builder::default()
        .init_plugin()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
