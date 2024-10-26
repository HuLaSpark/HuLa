// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod init;
mod tray;
mod user_cmd;
use init::CustomInit;
use user_cmd::{audio, default_window_icon, get_user_info, save_user_info, screenshot, set_height};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| {
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_user_info,
            save_user_info,
            default_window_icon,
            screenshot,
            audio,
            set_height
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
