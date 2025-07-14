// 桌面端依赖
#[cfg(desktop)]
mod desktops;
#[cfg(target_os = "macos")]
use common_cmd::hide_title_bar_buttons;
#[cfg(desktop)]
use common_cmd::{
    audio, default_window_icon, get_directory_size, get_directory_usage_info, get_files_meta,
    get_window_payload, push_window_payload, screenshot, set_badge_count, set_height,
};
#[cfg(desktop)]
use desktops::{app_event, common_cmd, init, tray, video_thumbnail::get_video_thumbnail};
#[cfg(desktop)]
use init::CustomInit;

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
            get_video_thumbnail,
            #[cfg(target_os = "macos")]
            hide_title_bar_buttons,
            push_window_payload,
            get_window_payload,
            get_files_meta,
            get_directory_size,
            get_directory_usage_info
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            app_event::handle_app_event(&app_handle, event);
        });
}

#[cfg(mobile)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn setup_mobile() {
    tauri::Builder::default()
        .init_plugin()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
