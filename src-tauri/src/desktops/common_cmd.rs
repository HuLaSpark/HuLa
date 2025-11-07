#![allow(unexpected_cfgs)]
use base64::{Engine as _, engine::general_purpose};
use screenshots::Screen;
use std::cmp;
use std::thread;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, LogicalSize, Manager, ResourceId, Runtime, Webview};

#[cfg(target_os = "macos")]
use objc2::rc::Retained;
#[cfg(target_os = "macos")]
use objc2_app_kit::NSWindow;
#[cfg(target_os = "windows")]
use serde::Serialize;
#[cfg(target_os = "macos")]
use tauri::WebviewWindow;

/// Windows文本缩放信息结构体
#[cfg(target_os = "windows")]
#[derive(Serialize)]
pub struct WindowsScaleInfo {
    /// 系统DPI
    pub system_dpi: u32,
    /// 系统缩放比例
    pub system_scale: f64,
    /// 文本缩放比例
    pub text_scale: f64,
    /// 是否检测到文本缩放
    pub has_text_scaling: bool,
}
// // 定义用户信息结构体
// #[derive(Debug, Clone, Serialize)]
// pub struct UserInfo {
//     user_id: i64,
//     username: String,
//     token: String,
//     portrait: String,
//     is_sign: bool,
// }

// impl Default for UserInfo {
//     fn default() -> Self {
//         UserInfo {
//             user_id: -1,
//             username: String::new(),
//             token: String::new(),
//             portrait: String::new(),
//             is_sign: false,
//         }
//     }
// }

// // 全局变量
// lazy_static! {
//     static ref USER_INFO: Arc<RwLock<UserInfo>> = Arc::new(RwLock::new(UserInfo::default()));
// }

#[tauri::command]
pub fn default_window_icon<R: Runtime>(
    webview: Webview<R>,
    app: AppHandle<R>,
) -> Option<ResourceId> {
    app.default_window_icon().cloned().map(|icon| {
        let mut resources_table = webview.resources_table();
        resources_table.add(icon.to_owned())
    })
}

#[tauri::command]
pub fn screenshot(x: &str, y: &str, width: &str, height: &str) -> Result<String, String> {
    let screen = Screen::from_point(100, 100).map_err(|e| format!("获取屏幕信息失败: {}", e))?;

    let x = x
        .parse::<i32>()
        .map_err(|_| "无效的 x 坐标参数".to_string())?;
    let y = y
        .parse::<i32>()
        .map_err(|_| "无效的 y 坐标参数".to_string())?;
    let width = width
        .parse::<u32>()
        .map_err(|_| "无效的宽度参数".to_string())?;
    let height = height
        .parse::<u32>()
        .map_err(|_| "无效的高度参数".to_string())?;

    let image = screen
        .capture_area(x, y, width, height)
        .map_err(|e| format!("截图失败: {}", e))?;

    let buffer = image.as_raw();
    let base64_str = general_purpose::STANDARD_NO_PAD.encode(buffer);
    Ok(base64_str)
}

#[tauri::command]
pub fn audio(filename: &str, handle: AppHandle) -> Result<(), String> {
    let path = "audio/".to_string() + filename;
    let handle_clone = handle.clone();

    thread::spawn(move || {
        if let Err(e) = play_audio_internal(&path, &handle_clone) {
            tracing::error!("Audio playback failed: {}", e);
        }
    });

    Ok(())
}

fn play_audio_internal(path: &str, handle: &AppHandle) -> Result<(), String> {
    use rodio::{Decoder, Source};
    use std::fs::File;
    use std::io::BufReader;

    let audio_path = handle
        .path()
        .resolve(path, BaseDirectory::Resource)
        .map_err(|e| format!("解析音频路径失败: {}", e))?;

    let audio = File::open(audio_path).map_err(|e| format!("打开音频文件失败: {}", e))?;

    let file = BufReader::new(audio);
    let (_stream, stream_handle) =
        rodio::OutputStream::try_default().map_err(|e| format!("创建音频输出流失败: {}", e))?;

    let source = Decoder::new(file).map_err(|e| format!("解码音频文件失败: {}", e))?;

    stream_handle
        .play_raw(source.convert_samples())
        .map_err(|e| format!("播放音频失败: {}", e))?;

    thread::sleep(Duration::from_millis(3000));
    Ok(())
}

