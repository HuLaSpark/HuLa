use tauri::{AppHandle, Manager, RunEvent, Runtime};

/// 当应用在 macOS 系统上重新打开时，如果没有可见窗口，会优先显示已存在的 home 窗口。
pub fn handle_app_event<R: Runtime>(app_handle: &AppHandle<R>, event: RunEvent) {
    match event {
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => {
            // 直接尝试获取 home 窗口，如果存在则显示并置于最顶部
            if let Some(home_window) = app_handle.get_webview_window("home") {
                let _ = home_window.show();
                let _ = home_window.unminimize();
                let _ = home_window.set_focus();
            }
        }
        _ => {}
    }
}