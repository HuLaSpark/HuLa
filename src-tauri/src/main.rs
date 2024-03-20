// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Runtime, SystemTray};
use window_shadows::set_shadow;
use crate::common::window::set_window_attribute;

mod common;

/// 重新设置窗口属性
#[tauri::command]
fn reset_set_window<R: Runtime>(app: tauri::AppHandle<R>, label: String) {
    let window = app.get_window(&label).unwrap();
    #[cfg(any(windows, target_os = "macos"))]
    set_shadow(&window, true).unwrap();

    #[cfg(target_os = "macos")]
    window_vibrancy::apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar)
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

    #[cfg(target_os = "windows")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_blur' is only supported on Windows");
}

/// 设置托盘图标
#[tauri::command]
fn set_tray_icon(app: AppHandle) {
    app.tray_handle()
        .set_icon(tauri::Icon::Raw(
            include_bytes!("../../public/msg.png").to_vec(),
        ))
        .unwrap();
}

/// 退出程序
#[tauri::command]
fn exit(app: AppHandle) {
    app.exit(0)
}

fn main() {
    let context = tauri::generate_context!();
    let system_tray = SystemTray::new();
    tauri::Builder::default()
        .setup(|app| {
            set_window_attribute(app);
            Ok(())
        })
        .menu(tauri::Menu::new())// 使用空菜单来替换默认的操作系统菜单
        .system_tray(system_tray)// 将 `tauri.conf.json` 上配置的图标添加到系统托盘
        .on_system_tray_event(common::tray::handler) // 注册系统托盘事件处理程序
        .invoke_handler(tauri::generate_handler![reset_set_window, set_tray_icon, exit])
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
