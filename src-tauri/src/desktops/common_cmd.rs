#![allow(unexpected_cfgs)]
use base64::{Engine as _, engine::general_purpose};
use screenshots::Screen;
#[cfg(target_os = "macos")]
use std::cell::RefCell;
use std::cmp;
#[cfg(target_os = "macos")]
use std::collections::HashMap;
#[cfg(target_os = "macos")]
use std::ffi::{CStr, CString};
#[cfg(target_os = "macos")]
use std::sync::{
    Arc, Mutex, OnceLock,
    atomic::{AtomicBool, AtomicU64, Ordering},
};
use std::thread;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, LogicalSize, Manager, ResourceId, Runtime, Webview};

#[cfg(target_os = "macos")]
use block2::RcBlock;
#[cfg(target_os = "macos")]
use objc2::rc::Retained;
#[cfg(target_os = "macos")]
use objc2::runtime::ProtocolObject;
#[cfg(target_os = "macos")]
use objc2_app_kit::NSWindow;
#[cfg(target_os = "macos")]
use objc2_core_foundation::{CGPoint, CGRect};
#[cfg(target_os = "macos")]
use objc2_foundation::{
    NSNotification, NSNotificationCenter, NSNotificationName, NSObjectProtocol,
};
#[cfg(target_os = "windows")]
use serde::Serialize;
#[cfg(target_os = "macos")]
use std::ptr::NonNull;
#[cfg(target_os = "macos")]
use tauri::WebviewWindow;
#[cfg(target_os = "macos")]
use tauri::async_runtime::JoinHandle;

#[cfg(target_os = "macos")]
struct TrafficLightsLiveResizeTask {
    seq: u64,
    spacing: f64,
    handle: JoinHandle<()>,
}

#[cfg(target_os = "macos")]
static TRAFFIC_LIGHTS_LIVE_RESIZE_TASKS: OnceLock<
    Mutex<HashMap<String, TrafficLightsLiveResizeTask>>,
> = OnceLock::new();
#[cfg(target_os = "macos")]
static TRAFFIC_LIGHTS_LIVE_RESIZE_SEQ: AtomicU64 = AtomicU64::new(1);

#[cfg(target_os = "macos")]
fn traffic_lights_live_resize_tasks() -> &'static Mutex<HashMap<String, TrafficLightsLiveResizeTask>>
{
    TRAFFIC_LIGHTS_LIVE_RESIZE_TASKS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[cfg(target_os = "macos")]
static TRAFFIC_LIGHTS_DESIRED_SPACING: OnceLock<Mutex<HashMap<String, f64>>> = OnceLock::new();

#[cfg(target_os = "macos")]
fn traffic_lights_desired_spacing() -> &'static Mutex<HashMap<String, f64>> {
    TRAFFIC_LIGHTS_DESIRED_SPACING.get_or_init(|| Mutex::new(HashMap::new()))
}

#[cfg(target_os = "macos")]
fn get_desired_traffic_lights_spacing(window_label: &str) -> f64 {
    traffic_lights_desired_spacing()
        .lock()
        .ok()
        .and_then(|m| m.get(window_label).copied())
        .unwrap_or(6.0)
}

#[cfg(target_os = "macos")]
thread_local! {
    static TRAFFIC_LIGHTS_RESIZE_OBSERVERS: RefCell<HashMap<String, TrafficLightsResizeObserverEntry>> =
        RefCell::new(HashMap::new());
}

#[cfg(target_os = "macos")]
struct TrafficLightsResizeObserverEntry {
    window_ptr: usize,
    resize_observer: Retained<ProtocolObject<dyn NSObjectProtocol>>,
    move_observer: Retained<ProtocolObject<dyn NSObjectProtocol>>,
}

#[cfg(target_os = "macos")]
static IS_MACOS_26_OR_LATER: OnceLock<bool> = OnceLock::new();

#[cfg(target_os = "macos")]
fn is_macos_26_or_later() -> bool {
    *IS_MACOS_26_OR_LATER.get_or_init(|| {
        let product_version = sysctl_string("kern.osproductversion");
        let product_major = product_version
            .as_deref()
            .and_then(|s| s.split('.').next())
            .and_then(|s| s.parse::<u32>().ok());

        let darwin_release = unsafe {
            let mut uts: libc::utsname = std::mem::zeroed();
            if libc::uname(&mut uts) != 0 {
                None
            } else {
                Some(
                    CStr::from_ptr(uts.release.as_ptr())
                        .to_string_lossy()
                        .to_string(),
                )
            }
        };
        let darwin_major = darwin_release
            .as_deref()
            .and_then(|s| s.split('.').next())
            .and_then(|s| s.parse::<u32>().ok());

        let enabled = product_major
            .map(|v| v >= 26)
            .unwrap_or_else(|| darwin_major.map(|v| v >= 25).unwrap_or(false));

        tracing::info!(
            "[TrafficLights] version detect: product={:?}, darwin={:?}, enable_native_observer={}",
            product_version,
            darwin_release,
            enabled
        );

        enabled
    })
}