#[tauri::command]
pub fn set_height(height: u32, handle: AppHandle) -> Result<(), String> {
    let home_window = handle
        .get_webview_window("home")
        .ok_or("未找到 home 窗口")?;

    let sf = home_window
        .scale_factor()
        .map_err(|e| format!("获取窗口缩放因子失败: {}", e))?;

    let out_size = home_window
        .inner_size()
        .map_err(|e| format!("获取窗口尺寸失败: {}", e))?;

    home_window
        .set_size(LogicalSize::new(
            out_size.to_logical(sf).width,
            cmp::max(out_size.to_logical(sf).height, height),
        ))
        .map_err(|e| format!("设置窗口高度失败: {}", e))?;

    Ok(())
}

/// 设置 macOS 交通灯按钮的可见性
#[cfg(target_os = "macos")]
fn set_traffic_lights_hidden(
    ns_window: &NSWindow,
    hidden: bool,
    btn: objc2_app_kit::NSWindowButton,
) {
    if let Some(button) = ns_window.standardWindowButton(btn) {
        button.setHidden(hidden);
    }
}

#[cfg(target_os = "macos")]
fn set_window_movable_state(ns_window: &NSWindow, movable: bool) {
    ns_window.setMovable(movable);
    ns_window.setMovableByWindowBackground(movable);
}

/// 隐藏Mac窗口的标题栏按钮（红绿灯按钮）和标题
///
/// # 参数
/// * `window_label` - 窗口的标签名称
/// * `hide_close_button` - 可选参数，是否隐藏关闭按钮，默认为false（不隐藏）
/// * `handle` - Tauri应用句柄
///
/// # 返回
/// * `Result<(), String>` - 成功返回Ok(()), 失败返回错误信息
#[tauri::command]
#[cfg(target_os = "macos")]
pub fn hide_title_bar_buttons(
    window_label: &str,
    hide_close_button: Option<bool>,
    handle: AppHandle,
) -> Result<(), String> {
    use objc2_app_kit::NSWindowButton;

    let webview_window = get_webview_window(&handle, window_label)?;
    let ns_window = get_nswindow_from_webview_window(&webview_window)?;

    // 隐藏标题栏按钮的辅助函数
    set_traffic_lights_hidden(&ns_window, true, NSWindowButton::MiniaturizeButton);
    set_traffic_lights_hidden(&ns_window, true, NSWindowButton::ZoomButton);
    // 根据参数决定是否隐藏关闭按钮
    if hide_close_button.unwrap_or(false) {
        set_traffic_lights_hidden(&ns_window, true, NSWindowButton::CloseButton);
    }

    // 设置窗口不可拖动
    set_window_movable_state(&ns_window, false);
    Ok(())
}

/// 恢复Mac窗口的标题栏按钮显示
///
/// # 参数
/// * `window_label` - 窗口的标签名称
/// * `handle` - Tauri应用句柄
///
/// # 返回
/// * `Result<(), String>` - 成功返回Ok(()), 失败返回错误信息
#[tauri::command]
#[cfg(target_os = "macos")]
pub fn show_title_bar_buttons(window_label: &str, handle: AppHandle) -> Result<(), String> {
    use objc2_app_kit::NSWindowButton;

    let webview_window = get_webview_window(&handle, window_label)?;
    let ns_window = get_nswindow_from_webview_window(&webview_window)?;

    // 显示所有标题栏按钮
    set_traffic_lights_hidden(&ns_window, false, NSWindowButton::CloseButton);
    set_traffic_lights_hidden(&ns_window, false, NSWindowButton::MiniaturizeButton);
    set_traffic_lights_hidden(&ns_window, false, NSWindowButton::ZoomButton);
    // 恢复窗口可拖动
    set_window_movable_state(&ns_window, true);
    Ok(())
}

/// 设置 macOS 窗口是否可拖动
#[tauri::command]
#[cfg(target_os = "macos")]
pub fn set_window_movable(
    window_label: &str,
    movable: bool,
    handle: AppHandle,
) -> Result<(), String> {
    let webview_window = get_webview_window(&handle, window_label)?;
    let ns_window = get_nswindow_from_webview_window(&webview_window)?;
    set_window_movable_state(&ns_window, movable);
    Ok(())
}

