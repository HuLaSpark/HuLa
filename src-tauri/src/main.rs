// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod tray;
mod user_cmd;
use tauri::{LogicalSize, Manager};
use user_cmd::{get_user_info, save_user_info, default_window_icon, screenshot, audio};
use tauri_plugin_autostart::MacosLauncher;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--flag1"])))
        .setup(move |app| {
            app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            tray::create_tray(app.handle())?;

            let os = std::env::consts::OS;
            match os {
                "windows" => {
                    // 如果是 Windows，找到 label 为 "login" 的窗口并设置 decorations 为 false
                    let window = app.get_webview_window("login").expect("Failed to get window");
                    window.set_decorations(false).expect("Failed to set decorations");
                    let new_size = LogicalSize { width: 320.0, height: 448.0 };
                    window.set_size(new_size).expect("Failed to set size");
                }
                _ => {}
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_user_info, save_user_info, default_window_icon, screenshot, audio])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
