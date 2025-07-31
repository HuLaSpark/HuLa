use tauri::{Runtime, plugin::TauriPlugin};
use tauri_plugin_log::fern::colors::{Color, ColoredLevelConfig};
use tauri_plugin_log::{Target, TargetKind};

pub trait CustomInit {
    fn init_plugin(self) -> Self;
}

/// 构建平台特定的日志插件
fn build_log_plugin<R: Runtime>() -> TauriPlugin<R> {
    let mut builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        .level_for("sqlx", tracing::log::LevelFilter::Debug)
        .level_for("sqlx::query", tracing::log::LevelFilter::Debug)
        .level_for("sea_orm", tracing::log::LevelFilter::Info)
        .level_for("hula_app_lib", tracing::log::LevelFilter::Debug)
        // 过滤掉无用的 tauri 内部日志
        .level_for("tauri::manager", tracing::log::LevelFilter::Warn)
        .level_for("tauri::event", tracing::log::LevelFilter::Warn)
        .level_for("tauri::plugin", tracing::log::LevelFilter::Warn)
        .level_for("tauri::ipc", tracing::log::LevelFilter::Warn)
        .level_for("tao", tracing::log::LevelFilter::Warn)
        .level_for("wry", tracing::log::LevelFilter::Warn)
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::Webview),
        ])
        .with_colors(ColoredLevelConfig {
            error: Color::Red,
            warn: Color::Yellow,
            debug: Color::White,
            info: Color::Green,
            trace: Color::White,
        });

    #[cfg(desktop)]
    {
        builder = builder
            .skip_logger()
            .level(tracing::log::LevelFilter::Debug);
    }

    #[cfg(mobile)]
    {
        builder = builder.level(tracing::log::LevelFilter::Info);
    }

    builder.build()
}

/// 初始化公共插件（所有平台通用）
pub fn init_common_plugins<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    let builder = builder
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
        .plugin(tauri_plugin_mic_recorder::init());

    // 添加日志插件
    builder.plugin(build_log_plugin())
}
