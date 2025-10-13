use tauri::{AppHandle, State};

use crate::AppData;

pub mod chat_history_command;
pub mod contact_command;
pub mod file_manager_command;
pub mod message_command;
pub mod message_mark_command;
pub mod request_command;
pub mod room_member_command;
pub mod setting_command;
pub mod user_command;

// A custom task for setting the state of a setup task
#[tauri::command]
pub async fn set_complete(
    _app: AppHandle,
    state: State<'_, AppData>,
    task: String,
) -> Result<(), ()> {
    tracing::info!("set_complete: {}", task);
    match task.as_str() {
        "frontend" => *state.frontend_task.lock().await = true,
        "backend" => *state.backend_task.lock().await = true,
        _ => panic!("invalid task completed!"),
    }
    // 不再自动隐藏启动画面，由前端页面渲染完成后主动调用 hide_splash_screen
    tracing::info!("set_complete {}: {:?}", task, state.frontend_task);
    tracing::info!("set_complete {}: {:?}", task, state.backend_task);
    Ok(())
}
