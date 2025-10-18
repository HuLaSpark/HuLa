use pulldown_cmark::{html, Options, Parser};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 读取并解析 markdown 文件为 HTML
#[tauri::command]
pub async fn parse_markdown(
    _app: AppHandle,
    file_path: String,
) -> Result<String, String> {
    // 读取文件内容
    let markdown_content = fs::read_to_string(&file_path)
        .map_err(|e| format!("无法读取文件 {}: {}", file_path, e))?;

    // 配置 markdown 解析选项
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    // 解析 markdown
    let parser = Parser::new_ext(&markdown_content, options);

    // 转换为 HTML
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    Ok(html_output)
}

/// 读取 README markdown 文件
#[tauri::command]
pub async fn get_readme_html(
    app: AppHandle,
    language: String,
) -> Result<String, String> {
    // 获取应用根目录
    let app_dir = app.path()
        .app_config_dir()
        .map_err(|e| format!("无法获取应用目录: {}", e))?;

    // 构建 README 文件路径
    // 在开发模式下,从项目根目录读取
    // 在生产模式下,从资源目录读取
    let readme_filename = if language == "zh" {
        "README.md"
    } else {
        "README.en.md"
    };

    // 尝试多个可能的路径
    let possible_paths = vec![
        // 开发模式 - 项目根目录
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join(readme_filename),
        // 生产模式 - 应用资源目录
        app_dir.join(readme_filename),
    ];

    let mut markdown_content = None;
    for path in possible_paths {
        if let Ok(content) = fs::read_to_string(&path) {
            markdown_content = Some(content);
            break;
        }
    }

    let markdown_content = markdown_content
        .ok_or_else(|| format!("无法找到 {} 文件", readme_filename))?;

    // 配置 markdown 解析选项
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    // 解析 markdown
    let parser = Parser::new_ext(&markdown_content, options);

    // 转换为 HTML
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    Ok(html_output)
}
