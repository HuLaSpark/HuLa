#[tauri::command]
pub async fn example_command(payload: String) -> Result<String, String> {
    Ok(payload)
}
