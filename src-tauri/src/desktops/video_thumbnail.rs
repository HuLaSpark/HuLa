use base64::{Engine as _, engine::general_purpose};
use image::{ImageFormat, ImageReader};
use serde::Serialize;
use std::path::Path;
use std::process::Command;
use tauri::Result as TauriResult;

#[derive(Debug, Clone, Serialize)]
pub struct VideoThumbnailInfo {
    pub thumbnail_base64: String,
    pub width: u32,
    pub height: u32,
    pub duration: f64,
}

/// 生成视频缩略图
pub async fn generate_video_thumbnail(
    video_path: &str,
    target_time: Option<f64>,
) -> TauriResult<VideoThumbnailInfo> {
    let path = Path::new(video_path);

    if !path.exists() {
        return Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "视频文件不存在",
        )));
    }

    // 根据平台选择不同的实现
    #[cfg(target_os = "macos")]
    {
        generate_thumbnail_macos(video_path, target_time).await
    }

    #[cfg(target_os = "windows")]
    {
        generate_thumbnail_windows(video_path, target_time).await
    }

    #[cfg(target_os = "linux")]
    {
        generate_thumbnail_linux(video_path, target_time).await
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Unsupported,
            "当前平台暂不支持视频缩略图生成",
        )))
    }
}

#[cfg(target_os = "macos")]
async fn generate_thumbnail_macos(
    video_path: &str,
    _target_time: Option<f64>,
) -> TauriResult<VideoThumbnailInfo> {
    use std::fs;

    // 检查视频文件是否存在
    if !Path::new(video_path).exists() {
        return Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("视频文件不存在: {}", video_path),
        )));
    }

    // 使用 macOS 系统的 qlmanage 工具生成缩略图
    let temp_dir = std::env::temp_dir();

    // 使用 qlmanage 生成缩略图
    let output = Command::new("qlmanage")
        .args(&[
            "-t",
            "-s",
            "300", // 缩略图大小
            "-o",
            temp_dir.to_str().unwrap(),
            video_path,
        ])
        .output()
        .map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("执行 qlmanage 失败: {}", e),
            ))
        })?;

    if !output.status.success() {
        return Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "qlmanage 执行失败: {}",
                String::from_utf8_lossy(&output.stderr)
            ),
        )));
    }

    // 寻找生成的缩略图文件
    let video_file_stem = Path::new(video_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("video");

    // 列出临时目录中的所有文件来找缩略图
    let mut generated_thumbnail = None;
    if let Ok(entries) = fs::read_dir(&temp_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(name) = entry.file_name().to_str() {
                    if name.contains(&video_file_stem) && name.ends_with(".png") {
                        generated_thumbnail = Some(entry.path());
                        break;
                    }
                }
            }
        }
    }

    let thumbnail_path = if let Some(path) = generated_thumbnail {
        path
    } else {
        // 如果没找到，尝试默认路径
        let default_path = temp_dir.join(format!("{}.png", video_file_stem));
        if default_path.exists() {
            default_path
        } else {
            return Err(tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!(
                    "找不到生成的缩略图文件，video_file_stem: {}",
                    video_file_stem
                ),
            )));
        }
    };

    // 读取生成的缩略图
    let thumbnail_data = tokio::fs::read(&thumbnail_path).await.map_err(|e| {
        tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("读取缩略图失败: {}", e),
        ))
    })?;

    // 获取图像尺寸
    let img = ImageReader::new(std::io::Cursor::new(&thumbnail_data))
        .with_guessed_format()
        .map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("读取图像格式失败: {}", e),
            ))
        })?
        .decode()
        .map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("解码图像失败: {}", e),
            ))
        })?;

    let width = img.width();
    let height = img.height();

    // 转换为 RGB 格式（去除透明度通道），然后转换为 JPEG
    let rgb_img = img.to_rgb8();
    let mut jpeg_data = Vec::new();

    image::DynamicImage::ImageRgb8(rgb_img)
        .write_to(&mut std::io::Cursor::new(&mut jpeg_data), ImageFormat::Jpeg)
        .map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("转换为 JPEG 失败: {}", e),
            ))
        })?;

    // 转换为 base64
    let base64_string = general_purpose::STANDARD.encode(&jpeg_data);

    // 清理临时文件
    let _ = tokio::fs::remove_file(&thumbnail_path).await;

    // 获取视频时长（使用 mdls 命令）
    let duration = get_video_duration_macos(video_path).await.unwrap_or(0.0);

    Ok(VideoThumbnailInfo {
        thumbnail_base64: base64_string,
        width,
        height,
        duration,
    })
}

#[cfg(target_os = "macos")]
async fn get_video_duration_macos(video_path: &str) -> Option<f64> {
    let output = Command::new("mdls")
        .args(&["-name", "kMDItemDurationSeconds", video_path])
        .output()
        .ok()?;

    if output.status.success() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        // 解析输出格式: "kMDItemDurationSeconds = 123.456"
        if let Some(duration_str) = output_str.split('=').nth(1) {
            duration_str.trim().parse().ok()
        } else {
            None
        }
    } else {
        None
    }
}

#[cfg(target_os = "windows")]
async fn generate_thumbnail_windows(
    _video_path: &str,
    _target_time: Option<f64>,
) -> TauriResult<VideoThumbnailInfo> {
    // Windows 实现可以使用 Windows Media Format SDK 或其他方案
    Err(tauri::Error::Io(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "Windows 平台暂不支持视频缩略图生成",
    )))
}

#[cfg(target_os = "linux")]
async fn generate_thumbnail_linux(
    _video_path: &str,
    _target_time: Option<f64>,
) -> TauriResult<VideoThumbnailInfo> {
    // Linux 实现可以使用 gstreamer 或其他方案
    Err(tauri::Error::Io(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "Linux 平台暂不支持视频缩略图生成",
    )))
}

/// Tauri 命令：生成视频缩略图
#[tauri::command]
pub async fn get_video_thumbnail(
    video_path: String,
    target_time: Option<f64>,
) -> Result<VideoThumbnailInfo, String> {
    generate_video_thumbnail(&video_path, target_time)
        .await
        .map_err(|e| e.to_string())
}
