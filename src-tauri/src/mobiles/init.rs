use tauri::Runtime;
pub trait CustomInit {
    fn init_plugin(self) -> Self;
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
            .plugin(tauri_plugin_sql::Builder::new().build())
            .plugin(tauri_plugin_mic_recorder::init())
    }
}
