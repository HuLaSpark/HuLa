use tauri::{AppHandle, Manager, Runtime};
use window_shadows::set_shadow;

/// 重新设置窗口属性
#[tauri::command]
pub fn reset_set_window<R: Runtime>(app: tauri::AppHandle<R>, label: String) {
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
pub fn set_tray_icon(app: AppHandle) {
    app.tray_handle()
        .set_icon(tauri::Icon::Raw(
            include_bytes!("../../../public/msg.png").to_vec(),
        ))
        .unwrap();
}

/// 退出程序
#[tauri::command]
pub fn exit(app: AppHandle) {
    app.exit(0)
}