#[tauri::command]
pub fn set_badge_count(count: Option<i64>, handle: AppHandle) -> Result<(), String> {
    // 如果找不到 home 窗口，直接返回成功，不抛出错误
    if let Some(window) = handle.get_webview_window("home") {
        window.set_badge_count(count).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 设置 macOS 窗口级别为屏幕保护程序级别，以覆盖菜单栏
#[tauri::command]
#[cfg(target_os = "macos")]
pub fn set_window_level_above_menubar(window_label: &str, handle: AppHandle) -> Result<(), String> {
    let webview_window = get_webview_window(&handle, window_label)?;
    let ns_window = get_nswindow_from_webview_window(&webview_window)?;

    // 设置窗口级别为屏幕保护程序级别 (1000)，高于菜单栏
    ns_window.setLevel(objc2_app_kit::NSScreenSaverWindowLevel);
    Ok(())
}

#[cfg(target_os = "macos")]
fn get_webview_window(handle: &AppHandle, window_label: &str) -> Result<WebviewWindow, String> {
    handle
        .get_webview_window(window_label)
        .ok_or_else(|| format!("Window '{}' not found", window_label))
}

#[cfg(target_os = "macos")]
fn get_nswindow_from_webview_window(
    webview_window: &WebviewWindow,
) -> Result<Retained<NSWindow>, String> {
    webview_window
        .ns_window()
        .map_err(|e| format!("Failed to get NSWindow: {}", e))
        .map(|ptr| unsafe { Retained::retain(ptr as *mut NSWindow) })?
        .ok_or_else(|| "Failed to retain NSWindow".to_string())
}

/// 获取Windows系统和文本缩放信息
#[tauri::command]
#[cfg(target_os = "windows")]
pub fn get_windows_scale_info() -> Result<WindowsScaleInfo, String> {
    use windows::Win32::UI::HiDpi::GetDpiForSystem;

    unsafe {
        // 获取系统DPI
        let system_dpi = GetDpiForSystem();
        let standard_dpi = 96.0; // Windows标准DPI
        let system_scale = system_dpi as f64 / standard_dpi;

        // 从注册表读取文本缩放设置
        let text_scale = get_text_scale_from_registry().unwrap_or(1.0);

        // 检测是否存在文本缩放 (容差为1%)
        let has_text_scaling = (text_scale - 1.0).abs() > 0.01;

        Ok(WindowsScaleInfo {
            system_dpi,
            system_scale,
            text_scale,
            has_text_scaling,
        })
    }
}

/// 从Windows注册表读取文本缩放设置
#[cfg(target_os = "windows")]
unsafe fn get_text_scale_from_registry() -> Result<f64, String> {
    use windows::Win32::System::Registry::{
        HKEY, HKEY_CURRENT_USER, KEY_READ, REG_DWORD, RegCloseKey, RegOpenKeyExW, RegQueryValueExW,
    };
    use windows::core::w;

    // 尝试多个可能的注册表位置
    let registry_paths = [
        w!("Control Panel\\Desktop\\WindowMetrics"),
        w!("Software\\Microsoft\\Accessibility"),
        w!("Control Panel\\Desktop"),
    ];

    let value_names = [
        w!("TextScaleFactor"),
        w!("TextScaleFactor"),
        w!("LogPixels"),
    ];

    for (i, &subkey) in registry_paths.iter().enumerate() {
        let mut hkey: HKEY = HKEY::default();
        let result = unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, subkey, 0, KEY_READ, &mut hkey) };

        if result.is_ok() {
            let value_name = value_names[i];
            let mut data: u32 = 0;
            let mut data_size = std::mem::size_of::<u32>() as u32;
            let mut value_type = REG_DWORD;

            let result = unsafe {
                RegQueryValueExW(
                    hkey,
                    value_name,
                    None,
                    Some(&mut value_type),
                    Some(&mut data as *mut u32 as *mut u8),
                    Some(&mut data_size),
                )
            };

            let _ = unsafe { RegCloseKey(hkey) };

            if result.is_ok() && value_type == REG_DWORD && data > 0 {
                if i == 2 {
                    // LogPixels 是DPI值，需要特殊处理
                    return Ok(1.0); // LogPixels不是文本缩放，返回默认值
                } else {
                    // TextScaleFactor 是百分比值 (100 = 100%, 150 = 150%)
                    return Ok(data as f64 / 100.0);
                }
            }
        }
    }
    Ok(1.0)
}
