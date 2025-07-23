use tauri::plugin::TauriPlugin;
use tauri::{Manager, Runtime, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::fern::colors::{Color, ColoredLevelConfig};
use tauri_plugin_log::{Target, TargetKind};

pub trait CustomInit {
    fn init_plugin(self) -> Self;

    fn init_webwindow_event(self) -> Self;

    fn init_window_event(self) -> Self;
}

impl<R: Runtime> CustomInit for tauri::Builder<R> {
    // 初始化插件
    fn init_plugin(self) -> Self {
        let builder = self
            .plugin(tauri_plugin_os::init())
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
                // 优先显示已存在的home窗口
                for (name, window) in windows {
                    if name == "home" {
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
            .plugin(build_log_plugin());

        #[cfg(debug_assertions)]
        let builder = builder.plugin(tauri_plugin_devtools::init());

        builder
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

fn build_log_plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        .skip_logger()
        .level(log::LevelFilter::Info)
        .level_for("sqlx::query", log::LevelFilter::Warn)
        .level_for("hula_app_lib", log::LevelFilter::Debug)
        .targets([
            Target::new(TargetKind::Stdout),
            // 将 rust 日志打印到 webview的 devtool 中
            Target::new(TargetKind::Webview),
        ])
        .with_colors(ColoredLevelConfig {
            error: Color::Red,
            warn: Color::Yellow,
            debug: Color::White,
            info: Color::Green,
            trace: Color::White,
        })
        .build()
}
