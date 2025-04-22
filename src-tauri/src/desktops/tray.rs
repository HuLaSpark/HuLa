#[cfg(target_os = "windows")]
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, Runtime,
};

#[cfg(target_os = "macos")]
use tauri::{
    menu::{MenuBuilder, MenuId, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        // 为 macOS 创建原生菜单
        let open_id = MenuId::new("open_home");
        let exit_id = MenuId::new("exit_app");

        // 创建分隔符和菜单项
        let separator1 = PredefinedMenuItem::separator(app)?;
        let open_menu_item =
            MenuItem::with_id(app, open_id.clone(), "打开主面板", true, None::<&str>)?;
        let separator2 = PredefinedMenuItem::separator(app)?;
        let exit_menu_item = MenuItem::with_id(app, exit_id.clone(), "退出", true, None::<&str>)?;

        // 构建菜单
        let tray_menu = MenuBuilder::new(app)
            .items(&[&separator1, &open_menu_item, &separator2, &exit_menu_item])
            .build()?;

        let tray_handler = app.clone();
        let _ = TrayIconBuilder::with_id("tray")
            .tooltip("HuLa")
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&tray_menu)
            .on_menu_event(move |app, event| {
                let id = event.id();
                if id == &open_id {
                    // 打开主面板
                    let windows = app.webview_windows();
                    for (name, window) in windows {
                        if name == "login" || name == "home" {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            break;
                        }
                    }
                } else if id == &exit_id {
                    // 退出应用
                    let _ = tray_handler.exit(0);
                }
            })
            .build(app)?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        // 为其他系统（非 macOS）创建托盘图标
        let _ = TrayIconBuilder::with_id("tray")
            .tooltip("HuLa")
            .icon(app.default_window_icon().unwrap().clone())
            .on_tray_icon_event(|tray, event| match event {
                TrayIconEvent::Click {
                    id: _,
                    position,
                    rect: _,
                    button,
                    button_state,
                } => match button {
                    MouseButton::Left => {
                        let windows = tray.app_handle().webview_windows();
                        for (name, window) in windows {
                            if name == "login" || name == "home" {
                                window.show().unwrap();
                                window.unminimize().unwrap();
                                window.set_focus().unwrap();
                                break;
                            }
                        }
                    }
                    MouseButton::Right if MouseButtonState::Down == button_state => {
                        // 状态栏图标按下右键时显示状态栏菜单
                        let tray_window = tray.app_handle().get_webview_window("tray").unwrap();
                        if let Ok(outer_size) = tray_window.outer_size() {
                            tray_window
                                .set_position(PhysicalPosition::new(
                                    position.x,
                                    position.y - outer_size.height as f64,
                                ))
                                .unwrap();
                            tray_window.set_always_on_top(true).unwrap();
                            tray_window.show().unwrap();
                            tray_window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                },
                #[cfg(target_os = "windows")]
                TrayIconEvent::Enter {
                    id: _,
                    position: _,
                    rect: _,
                } => {
                    tray.app_handle()
                        .emit_to("notify", "notify_enter", &tray.rect().unwrap())
                        .unwrap();
                },
                #[cfg(target_os = "windows")]
                TrayIconEvent::Leave {
                    id: _,
                    position: _,
                    rect: _,
                } => {
                    tray.app_handle()
                        .emit_to("notify", "notify_leave", ())
                        .unwrap();
                },
                _ => {}
            })
            .build(app);
    }
    Ok(())
}
