// 桌面端依赖
#[cfg(desktop)]
mod desktops;
use anyhow::Context;
#[cfg(target_os = "macos")]
use common_cmd::hide_title_bar_buttons;
#[cfg(desktop)]
use common_cmd::{audio, default_window_icon, screenshot, set_badge_count, set_height};
#[cfg(desktop)]
use desktops::video_thumbnail::get_video_thumbnail;
use reqwest::header;
use std::sync::Arc;
#[cfg(desktop)]
mod proxy;
#[cfg(desktop)]
mod command;
#[cfg(desktop)]
use desktops::common_cmd;
#[cfg(desktop)]
use desktops::init;
#[cfg(desktop)]
use desktops::tray;
#[cfg(desktop)]
use init::CustomInit;
#[cfg(desktop)]
use proxy::test_api_proxy;
#[cfg(desktop)]
use proxy::test_ws_proxy;

// 移动端依赖
#[cfg(mobile)]
mod mobiles;
mod vo;
pub mod error;
pub mod repository;
pub mod configuration;
pub mod pojo;

use crate::command::room_member_command::{page_room_members};
use crate::command::user_command::login;
use crate::configuration::get_configuration;
use crate::error::CommonError;
use crate::repository::im_config_repository::get_token;
#[cfg(mobile)]
use init::CustomInit;
#[cfg(mobile)]
use mobiles::init;
use sea_orm::DatabaseConnection;

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

struct AppData {
    db_conn: Arc<DatabaseConnection>,
    config: Arc<configuration::Settings>,
    request_client: Arc<reqwest::Client>,
}

#[cfg(desktop)]
async fn setup_desktop() -> Result<(), CommonError> {
    use tauri::Manager;

    use crate::command::user_command::save_user_info;

    let configuration = get_configuration().expect("加载配置文件失败");
    let db = configuration.database.connection_string().await?;

    let client = build_request_client(&db).await?;

    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| {
            app.manage(AppData { db_conn: Arc::new(db), config: Arc::new(configuration), request_client: Arc::new(client) });
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            default_window_icon,
            screenshot,
            audio,
            set_height,
            set_badge_count,
            test_api_proxy,
            test_ws_proxy,
            get_video_thumbnail,
            #[cfg(target_os = "macos")]
            hide_title_bar_buttons,
            save_user_info,
            login,
            page_room_members
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

pub async fn build_request_client(db: &DatabaseConnection) -> Result<reqwest::Client, CommonError> {
    let token = get_token(db).await?;

    let mut headers = header::HeaderMap::new();
    if let Some(token) = token {
        headers.insert(header::AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
    }
    let client = reqwest::Client::builder().default_headers(headers).build().with_context(|| "Reqwest client 异常")?;

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
