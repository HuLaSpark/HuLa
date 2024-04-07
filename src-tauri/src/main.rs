// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{SystemTray};
use crate::common::window::set_window_attribute;
use crate::common::plugins::{ exit, reset_set_window, tray_blink, TrayState, set_stateless_icon, set_main_icon };

mod common;


#[tokio::main]
async fn main() {
    let context = tauri::generate_context!();
    let system_tray = SystemTray::new();
    // 初始化状态
    let state = TrayState {
        id: Mutex::new(None)
    };
    tauri::Builder::default()
        .setup(|app| {
            set_window_attribute(app);
            Ok(())
        })
        .manage(state) // 将状态注入到应用
        .menu(tauri::Menu::new())// 使用空菜单来替换默认的操作系统菜单
        .system_tray(system_tray)// 将 `tauri.conf.json` 上配置的图标添加到系统托盘
        .on_system_tray_event(common::tray::handler) // 注册系统托盘事件处理程序
        .invoke_handler(tauri::generate_handler![reset_set_window, exit, tray_blink, set_stateless_icon, set_main_icon]) // 使用定义的插件
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })// 阻止默认关闭行为
        .run(context)
        .expect("error while running tauri application");
}
