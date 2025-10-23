use base64::{Engine as _, engine::general_purpose};
use pulldown_cmark::{CowStr, Event, Options, Parser, Tag, html};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// 处理图片 URL,将相对路径转换为 base64 数据 URI
fn process_image_url(url: &str, base_dir: &Path) -> String {
    // 如果是绝对 URL 或已经是 data URI,直接返回
    if url.starts_with("http://")
        || url.starts_with("https://")
        || url.starts_with("data:")
        || url.starts_with("asset://")
    {
        return url.to_string();
    }

    // 处理相对路径
    let img_path = if url.starts_with("./") || url.starts_with("../") {
        base_dir.join(url)
    } else {
        base_dir.join(url)
    };

    // 尝试读取图片文件并转换为 base64
    if let Ok(img_data) = fs::read(&img_path) {
        // 根据文件扩展名确定 MIME 类型
        let mime_type = match img_path.extension().and_then(|s| s.to_str()) {
            Some("png") => "image/png",
            Some("jpg") | Some("jpeg") => "image/jpeg",
            Some("gif") => "image/gif",
            Some("svg") => "image/svg+xml",
            Some("webp") => "image/webp",
            _ => "image/png", // 默认
        };

        // 转换为 base64
        let base64_data = general_purpose::STANDARD.encode(&img_data);
        format!("data:{};base64,{}", mime_type, base64_data)
    } else {
        // 如果无法读取,返回原始 URL
        url.to_string()
    }
}

/// 读取并解析 markdown 文件为 HTML
#[tauri::command]
pub async fn parse_markdown(app: AppHandle, file_path: String) -> Result<String, String> {
    // 构建完整的文件路径
    let full_path = if file_path.starts_with('/') || file_path.starts_with("http") {
        // 绝对路径或 URL,直接使用
        PathBuf::from(&file_path)
    } else {
        // 相对路径,从项目根目录开始
        // 在开发模式下,从项目根目录读取
        // 在生产模式下,从资源目录读取
        let mut possible_paths = vec![
            // 开发模式 - 项目根目录
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .unwrap()
                .join(&file_path),
        ];

        // 生产模式 - 应用资源目录 (仅桌面端打包 docs)
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        if let Ok(resource_dir) = app.path().resource_dir() {
            possible_paths.push(resource_dir.join(&file_path));
        }

        // 生产模式 - 应用配置目录 (兼容旧版本安装路径)
        if let Ok(app_config_dir) = app.path().app_config_dir() {
            possible_paths.push(app_config_dir.join(&file_path));
        }

        // 尝试所有可能的路径
        possible_paths
            .into_iter()
            .find(|p| p.exists())
            .ok_or_else(|| format!("无法找到文件: {}", file_path))?
    };

    // 读取文件内容
    let markdown_content = fs::read_to_string(&full_path)
        .map_err(|e| format!("无法读取文件 {:?}: {}", full_path, e))?;

    // 配置 markdown 解析选项
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    // 解析 markdown
    let parser = Parser::new_ext(&markdown_content, options);

    // 获取 markdown 文件所在目录,用于解析相对路径
    let base_dir = full_path.parent().unwrap_or_else(|| Path::new("."));

    // 处理图片路径
    let events: Vec<Event> = parser
        .map(|event| {
            match event {
                Event::Start(Tag::Image {
                    link_type,
                    dest_url,
                    title,
                    id,
                }) => {
                    // 处理图片 URL
                    let new_url = process_image_url(&dest_url, base_dir);
                    Event::Start(Tag::Image {
                        link_type,
                        dest_url: CowStr::from(new_url),
                        title,
                        id,
                    })
                }
                _ => event,
            }
        })
        .collect();

    // 转换为 HTML
    let mut html_output = String::new();
    html::push_html(&mut html_output, events.into_iter());

    Ok(html_output)
}

/// 读取 README markdown 文件
#[tauri::command]
pub async fn get_readme_html(app: AppHandle, language: String) -> Result<String, String> {
    // 构建 README 文件路径
    // 在开发模式下,从项目根目录读取 README.md
    // 在生产模式下,从资源目录的 docs 文件夹读取 README.md
    let readme_filename = if language == "zh" {
        "README.md"
    } else {
        "README.en.md"
    };

    let readme_relative_path = Path::new("docs").join(readme_filename);
    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .to_path_buf();

    let mut possible_paths = vec![];

    #[cfg(dev)]
    {
        // 开发环境：优先使用项目根目录的 README.md（本地图片）
        possible_paths.push(project_root.join(readme_filename));

        // 回退：src-tauri/docs 目录
        possible_paths.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join(&readme_relative_path),
        );
    }

    #[cfg(not(dev))]
    {
        // 生产环境：优先使用打包资源目录的 docs/README.md（远程图片）
        // 优先级 1: 应用资源目录
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        if let Ok(resource_dir) = app.path().resource_dir() {
            possible_paths.push(resource_dir.join(&readme_relative_path));
        }

        // 优先级 2: 应用配置目录
        if let Ok(app_config_dir) = app.path().app_config_dir() {
            possible_paths.push(app_config_dir.join(&readme_relative_path));
        }

        // 优先级 3: 回退到根目录
        possible_paths.push(project_root.join(readme_filename));
    }

    let mut markdown_content = None;
    let mut readme_path = None;
    for path in possible_paths {
        if let Ok(content) = fs::read_to_string(&path) {
            markdown_content = Some(content);
            readme_path = Some(path);
            break;
        }
    }

    let markdown_content =
        markdown_content.ok_or_else(|| format!("无法找到 {} 文件", readme_filename))?;

    let readme_path = readme_path.unwrap();

    // 配置 markdown 解析选项
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    // 解析 markdown
    let parser = Parser::new_ext(&markdown_content, options);

    // 获取 README 文件所在目录,用于解析相对路径
    let base_dir = readme_path.parent().unwrap_or_else(|| Path::new("."));

    // 处理图片路径
    let events: Vec<Event> = parser
        .map(|event| {
            match event {
                Event::Start(Tag::Image {
                    link_type,
                    dest_url,
                    title,
                    id,
                }) => {
                    // 处理图片 URL
                    let new_url = process_image_url(&dest_url, base_dir);
                    Event::Start(Tag::Image {
                        link_type,
                        dest_url: CowStr::from(new_url),
                        title,
                        id,
                    })
                }
                _ => event,
            }
        })
        .collect();

    // 转换为 HTML
    let mut html_output = String::new();
    html::push_html(&mut html_output, events.into_iter());

    Ok(html_output)
}
