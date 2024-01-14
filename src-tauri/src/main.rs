// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use crate::{
    utils::{set_window_shadow}
};

mod tray;
mod utils;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .setup(|app| {
            set_window_shadow(app);
            Ok(())
        })
        .menu(tauri::Menu::new())// 使用空菜单来替换默认的操作系统菜单
        .system_tray(tray::menu())// 将 `tauri.conf.json` 上配置的图标添加到系统托盘
        .on_system_tray_event(tray::handler) // 注册系统托盘事件处理程序
        .invoke_handler(tauri::generate_handler![greet])
        .run(context)
        .expect("error while running tauri application");
}
