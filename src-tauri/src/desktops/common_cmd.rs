#![allow(unexpected_cfgs)]
use base64::{Engine as _, engine::general_purpose};
use lazy_static::lazy_static;
use screenshots::Screen;
use serde::Serialize;
use std::cmp;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, LogicalSize, Manager, ResourceId, Runtime, Webview};

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSWindow, NSWindowButton};
#[cfg(target_os = "macos")]
use objc::runtime::Object;

// 定义用户信息结构体
#[derive(Debug, Clone, Serialize)]
pub struct UserInfo {
    user_id: i64,
    username: String,
    token: String,
    portrait: String,
    is_sign: bool,
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
    // pub fn get_user_id(&self) -> Result<i64, ()> { Ok(self.user_id)}
    // pub fn get_username(&self) -> Result<&str, ()> { Ok(self.username.as_str())}
    // pub fn get_token(&self) -> Result<&str, ()> { Ok(self.token.as_str())}
    // pub fn get_portrait(&self) -> Result<&str, ()> { Ok(self.portrait.as_str())}
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
    let buffer = image.buffer();
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

#[cfg(target_os = "macos")]
unsafe fn hidden_standard_window_button(window: *mut Object, window_button_kind: NSWindowButton) {
    use cocoa::base::YES;
    use objc::{msg_send, sel, sel_impl};

    let btn = unsafe { window.standardWindowButton_(window_button_kind) };
    if !btn.is_null() {
        let _: () = msg_send![btn, setHidden: YES];
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
    {
        use cocoa::appkit::NSWindowButton;
        use cocoa::base::NO;
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};

        let ns_window = handle
            .get_webview_window(window_label)
            .unwrap()
            .ns_window()
            .unwrap() as id;

        unsafe {
            // 隐藏标题栏按钮
            // hidden_standard_window_button(ns_window, NSWindowButton::NSWindowCloseButton);
            hidden_standard_window_button(ns_window, NSWindowButton::NSWindowFullScreenButton);
            hidden_standard_window_button(ns_window, NSWindowButton::NSWindowFullScreenButton);
            hidden_standard_window_button(ns_window, NSWindowButton::NSWindowMiniaturizeButton);
            hidden_standard_window_button(ns_window, NSWindowButton::NSWindowZoomButton);

            // 设置窗口不可拖动
            let _: () = msg_send![ns_window, setMovable: NO];
        }
    }
    Ok(())
}