#[cfg(target_os = "macos")]
fn sysctl_string(name: &str) -> Option<String> {
    let name = CString::new(name).ok()?;
    let mut size: libc::size_t = 0;
    unsafe {
        if libc::sysctlbyname(
            name.as_ptr(),
            std::ptr::null_mut(),
            &mut size,
            std::ptr::null_mut(),
            0,
        ) != 0
            || size == 0
        {
            return None;
        }
    }

    let mut buf = vec![0u8; size as usize];
    unsafe {
        if libc::sysctlbyname(
            name.as_ptr(),
            buf.as_mut_ptr().cast(),
            &mut size,
            std::ptr::null_mut(),
            0,
        ) != 0
        {
            return None;
        }
    }

    if let Some(pos) = buf.iter().position(|&b| b == 0) {
        buf.truncate(pos);
    }

    String::from_utf8(buf).ok()
}

#[cfg(target_os = "macos")]
fn ensure_traffic_lights_resize_observer<R: Runtime>(
    handle: &AppHandle<R>,
    window_label: &str,
) -> Result<(), String> {
    if !is_macos_26_or_later() {
        return Ok(());
    }
    let label = window_label.to_string();
    let handle_for_main = handle.clone();

    handle
        .run_on_main_thread(move || {
            let Ok(webview_window) = get_webview_window(&handle_for_main, label.as_str()) else {
                return;
            };
            let Ok(ns_window) = get_nswindow_from_webview_window(&webview_window) else {
                return;
            };
            let window_ptr = (&*ns_window as *const NSWindow) as usize;

            TRAFFIC_LIGHTS_RESIZE_OBSERVERS.with(|cell| {
                let notification_center = NSNotificationCenter::defaultCenter();

                {
                    let mut map = cell.borrow_mut();
                    if let Some(existing) = map.get(label.as_str()) {
                        if existing.window_ptr == window_ptr {
                            return;
                        }
                    }
                    if let Some(existing) = map.remove(label.as_str()) {
                        let _: () = unsafe {
                            objc2::msg_send![
                                &notification_center,
                                removeObserver: &*existing.resize_observer
                            ]
                        };
                        let _: () = unsafe {
                            objc2::msg_send![
                                &notification_center,
                                removeObserver: &*existing.move_observer
                            ]
                        };
                    }
                }

                let resize_name = NSNotificationName::from_str("NSWindowDidResizeNotification");
                let handle_for_resize = handle_for_main.clone();
                let label_for_resize = label.clone();
                let resize_block = RcBlock::new(move |_notification: NonNull<NSNotification>| {
                    let _ = apply_macos_traffic_lights_spacing_default(
                        label_for_resize.as_str(),
                        &handle_for_resize,
                    );
                });

                let resize_observer = unsafe {
                    notification_center.addObserverForName_object_queue_usingBlock(
                        Some(&*resize_name),
                        Some(&ns_window),
                        None,
                        &resize_block,
                    )
                };

                let move_name = NSNotificationName::from_str("NSWindowDidMoveNotification");
                let handle_for_move = handle_for_main.clone();
                let label_for_move = label.clone();
                let move_block = RcBlock::new(move |_notification: NonNull<NSNotification>| {
                    let _ = apply_macos_traffic_lights_spacing_default(
                        label_for_move.as_str(),
                        &handle_for_move,
                    );
                });

                let move_observer = unsafe {
                    notification_center.addObserverForName_object_queue_usingBlock(
                        Some(&*move_name),
                        Some(&ns_window),
                        None,
                        &move_block,
                    )
                };

                cell.borrow_mut().insert(
                    label,
                    TrafficLightsResizeObserverEntry {
                        window_ptr,
                        resize_observer,
                        move_observer,
                    },
                );
            });
        })
        .map_err(|e| format!("Failed to run on main thread: {}", e))?;

    Ok(())
}

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

    thread::spawn(move || {
        if let Err(e) = play_audio_internal(&path, &handle) {
            tracing::error!("Audio playback failed: {}", e);
        }
    });

    Ok(())
}

