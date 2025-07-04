// 桌面端依赖
#[cfg(desktop)]
mod desktops;
use std::sync::Arc;

#[cfg(target_os = "macos")]
use common_cmd::hide_title_bar_buttons;
#[cfg(desktop)]
use common_cmd::{audio, default_window_icon, screenshot, set_badge_count, set_height};
#[cfg(desktop)]
use desktops::video_thumbnail::get_video_thumbnail;
#[cfg(desktop)]
mod proxy;
#[cfg(desktop)]
mod entity;
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

#[cfg(mobile)]
use init::CustomInit;
#[cfg(mobile)]
use mobiles::init;
use sea_orm::DatabaseConnection;

pub async fn run() {
    #[cfg(desktop)]
    {
        setup_desktop().await;
    }
    #[cfg(mobile)]
    {
        setup_mobile();
    }
}

struct AppData {
    db_conn: Arc<DatabaseConnection>,
}

#[cfg(desktop)]
async fn setup_desktop() {
    use std::path::PathBuf;
    use tauri::Manager;

    use sea_orm::Database;
    use crate::command::user_command::save_user_info;

    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR")); // 项目根目录
    path.push("db.sqlite");
    let db_url = format!("sqlite:{}?mode=rwc", path.display());
    
    let db: DatabaseConnection = Database::connect(db_url).await.unwrap();

    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| {
            app.manage(AppData { db_conn: Arc::new(db) });
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
            save_user_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(mobile)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn setup_mobile() {
    tauri::Builder::default()
        .init_plugin()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
