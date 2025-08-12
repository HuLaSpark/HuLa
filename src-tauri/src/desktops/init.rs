use crate::common::init::{CustomInit, init_common_plugins};
use tauri::{Manager, Runtime, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

pub trait DesktopCustomInit {
    fn init_webwindow_event(self) -> Self;

    fn init_window_event(self) -> Self;
}

impl<R: Runtime> CustomInit for tauri::Builder<R> {
    // 初始化插件
    fn init_plugin(self) -> Self {
        let builder = init_common_plugins(self);

        // 桌面端特有的插件
        #[cfg(desktop)]
        let builder = builder
            .plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"]),
            ))
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cmd| {
                let windows = app.webview_windows();
                // 优先显示已存在的home窗口
                for (name, window) in windows {
                    if name == "home" {
                        if let Err(e) = window.show() {
                            tracing::warn!("Failed to show home window: {}", e);
                        }
                        if let Err(e) = window.unminimize() {
                            tracing::warn!("Failed to unminimize home window: {}", e);
                        }
                        if let Err(e) = window.set_focus() {
                            tracing::warn!("Failed to focus home window: {}", e);
                        }
                        break;
                    }
                }
            }))
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_updater::Builder::new().build());

        // #[cfg(debug_assertions)]
        // let builder = builder.plugin(tauri_plugin_devtools::init());

        builder
    }
}

impl<R: Runtime> DesktopCustomInit for tauri::Builder<R> {
    // 初始化web窗口事件
    fn init_webwindow_event(self) -> Self {
        self.on_webview_event(|_, event| match event {
            _ => (),
        })
    }

    // 初始化系统窗口事件
    fn init_window_event(self) -> Self {
        self.on_window_event(|window, event: &WindowEvent| match event {
            WindowEvent::Focused(flag) => {
                // 自定义系统托盘-实现托盘菜单失去焦点时隐藏
                #[cfg(not(target_os = "macos"))]
                if !window.label().eq("tray") && *flag {
                    if let Some(tray_window) = window.app_handle().get_webview_window("tray") {
                        let _ = tray_window.hide();
                    }
                }
                if window.label().eq("tray") && !flag {
                    if let Err(e) = window.hide() {
                        tracing::warn!("Failed to hide tray window: {}", e);
                    }
                }
                #[cfg(target_os = "windows")]
                if !window.label().eq("notify") && *flag {
                    if let Some(notify_window) = window.app_handle().get_webview_window("notify") {
                        let _ = notify_window.hide();
                    }
                }
                #[cfg(target_os = "windows")]
                if window.label().eq("notify") && !flag {
                    if let Err(e) = window.hide() {
                        tracing::warn!("Failed to hide notify window: {}", e);
                    }
                }
            }
            WindowEvent::CloseRequested { .. } => {
                // 如果是login窗口被用户关闭，直接退出程序
                if window.label().eq("login") {
                    // 检查是否有其他窗口存在，如果有home窗口，说明是登录成功后的正常关闭
                    let windows = window.app_handle().webview_windows();
                    let has_home_window = windows.iter().any(|(name, _)| name == "home");

                    if !has_home_window {
                        // 没有home窗口，说明是用户直接关闭login窗口，退出程序
                        window.app_handle().exit(0);
                    }
                    // 如果有home窗口，说明是登录成功后的正常关闭，允许关闭
                }
            }
            WindowEvent::Resized(_ps) => {}
            _ => (),
        })
    }
}
