// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tokio::main]
async fn main() -> std::io::Result<()> {
    hula_app_lib::run().await;
    Ok(())
}
