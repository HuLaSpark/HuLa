use tauri::State;

use crate::{configuration::Settings, AppData};


#[tauri::command]
pub fn get_settings(state: State<'_, AppData>,) -> Result<Settings, String> {
  Ok(state.config.as_ref().clone())
}