fn play_audio_internal(path: &str, handle: &AppHandle) -> Result<(), String> {
    use rodio::Decoder;
    use std::fs::File;
    use std::io::BufReader;

    let audio_path = handle
        .path()
        .resolve(path, BaseDirectory::Resource)
        .map_err(|e| format!("解析音频路径失败: {}", e))?;

    let audio = File::open(audio_path).map_err(|e| format!("打开音频文件失败: {}", e))?;

    let file = BufReader::new(audio);
    let stream = rodio::OutputStreamBuilder::open_default_stream()
        .map_err(|e| format!("创建音频输出流失败: {}", e))?;
    let source = Decoder::new(file).map_err(|e| format!("解码音频文件失败: {}", e))?;

    stream.mixer().add(source);
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

#[cfg(target_os = "macos")]
fn apply_traffic_lights_spacing(ns_window: &NSWindow, spacing: f64) -> Result<(), String> {
    use objc2_app_kit::NSWindowButton;

    let close = ns_window
        .standardWindowButton(NSWindowButton::CloseButton)
        .ok_or_else(|| "CloseButton not found".to_string())?;
    let minimize = ns_window
        .standardWindowButton(NSWindowButton::MiniaturizeButton)
        .ok_or_else(|| "MiniaturizeButton not found".to_string())?;
    let zoom = ns_window
        .standardWindowButton(NSWindowButton::ZoomButton)
        .ok_or_else(|| "ZoomButton not found".to_string())?;

    let close_frame: CGRect = unsafe { objc2::msg_send![&*close, frame] };
    let min_frame: CGRect = unsafe { objc2::msg_send![&*minimize, frame] };
    let zoom_frame: CGRect = unsafe { objc2::msg_send![&*zoom, frame] };

    let new_min_x = close_frame.origin.x + close_frame.size.width + spacing;
    let new_zoom_x = new_min_x + min_frame.size.width + spacing;

    let _: () = unsafe {
        objc2::msg_send![
            &*minimize,
            setFrameOrigin: CGPoint {
                x: new_min_x,
                y: min_frame.origin.y
            }
        ]
    };
    let _: () = unsafe {
        objc2::msg_send![
            &*zoom,
            setFrameOrigin: CGPoint {
                x: new_zoom_x,
                y: zoom_frame.origin.y
            }
        ]
    };

    Ok(())
}

#[cfg(target_os = "macos")]
fn traffic_lights_needs_update(ns_window: &NSWindow, spacing: f64) -> Result<bool, String> {
    use objc2_app_kit::NSWindowButton;

    let close = ns_window
        .standardWindowButton(NSWindowButton::CloseButton)
        .ok_or_else(|| "CloseButton not found".to_string())?;
    let minimize = ns_window
        .standardWindowButton(NSWindowButton::MiniaturizeButton)
        .ok_or_else(|| "MiniaturizeButton not found".to_string())?;
    let zoom = ns_window
        .standardWindowButton(NSWindowButton::ZoomButton)
        .ok_or_else(|| "ZoomButton not found".to_string())?;

    let close_frame: CGRect = unsafe { objc2::msg_send![&*close, frame] };
    let min_frame: CGRect = unsafe { objc2::msg_send![&*minimize, frame] };
    let zoom_frame: CGRect = unsafe { objc2::msg_send![&*zoom, frame] };

    let expected_min_x = close_frame.origin.x + close_frame.size.width + spacing;
    let expected_zoom_x = expected_min_x + min_frame.size.width + spacing;

    let eps = 0.5_f64;
    Ok((min_frame.origin.x - expected_min_x).abs() > eps
        || (zoom_frame.origin.x - expected_zoom_x).abs() > eps)
}

#[cfg(target_os = "macos")]
fn ensure_live_resize_traffic_lights_task<R: Runtime>(
    handle: &AppHandle<R>,
    window_label: &str,
    spacing: f64,
) -> Result<(), String> {
    let seq = TRAFFIC_LIGHTS_LIVE_RESIZE_SEQ.fetch_add(1, Ordering::SeqCst);
    let window_label = window_label.to_string();

    {
        let tasks = traffic_lights_live_resize_tasks();
        let mut pending = tasks
            .lock()
            .map_err(|_| "Failed to lock traffic lights tasks".to_string())?;

        if let Some(existing) = pending.get(&window_label) {
            if (existing.spacing - spacing).abs() < 0.001 {
                return Ok(());
            }
        }

        if let Some(existing) = pending.remove(&window_label) {
            existing.handle.abort();
        }

        let handle_for_task = handle.clone();
        let label_for_task = Arc::new(window_label.clone());
        let label_for_cleanup = window_label.clone();
        let alive = Arc::new(AtomicBool::new(true));
        let alive_for_task = alive.clone();
        let join = tauri::async_runtime::spawn(async move {
            for _ in 0..600_u32 {
                if !alive_for_task.load(Ordering::SeqCst) {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(16)).await;

                let handle_for_main = handle_for_task.clone();
                let label_for_main = label_for_task.clone();
                let alive_for_main = alive_for_task.clone();
                let _ = handle_for_task.run_on_main_thread(move || {
                    let Some(webview_window) =
                        handle_for_main.get_webview_window(label_for_main.as_str())
                    else {
                        alive_for_main.store(false, Ordering::SeqCst);
                        return;
                    };
                    let Ok(ns_window) = get_nswindow_from_webview_window(&webview_window) else {
                        alive_for_main.store(false, Ordering::SeqCst);
                        return;
                    };

                    let Ok(needs) = traffic_lights_needs_update(&ns_window, spacing) else {
                        return;
                    };
                    if needs {
                        let _ = apply_traffic_lights_spacing(&ns_window, spacing);
                    }

                    let in_live_resize: bool =
                        unsafe { objc2::msg_send![&*ns_window, inLiveResize] };
                    if !in_live_resize {
                        alive_for_main.store(false, Ordering::SeqCst);
                    }
                });
            }

            let tasks = traffic_lights_live_resize_tasks();
            let _ = tasks.lock().map(|mut m| {
                let is_latest = m
                    .get(&label_for_cleanup)
                    .map(|t| t.seq == seq)
                    .unwrap_or(false);
                if is_latest {
                    m.remove(&label_for_cleanup);
                }
            });
        });

        pending.insert(
            window_label,
            TrafficLightsLiveResizeTask {
                seq,
                spacing,
                handle: join,
            },
        );
    }

    Ok(())
}

#[cfg(target_os = "macos")]
pub(crate) fn apply_macos_traffic_lights_spacing_default<R: Runtime>(
    window_label: &str,
    handle: &AppHandle<R>,
) -> Result<(), String> {
    let webview_window = get_webview_window(&handle, window_label)?;
    let ns_window = get_nswindow_from_webview_window(&webview_window)?;
    let _ = ensure_traffic_lights_resize_observer(handle, window_label);
    let spacing = get_desired_traffic_lights_spacing(window_label);
    let in_live_resize: bool = unsafe { objc2::msg_send![&*ns_window, inLiveResize] };
    if in_live_resize {
        if traffic_lights_needs_update(&ns_window, spacing)? {
            let _ = apply_traffic_lights_spacing(&ns_window, spacing);
        }
        return ensure_live_resize_traffic_lights_task(handle, window_label, spacing);
    }
    if !traffic_lights_needs_update(&ns_window, spacing)? {
        return Ok(());
    }
    apply_traffic_lights_spacing(&ns_window, spacing)
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

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn set_macos_traffic_lights_spacing(
    window_label: &str,
    spacing: f64,
    handle: AppHandle,
) -> Result<(), String> {
    if !(0.0..=30.0).contains(&spacing) {
        return Err("Invalid spacing value".to_string());
    }
    let _ = traffic_lights_desired_spacing()
        .lock()
        .map(|mut m| m.insert(window_label.to_string(), spacing));
    let webview_window = get_webview_window(&handle, window_label)?;
    let ns_window = get_nswindow_from_webview_window(&webview_window)?;
    let _ = ensure_traffic_lights_resize_observer(&handle, window_label);
    apply_traffic_lights_spacing(&ns_window, spacing)
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
fn get_webview_window<R: Runtime>(
    handle: &AppHandle<R>,
    window_label: &str,
) -> Result<WebviewWindow<R>, String> {
    handle
        .get_webview_window(window_label)
        .ok_or_else(|| format!("Window '{}' not found", window_label))
}

#[cfg(target_os = "macos")]
fn get_nswindow_from_webview_window<R: Runtime>(
    webview_window: &WebviewWindow<R>,
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
        let result =
            unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, subkey, Some(0), KEY_READ, &mut hkey) };

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
