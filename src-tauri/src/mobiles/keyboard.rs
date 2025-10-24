#[cfg(target_os = "ios")]
#[tauri::command]
pub fn set_webview_keyboard_adjustment(enabled: bool) {
    crate::webview_helper::set_keyboard_adjustment(enabled);
}
