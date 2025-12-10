// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenv::dotenv;

#[cfg(target_os = "linux")]
use hula_app_lib::utils::linux_runtime_guard as runtime_guard;
#[cfg(target_os = "macos")]
use hula_app_lib::utils::macos_runtime_guard as runtime_guard;
#[cfg(target_os = "windows")]
use hula_app_lib::utils::win_runtime_guard as runtime_guard;

fn main() -> std::io::Result<()> {
    dotenv().ok();
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        runtime_guard::apply_runtime_guards();
    }
    hula_app_lib::run();
    Ok(())
}
