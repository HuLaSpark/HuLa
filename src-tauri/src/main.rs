// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod init;
mod tray;
mod common_cmd;
use init::CustomInit;
use common_cmd::{audio, default_window_icon, get_user_info, save_user_info, screenshot, set_height, set_badge_count};

fn main() {
    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| {
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_user_info,
            save_user_info,
            default_window_icon,
            screenshot,
            audio,
            set_height,
            set_badge_count
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
