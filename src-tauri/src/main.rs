// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Runtime};
use window_shadows::set_shadow;
use crate::common::window::set_window_attribute;

mod common;

/// 重新设置窗口属性
#[tauri::command]
fn reset_set_window<R: Runtime>(app: tauri::AppHandle<R>, label: String) {
    let window = app.get_window(&label).unwrap();
    set_shadow(&window, true).expect("Unsupported platform!");

    #[cfg(target_os = "macos")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

    #[cfg(target_os = "windows")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_blur' is only supported on Windows");
}

fn main() {
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .setup(|app| {
            set_window_attribute(app);
            Ok(())
        })
        .menu(tauri::Menu::new())// 使用空菜单来替换默认的操作系统菜单
        .system_tray(common::tray::menu())// 将 `tauri.conf.json` 上配置的图标添加到系统托盘
        .on_system_tray_event(common::tray::handler) // 注册系统托盘事件处理程序
        .invoke_handler(tauri::generate_handler![reset_set_window])
        .run(context)
        .expect("error while running tauri application");
}
