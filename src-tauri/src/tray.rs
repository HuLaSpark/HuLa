use tauri::{
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent}, Emitter, Manager, Runtime
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let _ = TrayIconBuilder::with_id("tray")
        .tooltip("HuLa")
        .icon(app.default_window_icon().unwrap().clone())
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                id: _,
                position,
                rect: _,
                button,
                button_state: _,
            } => match button {
                MouseButton::Left {} => {
                    let windows = tray.app_handle().webview_windows();
                    for (key, value) in windows {
                        if key == "login" || key == "home" {
                            value.show().unwrap();
                            value.unminimize().unwrap();
                            value.set_focus().unwrap();
                        }
                    }
                }
                MouseButton::Right {} => {
                    tray.app_handle().emit("tray_menu", position).unwrap();
                }
                _ => {}
            },
            TrayIconEvent::Enter {
                id: _,
                position,
                rect: _,
            } => {
                tray.app_handle().emit("tray_enter", position).unwrap();
            }
            TrayIconEvent::Leave {
                id: _,
                position,
                rect: _,
            } => {
                tray.app_handle().emit("tray_leave", position).unwrap();
            }
            _ => {}
        })
        .build(app);
    Ok(())
}
