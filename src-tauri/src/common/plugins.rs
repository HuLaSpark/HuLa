use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};
use window_shadows::set_shadow;

/// 重新设置窗口属性
#[tauri::command]
pub fn reset_set_window<R: Runtime>(app: tauri::AppHandle<R>, label: String) {
    let window = app.get_window(&label).unwrap();
    #[cfg(any(windows, target_os = "macos"))]
    set_shadow(&window, true).unwrap();

    #[cfg(target_os = "macos")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

    #[cfg(target_os = "windows")]
    window_vibrancy::apply_acrylic(&window, Some((255, 255, 255, 1)))
        .expect("Unsupported platform! 'apply_blur' is only supported on Windows");
}

/// 设置灰色图标
#[tauri::command]
pub fn set_stateless_icon(app: AppHandle) {
    app.tray_handle()
        .set_icon(tauri::Icon::Raw(
            include_bytes!("../../stateless/icon.ico").to_vec(),
        ))
        .unwrap();
}

/// 设置主要图标
#[tauri::command]
pub fn set_main_icon(app: AppHandle) {
    app.tray_handle()
        .set_icon(tauri::Icon::Raw(
            include_bytes!("../../icons/icon.ico").to_vec(),
        ))
        .unwrap();
}

/// 退出程序
#[tauri::command]
pub fn exit(app: AppHandle) {
    app.exit(0)
}

pub struct TrayState {
    // 用来缓存上一次线程的句柄
    pub id: Mutex<Option<tokio::task::JoinHandle<()>>>
}

/// 设置托盘图标闪烁
// TODO 现在只能实现两张图片交换实现闪烁效果 (nyh -> 2024-03-23 17:57:45)
#[tauri::command]
pub fn tray_blink(
    app: AppHandle,
    state: tauri::State<TrayState>,
    is_run: bool, // 是否运行
    ms: Option<u64>, // 可选, 时间间隔，单位毫秒
    icon_path_1: Option<String>, // 可选，图标1
    icon_path_2: Option<String>, // 可选，图标2
) {
    // 如果存在就取消上一次的线程
    match state.id.lock().as_deref_mut().map(|x| x.as_mut()) {
        Ok(Some(v)) => v.abort(),
        _ => (),
    }

    // 是否停止运行，如果停止，则取消上一次线程后的返回
    if !is_run {
        return;
    }

    // 缓存线程 id 到 tauri state
    *state.id.lock().unwrap() = Some(tokio::spawn(async move {
        let path1 = &icon_path_1.unwrap();
        let path2 = &icon_path_2.unwrap();
        let mut count = 0;

        loop {
            // 如果 ms 不存在 则默认 500ms
            tokio::time::sleep(std::time::Duration::from_millis(ms.unwrap_or_else(|| 500))).await;
            count += 1;

            // 两张图片交替显示， 所以对2取模运算
            let path = if count % 2 == 0 {
                path2
            } else {
                path1
            };

            // tauri api 进行图标设置
            app
                .tray_handle()
                .set_icon(tauri::Icon::File(std::path::PathBuf::from(path)))
                .unwrap();
        }
    }));
}