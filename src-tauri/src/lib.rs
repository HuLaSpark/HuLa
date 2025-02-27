// 桌面端依赖
#[cfg(desktop)]
mod desktops;
#[cfg(desktop)]
use common_cmd::{
    audio, default_window_icon, screenshot, set_badge_count,
    set_height,
};
#[cfg(desktop)]
mod proxy;
#[cfg(desktop)]
use desktops::common_cmd;
#[cfg(desktop)]
use desktops::init;
#[cfg(desktop)]
use desktops::tray;
#[cfg(desktop)]
use init::CustomInit;
#[cfg(desktop)]
use proxy::test_proxy;

// 移动端依赖
#[cfg(mobile)]
mod mobiles;
#[cfg(mobile)]
use init::CustomInit;
#[cfg(mobile)]
use mobiles::init;

pub fn run() {
    #[cfg(desktop)]
    {
        setup_desktop();
    }
    #[cfg(mobile)]
    {
        setup_mobile();
    }
}

#[cfg(desktop)]
fn setup_desktop() {
    tauri::Builder::default()
        .init_plugin()
        .init_webwindow_event()
        .init_window_event()
        .setup(move |app| {
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            default_window_icon,
            screenshot,
            audio,
            set_height,
            set_badge_count,
            test_proxy
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(mobile)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn setup_mobile() {
    tauri::Builder::default()
        .init_plugin()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
