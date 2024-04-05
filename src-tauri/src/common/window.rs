use tauri::{Manager, Runtime};
use window_shadows::set_shadow;

/// 设置窗口属性
pub fn set_window_attribute<R: Runtime>(app: &tauri::App<R>) {
  for (_, window) in app.windows() {
    // 设置窗口阴影和圆角
    #[cfg(any(windows, target_os = "macos"))]
    set_shadow(&window, true).unwrap();

    // 设置窗口的磨砂背景
    #[cfg(target_os = "macos")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

    #[cfg(target_os = "windows")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_blur' is only supported on Windows");
  }
}