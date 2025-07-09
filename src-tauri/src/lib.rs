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
pub mod im_reqest_client;

use crate::command::room_member_command::{get_room_members, page_room};
use crate::configuration::get_configuration;
use crate::error::CommonError;
use crate::im_reqest_client::ImRequestClient;
#[cfg(mobile)]
use init::CustomInit;
#[cfg(mobile)]
use mobiles::init;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

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
    request_client: Arc<Mutex<ImRequestClient>>,
}

use tauri::Listener;
use tokio::sync::Mutex;

#[cfg(desktop)]
async fn setup_desktop() -> Result<(), CommonError> {
    use tauri::Manager;

    use crate::command::user_command::save_user_info;

    let configuration = Arc::new(get_configuration().expect("加载配置文件失败"));
    let db = Arc::new(configuration.database.connection_string().await?);

    let im_request_client = ImRequestClient::new(configuration.clone().backend.base_url.clone()).await?;

    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| {
            let client = Arc::new(Mutex::new(im_request_client));
            app.listen("set_token", {
                let client = client.clone();
                move |event| {
                    let client = client.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Ok(payload) = serde_json::from_str::<Token>(&event.payload()) {
                            let mut client = client.lock().await;
                            client.token = Some(payload.token);
                        }
                    });
                }
            });

            app.manage(AppData { db_conn: db.clone(), request_client: client.clone() });
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
            page_room,
            get_room_members
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}


#[derive(Serialize, Deserialize)]
pub struct Token {
    pub token: String,
}

pub async fn build_request_client() -> Result<reqwest::Client, CommonError> {
    let client = reqwest::Client::builder().build().with_context(|| "Reqwest client 异常")?;
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
