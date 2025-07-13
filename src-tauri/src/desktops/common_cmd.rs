#![allow(unexpected_cfgs)]
use base64::{engine::general_purpose, Engine as _};
use lazy_static::lazy_static;
use mime_guess::from_path;
use screenshots::Screen;
use serde::Serialize;
use std::cmp;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, ResourceId, Runtime, Webview};
use sysinfo::{Disks};
use walkdir::WalkDir;
// use std::env;

#[derive(Serialize)]
pub struct DiskInfo {
    mount_point: String,
    total_space: u64,
    available_space: u64,
    used_space: u64,
    usage_percentage: f64,
}

#[derive(Serialize)]
pub struct DirectoryInfo {
    path: String,
    total_size: u64,
    disk_mount_point: String,
    disk_total_space: u64,
    usage_percentage: f64,
}

#[cfg(target_os = "macos")]
#[allow(deprecated)]
use cocoa::appkit::NSWindow;

use crate::desktops::window_payload::{
    get_window_payload as _get_window_payload, push_window_payload as _push_window_payload,
    WindowPayload,
};

// 定义用户信息结构体
#[derive(Debug, Clone, Serialize)]
pub struct UserInfo {
    user_id: i64,
    username: String,
    token: String,
    portrait: String,
    is_sign: bool,
}

#[derive(Serialize)]
pub struct FileMeta {
    name: String,
    path: String,
    file_type: String,
    mime_type: String,
    exists: bool,
}

impl UserInfo {
    pub fn new(
        user_id: i64,
        username: String,
        token: String,
        portrait: String,
        is_sign: bool,
    ) -> Self {
        UserInfo {
            user_id,
            username,
            token,
            portrait,
            is_sign,
        }
    }
}

// 全局变量
lazy_static! {
    static ref USER_INFO: Arc<RwLock<UserInfo>> = Arc::new(RwLock::new(UserInfo::new(
        -1,
        String::new(),
        String::new(),
        String::new(),
        false
    )));
}

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
pub fn screenshot(x: &str, y: &str, width: &str, height: &str) -> String {
    let screen = Screen::from_point(100, 100).unwrap();
    let image = screen
        .capture_area(
            x.parse::<i32>().unwrap(),
            y.parse::<i32>().unwrap(),
            width.parse::<u32>().unwrap(),
            height.parse::<u32>().unwrap(),
        )
        .unwrap();
    let buffer = image.as_raw();
    let base64_str = general_purpose::STANDARD_NO_PAD.encode(buffer);
    base64_str
}

#[tauri::command]
pub fn audio(filename: &str, handle: AppHandle) {
    use rodio::{Decoder, Source};
    use std::fs::File;
    use std::io::BufReader;
    let path = "audio/".to_string() + filename;
    thread::spawn(move || {
        let audio_path = handle
            .path()
            .resolve(path, BaseDirectory::Resource)
            .unwrap();
        let audio = File::open(audio_path).unwrap();
        let file = BufReader::new(audio);
        let (_stream, stream_handle) = rodio::OutputStream::try_default().unwrap();
        let source = Decoder::new(file).unwrap();
        stream_handle.play_raw(source.convert_samples()).unwrap();
        thread::sleep(Duration::from_millis(3000));
    });
}

#[tauri::command]
pub fn set_height(height: u32, handle: AppHandle) {
    let home_window = handle.get_webview_window("home").unwrap();
    let sf = home_window.scale_factor().unwrap();
    let out_size = home_window.inner_size().unwrap();
    home_window
        .set_size(LogicalSize::new(
            out_size.to_logical(sf).width,
            cmp::max(out_size.to_logical(sf).height, height),
        ))
        .unwrap();
}

#[tauri::command]
pub fn set_badge_count(count: Option<i64>, handle: AppHandle) -> Result<(), String> {
    match handle.get_webview_window("home") {
        Some(window) => {
            window.set_badge_count(count).map_err(|e| e.to_string())?;
            Ok(())
        }
        None => {
            // 如果找不到 home 窗口，直接返回成功，不抛出错误
            Ok(())
        }
    }
}

