use tauri::Runtime;
use tauri::plugin::TauriPlugin;
use tauri_plugin_log::fern::colors::{Color, ColoredLevelConfig};
use tauri_plugin_log::{Target, TargetKind};
pub trait CustomInit {
    fn init_plugin(self) -> Self;
}

impl<R: Runtime> CustomInit for tauri::Builder<R> {
    // 初始化插件
    fn init_plugin(self) -> Self {
        let builder = self
            // 移动端和桌面端都支持的插件
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_http::init())
            .plugin(tauri_plugin_upload::init())
            .plugin(tauri_plugin_sql::Builder::new().build())
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_mic_recorder::init())
            .plugin(tauri_plugin_safe_area_insets::init())
            .plugin(build_log_plugin());

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
                            log::warn!("Failed to show home window: {}", e);
                        }
                        if let Err(e) = window.unminimize() {
                            log::warn!("Failed to unminimize home window: {}", e);
                        }
                        if let Err(e) = window.set_focus() {
                            log::warn!("Failed to focus home window: {}", e);
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

pub fn build_log_plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        .level(log::LevelFilter::Info)
        .level_for("sqlx", log::LevelFilter::Debug)
        .level_for("sqlx::query", log::LevelFilter::Debug)
        .level_for("sea_orm", log::LevelFilter::Info)
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
