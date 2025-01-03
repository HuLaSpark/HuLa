use base64::{engine::general_purpose, Engine as _};
use lazy_static::lazy_static;
use screenshots::Screen;
use serde::Serialize;
use std::cmp;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, LogicalSize, Manager, ResourceId, Runtime, Webview};

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
    pub fn get_is_sign(&self) -> Result<bool, ()> {
        Ok(self.is_sign)
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

// 保存用户信息的方法
#[tauri::command]
pub fn save_user_info(
    user_id: i64,
    username: &str,
    token: &str,
    portrait: &str,
    is_sign: bool,
) -> i32 {
    let mut user_info = USER_INFO.write().unwrap();
    user_info.user_id = user_id;
    user_info.username = username.to_string();
    user_info.token = token.to_string();
    user_info.portrait = portrait.to_string();
    user_info.is_sign = is_sign;
    0
}

// 获取用户信息的方法
#[tauri::command]
pub fn get_user_info() -> UserInfo {
    let user_info = USER_INFO.read().unwrap();
    user_info.clone()
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
    let out_size = home_window.outer_size().unwrap();
    home_window
        .set_size(LogicalSize::new(
            out_size.to_logical(sf).width,
            cmp::max(out_size.to_logical(sf).height, height),
        ))
        .unwrap();
}

#[tauri::command]
pub fn set_badge_count(count: Option<i64>, handle: AppHandle) {
    let home_window = handle.get_webview_window("home").unwrap();
    home_window.set_badge_count(count).unwrap();
}
