use tauri::{Manager, Runtime, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
pub trait CustomInit {
    fn init_plugin(self) -> Self;

    fn init_webwindow_event(self) -> Self;

    fn init_window_event(self) -> Self;
}

impl<R: Runtime> CustomInit for tauri::Builder<R> {
    // 初始化插件
    fn init_plugin(self) -> Self {
        self.plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_http::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_upload::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"]),
            ))
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cmd| {
                let windows = app.webview_windows();
                for (name, window) in windows {
                    if name == "login" || name == "home" {
                        window.show().unwrap();
                        window.unminimize().unwrap();
                        window.set_focus().unwrap();
                        break;
                    }
                }
            }))
            .plugin(tauri_plugin_sql::Builder::new().build())
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_mic_recorder::init())
    }

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
                    window
                        .app_handle()
                        .get_webview_window("tray")
                        .unwrap()
                        .hide()
                        .unwrap();
                }
                if window.label().eq("tray") && !flag {
                    window.hide().unwrap();
                }
                #[cfg(target_os = "windows")]
                if !window.label().eq("notify") && *flag {
                    window
                        .app_handle()
                        .get_webview_window("notify")
                        .unwrap()
                        .hide()
                        .unwrap();
                }
                #[cfg(target_os = "windows")]
                if window.label().eq("notify") && !flag {
                    window.hide().unwrap();
                }
            }
            WindowEvent::Resized(_ps) => {}
            _ => (),
        })
    }
}
