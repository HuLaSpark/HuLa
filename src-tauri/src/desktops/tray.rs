#[cfg(target_os = "windows")]
use tauri::{
    Emitter, Manager, PhysicalPosition, Runtime,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg(target_os = "macos")]
use tauri::{
    Manager, Runtime,
    menu::{MenuBuilder, MenuId, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
use tauri::{
    Manager, PhysicalPosition, Runtime,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
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
        let default_icon = match app.default_window_icon() {
            Some(icon) => icon.clone(),
            None => {
                tracing::error!("未找到默认窗口图标");
                return Err(tauri::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "未找到默认窗口图标",
                )));
            }
        };

        let _ = TrayIconBuilder::with_id("tray")
            .tooltip("HuLa")
            .icon(default_icon)
            .menu(&tray_menu) // 直接设置菜单，让系统处理右键显示
            .show_menu_on_left_click(false) // 禁用左键显示菜单
            .on_menu_event(move |app, event| {
                let id = event.id();
                if id == &open_id {
                    // 打开主面板
                    let windows = app.webview_windows();

                    // 优先显示已存在的home窗口
                    for (name, window) in windows {
                        if name == "home" {
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
            .on_tray_icon_event(move |tray, event| match event {
                TrayIconEvent::Click {
                    id: _,
                    position: _,
                    rect: _,
                    button,
                    button_state,
                } => match button {
                    MouseButton::Left if MouseButtonState::Up == button_state => {
                        // 左键点击直接打开主面板
                        let windows = tray.app_handle().webview_windows();

                        // 优先显示已存在的home窗口
                        for (name, window) in windows {
                            if name == "home" {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                break;
                            }
                        }
                    }
                    _ => {}
                },
                _ => {}
            })
            .build(app)?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        // 为其他系统（非 macOS）创建托盘图标
        let default_icon = match app.default_window_icon() {
            Some(icon) => icon.clone(),
            None => {
                log::error!("未找到默认窗口图标");
                return Err(tauri::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "未找到默认窗口图标",
                )));
            }
        };

        let _ = TrayIconBuilder::with_id("tray")
            .tooltip("HuLa")
            .icon(default_icon)
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
                                if let Err(e) = window.show() {
                                    log::warn!("显示窗口 {} 失败: {}", name, e);
                                }
                                if let Err(e) = window.unminimize() {
                                    log::warn!("取消最小化窗口 {} 失败: {}", name, e);
                                }
                                if let Err(e) = window.set_focus() {
                                    log::warn!("设置窗口 {} 焦点失败: {}", name, e);
                                }
                                break;
                            }
                        }
                    }
                    MouseButton::Right if MouseButtonState::Down == button_state => {
                        // 状态栏图标按下右键时显示状态栏菜单
                        if let Some(tray_window) = tray.app_handle().get_webview_window("tray") {
                            if let Ok(outer_size) = tray_window.outer_size() {
                                if let Err(e) = tray_window.set_position(PhysicalPosition::new(
                                    position.x,
                                    position.y - outer_size.height as f64,
                                )) {
                                    log::warn!("设置托盘窗口位置失败: {}", e);
                                    return;
                                }

                                let _ = tray_window.set_always_on_top(true);
                                let _ = tray_window.show();
                                let _ = tray_window.set_focus();
                            }
                        } else {
                            log::warn!("未找到托盘窗口");
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
                    if let Ok(rect) = tray.rect() {
                        match tray.app_handle().emit_to("notify", "notify_enter", &rect) {
                            Ok(_) => {
                                log::info!("notify_enter事件发送成功");
                            }
                            Err(e) => {
                                log::warn!("Failed to emit notify_enter event: {}", e);
                            }
                        }
                    } else {
                        log::warn!("Failed to get tray rect");
                    }
                }
                #[cfg(target_os = "windows")]
                TrayIconEvent::Leave {
                    id: _,
                    position: _,
                    rect: _,
                } => {
                    if let Err(e) = tray.app_handle().emit_to("notify", "notify_leave", ()) {
                        log::warn!("Failed to emit notify_leave event: {}", e);
                    }
                }
                _ => {}
            })
            .build(app);
    }
    Ok(())
}
