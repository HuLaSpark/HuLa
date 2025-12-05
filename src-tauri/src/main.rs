// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenv::dotenv;

#[cfg(target_os = "windows")]
use hula_app_lib::utils::win_runtime_guard::apply_runtime_guards;

fn main() -> std::io::Result<()> {
    dotenv().ok();
    #[cfg(target_os = "windows")]
    {
        apply_runtime_guards();
    }
    hula_app_lib::run();
    Ok(())
}
