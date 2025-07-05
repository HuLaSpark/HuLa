use base64::{Engine as _, engine::general_purpose};
use image::{ImageFormat};
#[cfg(target_os = "macos")]
use image::{ImageReader};
use serde::Serialize;
use std::path::Path;
#[cfg(target_os = "macos")]
use std::process::Command;
use tauri::Result as TauriResult;

#[derive(Debug, Clone, Serialize)]
pub struct VideoThumbnailInfo {
    pub thumbnail_base64: String,
    pub width: u32,
    pub height: u32,
    #[cfg(target_os = "macos")]
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
        #[cfg(target_os = "macos")]
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
unsafe fn convert_hbitmap_to_image_data(hbitmap: windows::Win32::Graphics::Gdi::HBITMAP) -> TauriResult<(u32, u32, Vec<u8>)> {
    use windows::Win32::Graphics::Gdi::*;
    use windows::Win32::Foundation::HWND;

    unsafe {
        // 获取位图信息
        let mut bitmap = BITMAP::default();
        let result = GetObjectW(
            hbitmap,
            std::mem::size_of::<BITMAP>() as i32,
            Some(&mut bitmap as *mut _ as *mut _),
        );
        
        if result == 0 {
            return Err(tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "获取位图信息失败",
            )));
        }

        let width = bitmap.bmWidth as u32;
        let height = bitmap.bmHeight as u32;

        // 创建设备上下文
        let hdc = GetDC(HWND::default());
        if hdc.is_invalid() {
            return Err(tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "创建设备上下文失败",
            )));
        }

        let mem_dc = CreateCompatibleDC(hdc);
        if mem_dc.is_invalid() {
            ReleaseDC(HWND::default(), hdc);
            return Err(tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "创建兼容设备上下文失败",
            )));
        }

        // 选择位图到内存DC
        let old_bitmap = SelectObject(mem_dc, hbitmap);

        // 准备位图信息头
        let mut bmp_info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width as i32,
                biHeight: -(height as i32), // 负值表示自顶向下
                biPlanes: 1,
                biBitCount: 24, // RGB 格式
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [RGBQUAD::default()],
        };

        // 计算图像数据大小
        let stride = ((width * 3 + 3) / 4) * 4; // 4字节对齐
        let data_size = stride * height;
        let mut image_data = vec![0u8; data_size as usize];

        // 获取位图数据
        let result = GetDIBits(
            mem_dc,
            hbitmap,
            0,
            height,
            Some(image_data.as_mut_ptr() as *mut _),
            &mut bmp_info,
            DIB_RGB_COLORS,
        );

        // 清理资源
        SelectObject(mem_dc, old_bitmap);
        DeleteDC(mem_dc);
        ReleaseDC(HWND::default(), hdc);

        if result == 0 {
            return Err(tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "获取位图数据失败",
            )));
        }

        // 转换 BGR 到 RGB 并去除填充
        let mut rgb_data = Vec::with_capacity((width * height * 3) as usize);
        for y in 0..height {
            for x in 0..width {
                let offset = (y * stride + x * 3) as usize;
                if offset + 2 < image_data.len() {
                    // BGR 转 RGB
                    rgb_data.push(image_data[offset + 2]); // R
                    rgb_data.push(image_data[offset + 1]); // G
                    rgb_data.push(image_data[offset]);     // B
                }
            }
        }

        Ok((width, height, rgb_data))
    }
}

#[cfg(target_os = "windows")]
async fn generate_thumbnail_windows(
    video_path: &str,
    _target_time: Option<f64>,
) -> TauriResult<VideoThumbnailInfo> {
    use windows::{
        core::*,
        Win32::Foundation::*,
        Win32::System::Com::*,
        Win32::UI::Shell::*,
    };

    // 检查视频文件是否存在
    if !Path::new(video_path).exists() {
        return Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("视频文件不存在: {}", video_path),
        )));
    }

    // 初始化 COM
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED).map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("初始化 COM 失败: {:?}", e),
            ))
        })?;
    }

    let result = unsafe {
        // 将文件路径转换为宽字符
        let video_path_wide: Vec<u16> = video_path.encode_utf16().chain(std::iter::once(0)).collect();
        let video_path_pcwstr = PCWSTR(video_path_wide.as_ptr());

        // 创建 ShellItem
        let shell_item: IShellItem = SHCreateItemFromParsingName(
            video_path_pcwstr,
            None,
        ).map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("创建 ShellItem 失败: {:?}", e),
            ))
        })?;

        // 获取缩略图
        let image_factory: IShellItemImageFactory = shell_item.cast().map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("获取图像工厂失败: {:?}", e),
            ))
        })?;

        // 设置缩略图大小
        let size = SIZE { cx: 300, cy: 300 };

        // 获取缩略图 HBITMAP
        let hbitmap = image_factory.GetImage(size, SIIGBF_RESIZETOFIT).map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("获取缩略图失败，可能是视频格式不支持: {:?}", e),
            ))
        })?;

        // 将 HBITMAP 转换为图像数据
        convert_hbitmap_to_image_data(hbitmap)
    };

    // 清理 COM
    unsafe {
        CoUninitialize();
    }

    let (width, height, image_data) = result?;

    // 创建图像并转换为 JPEG
    let img = image::RgbImage::from_raw(width, height, image_data)
        .ok_or_else(|| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "创建图像失败",
            ))
        })?;

    let mut jpeg_data = Vec::new();
    image::DynamicImage::ImageRgb8(img)
        .write_to(&mut std::io::Cursor::new(&mut jpeg_data), ImageFormat::Jpeg)
        .map_err(|e| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("转换为 JPEG 失败: {}", e),
            ))
        })?;

    // 转换为 base64
    let base64_string = general_purpose::STANDARD.encode(&jpeg_data);

    Ok(VideoThumbnailInfo {
        thumbnail_base64: base64_string,
        width,
        height,
    })
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