/// 隐藏Mac窗口的标题栏按钮（红绿灯按钮）和标题
///
/// # 参数
/// * `window_label` - 窗口的标签名称
/// * `handle` - Tauri应用句柄
///
/// # 返回
/// * `Result<(), String>` - 成功返回Ok(()), 失败返回错误信息
#[tauri::command]
#[cfg(target_os = "macos")]
pub fn hide_title_bar_buttons(window_label: &str, handle: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    #[allow(deprecated)]
    {
        use cocoa::appkit::NSWindowButton;
        use cocoa::base::{id, NO, YES};
        use objc::{msg_send, sel, sel_impl};

        let ns_window = handle
            .get_webview_window(window_label)
            .unwrap()
            .ns_window()
            .unwrap() as id;

        unsafe {
            // 隐藏标题栏按钮的辅助函数
            let hide_button = |window: id, button_type: NSWindowButton| {
                let btn = window.standardWindowButton_(button_type);
                if !btn.is_null() {
                    let _: () = msg_send![btn, setHidden: YES];
                }
            };

            // 隐藏各种标题栏按钮
            hide_button(ns_window, NSWindowButton::NSWindowFullScreenButton);
            hide_button(ns_window, NSWindowButton::NSWindowMiniaturizeButton);
            hide_button(ns_window, NSWindowButton::NSWindowZoomButton);

            // 设置窗口不可拖动
            let _: () = msg_send![ns_window, setMovable: NO];
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn push_window_payload(
    label: String,
    payload: serde_json::Value,
    handle: AppHandle,
) -> Result<(), String> {
    let payload_entity = WindowPayload::new(payload);

    let option_window = handle.get_webview_window(&label);

    if let Some(window) = option_window {
        // 找到了对应label的window说明已经打开了，就只需要提醒刷新就行了
        let res = window.emit(&format!("{}:update", label), payload_entity);

        if let Err(e) = res {
            return Err(e.to_string());
        }

        return Ok(());
    } else {
        let result = _push_window_payload(label, payload_entity).await;

        // 这里是存在值的时候才算失败，不存在值则是插入成功
        if let Some(_) = result {
            Err("none".to_string())
        } else {
            Ok(())
        }
    }
}

#[tauri::command]
pub async fn get_window_payload(label: String) -> Result<serde_json::Value, ()> {
    let result = _get_window_payload(label).await;
    if let Some(payload_entity) = result {
        Ok(payload_entity.payload)
    } else {
        Err(())
    }
}

#[tauri::command]
pub async fn get_files_meta(files_path: Vec<String>) -> Result<Vec<FileMeta>, String> {
    let mut files_meta: Vec<FileMeta> = Vec::new();

    for path in files_path {
        let file_buf = PathBuf::from(&path);

        let name = file_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let file_type = file_buf
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        let mime_type = from_path(&file_buf).first_or_octet_stream().to_string();

        let is_url = path.starts_with("http://") || path.starts_with("https://");

        let exists = {
            if is_url {
                false
            } else {
                file_buf.exists() // 如果不是url就找该文件是否存在
            }
        };

        files_meta.push(FileMeta {
            name,
            path: file_buf.to_string_lossy().to_string(),
            file_type,
            mime_type,
            exists,
        });
    }

    Ok(files_meta)
}

// #[tauri::command]
// pub fn get_current_app_disk(handle: AppHandle) -> Result<String, String> {
//     // 首先尝试使用Tauri的app目录API
//     let app_path_result = handle.path().app_data_dir();
    
//     let app_path_str = match app_path_result {
//         Ok(path) => path.to_string_lossy().to_string(),
//         Err(_) => {
//             // 如果Tauri API失败，回退到使用std::env
//             let current_exe = env::current_exe().map_err(|e| e.to_string())?;
//             let app_path = current_exe.parent().ok_or("无法获取应用目录")?;
//             app_path.to_string_lossy().to_string()
//         }
//     };
    
//     let disks = Disks::new_with_refreshed_list();
    
//     let mut best_match = String::new();
//     let mut best_match_len = 0;
    
//     for disk in &disks {
//         let mount_point = disk.mount_point().to_string_lossy().to_string();
        
//         // 调试信息
//         println!("磁盘挂载点: {}", mount_point);
//         println!("应用路径: {}", app_path_str);
        
//         // Windows下路径比较需要处理路径分隔符
//         let normalized_app_path = app_path_str.replace('\\', "/");
//         let normalized_mount_point = mount_point.replace('\\', "/");
        
//         if normalized_app_path.starts_with(&normalized_mount_point) && mount_point.len() > best_match_len {
//             best_match_len = mount_point.len();
//             best_match = mount_point;
//         }
//     }
    
//     if best_match.is_empty() {
//         // 如果没有找到匹配的磁盘，返回所有可用磁盘信息用于调试
//         let all_disks: Vec<String> = disks.iter()
//             .map(|d| d.mount_point().to_string_lossy().to_string())
//             .collect();
//         Err(format!("无法找到应用所在的磁盘。应用路径: {}，可用磁盘: {:?}", app_path_str, all_disks))
//     } else {
//         Ok(best_match)
//     }
// }

// #[tauri::command]
// pub fn get_disk_info(mount_point: Option<String>, handle: AppHandle) -> Result<DiskInfo, String> {
//     let disks = Disks::new_with_refreshed_list();
    
//     let target_mount_point = match mount_point {
//         Some(path) => path,
//         None => get_current_app_disk(handle)?,
//     };
    
//     println!("目标挂载点: {}", target_mount_point);
    
//     for disk in &disks {
//         let disk_mount_point = disk.mount_point().to_string_lossy().to_string();
//         println!("检查磁盘: {}", disk_mount_point);
        
//         // 路径规范化比较
//         let normalized_target = target_mount_point.replace('\\', "/");
//         let normalized_disk = disk_mount_point.replace('\\', "/");
        
//         if normalized_disk == normalized_target || disk_mount_point == target_mount_point {
//             let total_space = disk.total_space();
//             let available_space = disk.available_space();
//             let used_space = total_space - available_space;
//             let usage_percentage = if total_space > 0 {
//                 (used_space as f64 / total_space as f64) * 100.0
//             } else {
//                 0.0
//             };
            
//             return Ok(DiskInfo {
//                 mount_point: disk_mount_point,
//                 total_space,
//                 available_space,
//                 used_space,
//                 usage_percentage,
//             });
//         }
//     }
    
//     let all_disks: Vec<String> = disks.iter()
//         .map(|d| d.mount_point().to_string_lossy().to_string())
//         .collect();
//     Err(format!("未找到指定的磁盘: {}。可用磁盘: {:?}", target_mount_point, all_disks))
// }

/// 目录信息
#[tauri::command]
pub fn get_directory_size(directory_path: String) -> Result<u64, String> {
    let path = PathBuf::from(&directory_path);
    
    if !path.exists() {
        return Err("目录不存在".to_string());
    }
    
    if !path.is_dir() {
        return Err("指定路径不是目录".to_string());
    }
    
    let mut total_size = 0u64;
    
    for entry in WalkDir::new(&path) {
        match entry {
            Ok(entry) => {
                if entry.file_type().is_file() {
                    match entry.metadata() {
                        Ok(metadata) => {
                            total_size = total_size.saturating_add(metadata.len());
                        }
                        Err(_) => continue,
                    }
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(total_size)
}

/// 获取目录使用信息
#[tauri::command]
pub fn get_directory_usage_info(directory_path: String) -> Result<DirectoryInfo, String> {
    let total_size = get_directory_size(directory_path.clone())?;
    
    let path = PathBuf::from(&directory_path);
    let path_str = path.to_string_lossy().to_string();
    
    let disks = Disks::new_with_refreshed_list();
    
    let mut best_match = String::new();
    let mut best_match_len = 0;
    let mut disk_total_space = 0u64;
    
    for disk in &disks {
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        
        // Windows下路径比较需要处理路径分隔符
        let normalized_path = path_str.replace('\\', "/");
        let normalized_mount_point = mount_point.replace('\\', "/");
        
        if normalized_path.starts_with(&normalized_mount_point) && mount_point.len() > best_match_len {
            best_match_len = mount_point.len();
            disk_total_space = disk.total_space();
            best_match = mount_point;
        }
    }
    
    if best_match.is_empty() {
        return Err("无法找到目录所在的磁盘".to_string());
    }
    
    let usage_percentage = if disk_total_space > 0 {
        (total_size as f64 / disk_total_space as f64) * 100.0
    } else {
        0.0
    };
    
    Ok(DirectoryInfo {
        path: directory_path,
        total_size,
        disk_mount_point: best_match,
        disk_total_space,
        usage_percentage,
    })
}
