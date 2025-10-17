use mime_guess::from_path;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileMeta {
    name: String,
    path: String,
    file_type: String,
    mime_type: String,
    exists: bool,
}

#[tauri::command]
pub async fn get_files_meta(files_path: Vec<String>) -> Result<Vec<FileMeta>, String> {
    let mut files_meta: Vec<FileMeta> = Vec::with_capacity(files_path.len());

    for original_path in files_path {
        let path_buf = PathBuf::from(&original_path);
        let is_url = original_path.starts_with("http://") || original_path.starts_with("https://");

        let name = path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let file_type = path_buf
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        let mime_type = from_path(&path_buf).first_or_octet_stream().to_string();

        let exists = if is_url { false } else { path_buf.exists() };

        let stored_path = if is_url {
            original_path.clone()
        } else {
            path_buf.to_string_lossy().to_string()
        };

        files_meta.push(FileMeta {
            name,
            path: stored_path,
            file_type,
            mime_type,
            exists,
        });
    }

    Ok(files_meta)
}
