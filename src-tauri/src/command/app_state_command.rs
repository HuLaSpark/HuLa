use std::sync::atomic::Ordering;

use crate::APP_STATE_READY;

/// 提供给前端查询的命令，用于判断 Rust 侧是否已经完成 `AppData` 注入。
/// 启动期间如果未完成初始化，该命令会返回 `false`，前端即可延迟调用依赖状态的接口。
#[tauri::command]
pub fn is_app_state_ready() -> bool {
    APP_STATE_READY.load(Ordering::SeqCst)
}
