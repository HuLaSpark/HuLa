use std::sync::Arc;
use tauri::{AppHandle, Manager, PhysicalPosition, SystemTrayEvent, WindowEvent};


/// 打开主页
fn open_home(app: &AppHandle) {
    let window = app.get_window("home").unwrap();
    let hide = window.is_visible().unwrap();
    let min = window.is_minimized().unwrap();
    if !hide {
        window.show().unwrap();
    }
    if min {
        window.unminimize().unwrap();
    }
    window.set_focus().unwrap();
}

/// 还原图标
fn red_icon(app: &AppHandle) {
    app.tray_handle()
        .set_icon(tauri::Icon::Raw(
            include_bytes!("../../icons/icon.ico").to_vec(),
        ))
        .unwrap();
}

/// 托盘事件
pub fn handler(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            // 检查 "login" 窗口是否已创建
            if app.get_window("login").is_some() {
                // 如果 "login" 窗口已创建，进一步检查其是否处于最小化状态
                let login_window = app.get_window("login").unwrap();
                if login_window.is_minimized().unwrap() {
                    // 如果 "login" 窗口处于最小化状态，先将其还原
                    login_window.unminimize().unwrap();
                } else {
                    login_window.set_focus().unwrap()
                }
            } else {
                // 如果 "login" 窗口未创建，执行以下操作
                let tray_window = app.get_window("tray").unwrap();
                tray_window.emit("stop", false).unwrap();
                open_home(app);
                red_icon(app);
            }
        },
        SystemTrayEvent::RightClick { position: p, size: _, .. } => {
            // TODO 这里需要根据鼠标位置来确定窗口的位置 (nyh -> 2024-03-20 13:51:01)
            let tray_window = Arc::new(app.get_window("tray").expect("没有该窗口"));
            let size = tray_window.outer_size().unwrap();
            let position_y = p.y - size.height as f64;
            let position_x = p.x + 10.0;
            tray_window.set_position(PhysicalPosition::new(position_x,position_y)).unwrap();
            tray_window.show().unwrap();
            tray_window.set_always_on_top(true).unwrap();//不置顶这个窗口会被挡住
            tray_window.set_focus().unwrap();
            let arc_tray = tray_window.clone();
            tray_window.on_window_event(move |event|match event{
                WindowEvent::CloseRequested { .. } => {}
                WindowEvent::Destroyed => {}
                WindowEvent::Focused(b) => {
                    if !b {
                        arc_tray.hide().unwrap();
                    }
                }
                _ => {}
            })
        },
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "change_ico" => { // 更新托盘图标
                app.tray_handle()
                    .set_icon(tauri::Icon::Raw(
                        include_bytes!("../../../public/status/weather_3x.png").to_vec(),
                    ))
                    .unwrap();
            }
            "show" => {
                open_home(app);
            }
            "quit" => {
                let window = app.get_window("home").unwrap();
                window.close().unwrap();
                window.emit("exit", ()).unwrap()
            }
            _ => {}
        },
        _ => {}
    }
}