use bytes::Bytes;
use futures_util::stream::try_unfold;
use md5::{Digest, Md5};
use serde::Deserialize;
use serde::Serialize;
use std::{collections::HashMap, path::PathBuf};
use tauri::{AppHandle, Manager, ipc::Channel, path::BaseDirectory};
use tokio::{fs::File, io::AsyncReadExt};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadProgressPayload {
    pub progress_total: u64,
    pub total: u64,
}

#[derive(Deserialize)]
struct QiniuMkblkResponse {
    ctx: String,
}

#[derive(Deserialize)]
struct QiniuMkfileResponse {
    key: Option<String>,
}

#[tauri::command]
pub async fn upload_file_put(
    app_handle: AppHandle,
    url: String,
    path: String,
    base_dir: Option<String>,
    headers: Option<HashMap<String, String>>,
    on_progress: Channel<UploadProgressPayload>,
) -> Result<(), String> {
    let file_path = resolve_upload_path(&app_handle, &path, base_dir.as_deref())?;
    upload_put(url, file_path, headers.unwrap_or_default(), on_progress).await
}

#[tauri::command]
pub async fn qiniu_upload_resumable(
    app_handle: AppHandle,
    path: String,
    base_dir: Option<String>,
    token: String,
    domain: String,
    scene: Option<String>,
    account: Option<String>,
    storage_prefix: Option<String>,
    enable_deduplication: Option<bool>,
    on_progress: Channel<UploadProgressPayload>,
) -> Result<String, String> {
    let file_path = resolve_upload_path(&app_handle, &path, base_dir.as_deref())?;
    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Failed to determine file name".to_string())?
        .to_string();

    qiniu_resumable_upload(
        file_path,
        token,
        domain,
        scene.unwrap_or_else(|| "chat".to_string()),
        account,
        storage_prefix,
        enable_deduplication.unwrap_or(false),
        file_name,
        on_progress,
    )
    .await
}

fn resolve_upload_path(
    app_handle: &AppHandle,
    path: &str,
    base_dir: Option<&str>,
) -> Result<PathBuf, String> {
    let path_buf = PathBuf::from(path);
    if path_buf.is_absolute() {
        return Ok(path_buf);
    }

    let Some(base_dir) = base_dir else {
        return Ok(path_buf);
    };

    let base_dir = match base_dir {
        "AppCache" | "appCache" | "app_cache" => BaseDirectory::AppCache,
        "AppData" | "appData" | "app_data" => BaseDirectory::AppData,
        _ => {
            return Err(format!(
                "Unsupported baseDir: {base_dir}, expected AppCache/AppData"
            ));
        }
    };

    app_handle
        .path()
        .resolve(path, base_dir)
        .map_err(|e| format!("Failed to resolve file path: {e}"))
}

async fn upload_put(
    url: String,
    file_path: PathBuf,
    headers: HashMap<String, String>,
    on_progress: Channel<UploadProgressPayload>,
) -> Result<(), String> {
    let file = File::open(&file_path)
        .await
        .map_err(|e| format!("Failed to open file: {e}"))?;
    let total = file
        .metadata()
        .await
        .map_err(|e| format!("Failed to read file metadata: {e}"))?
        .len();

    let chunk_size: usize = 4 * 1024 * 1024;
    let stream = try_unfold(
        (file, 0_u64, on_progress),
        move |(mut file, mut transferred, on_progress)| async move {
            let mut buf = vec![0u8; chunk_size];
            let read = file.read(&mut buf).await?;

            if read == 0 {
                return Ok::<_, std::io::Error>(None);
            }

            buf.truncate(read);
            transferred = transferred.saturating_add(read as u64);

            let _ = on_progress.send(UploadProgressPayload {
                progress_total: transferred,
                total,
            });

            Ok(Some((Bytes::from(buf), (file, transferred, on_progress))))
        },
    );

    let client = reqwest::Client::new();
    let mut request = client
        .put(url)
        .header(reqwest::header::CONTENT_LENGTH, total)
        .body(reqwest::Body::wrap_stream(stream));

    for (key, value) in headers {
        request = request.header(key, value);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Upload request failed: {e}"))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("Upload failed with status {status}: {body}"))
    }
}

fn hex_lower(bytes: &[u8]) -> String {
    const LUT: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        out.push(LUT[(b >> 4) as usize] as char);
        out.push(LUT[(b & 0x0f) as usize] as char);
    }
    out
}

fn build_qiniu_key(options: QiniuKeyOptions<'_>) -> String {
    let timestamp = options.timestamp_ms;

    if options.total_size > options.chunk_threshold {
        let prefix = options
            .storage_prefix
            .filter(|p| !p.is_empty())
            .unwrap_or(options.scene);
        return format!("{prefix}/{timestamp}_{}", options.file_name);
    }

    if options.enable_deduplication {
        if let (Some(account), Some(md5_hex)) = (options.account, options.md5_hex) {
            let suffix = options.file_name.split('.').last().unwrap_or("");
            return format!("{}/{}/{}.{}", options.scene, account, md5_hex, suffix);
        }
    }

    format!("{}/{timestamp}_{}", options.scene, options.file_name)
}

struct QiniuKeyOptions<'a> {
    scene: &'a str,
    account: Option<&'a str>,
    storage_prefix: Option<&'a str>,
    enable_deduplication: bool,
    total_size: u64,
    chunk_threshold: u64,
    file_name: &'a str,
    timestamp_ms: u128,
    md5_hex: Option<&'a str>,
}

async fn qiniu_resumable_upload(
    file_path: PathBuf,
    token: String,
    domain: String,
    scene: String,
    account: Option<String>,
    storage_prefix: Option<String>,
    enable_deduplication: bool,
    file_name: String,
    on_progress: Channel<UploadProgressPayload>,
) -> Result<String, String> {
    use base64::Engine;
    use base64::engine::general_purpose::STANDARD;

    let domain = domain.trim_end_matches('/').to_string();
    let mut file = File::open(&file_path)
        .await
        .map_err(|e| format!("Failed to open file: {e}"))?;
    let total = file
        .metadata()
        .await
        .map_err(|e| format!("Failed to read file metadata: {e}"))?
        .len();

    let chunk_size: u64 = 4 * 1024 * 1024;
    let chunk_threshold: u64 = 4 * 1024 * 1024;
    let timestamp_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);

    let should_hash =
        enable_deduplication && total <= chunk_threshold && account.as_deref().is_some();
    let mut hasher = should_hash.then(Md5::new);
    let mut contexts: Vec<String> = Vec::new();

    let client = reqwest::Client::new();
    let mut transferred: u64 = 0;

    while transferred < total {
        let remaining = total.saturating_sub(transferred);
        let len = std::cmp::min(chunk_size, remaining) as usize;
        let mut buf = vec![0u8; len];
        file.read_exact(&mut buf)
            .await
            .map_err(|e| format!("Failed to read file: {e}"))?;

        if let Some(ref mut h) = hasher {
            h.update(&buf);
        }

        let mkblk_url = format!("{domain}/mkblk/{len}");
        let response = client
            .post(mkblk_url)
            .header(reqwest::header::CONTENT_TYPE, "application/octet-stream")
            .header(reqwest::header::AUTHORIZATION, format!("UpToken {token}"))
            .body(Bytes::from(buf))
            .send()
            .await
            .map_err(|e| format!("Upload request failed: {e}"))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("mkblk failed with status {status}: {body}"));
        }

        let payload = response
            .json::<QiniuMkblkResponse>()
            .await
            .map_err(|e| format!("Failed to parse mkblk response: {e}"))?;

        contexts.push(payload.ctx);
        transferred = transferred.saturating_add(len as u64);
        let _ = on_progress.send(UploadProgressPayload {
            progress_total: transferred,
            total,
        });
    }

    let md5_hex = hasher.map(|h| {
        let digest = h.finalize();
        hex_lower(digest.as_ref())
    });
    let key = build_qiniu_key(QiniuKeyOptions {
        scene: &scene,
        account: account.as_deref(),
        storage_prefix: storage_prefix.as_deref(),
        enable_deduplication,
        total_size: total,
        chunk_threshold,
        file_name: &file_name,
        timestamp_ms,
        md5_hex: md5_hex.as_deref(),
    });
    let encoded_key = STANDARD.encode(&key);

    let mkfile_url = format!("{domain}/mkfile/{total}/key/{encoded_key}");
    let response = client
        .post(mkfile_url)
        .header(reqwest::header::CONTENT_TYPE, "text/plain")
        .header(reqwest::header::AUTHORIZATION, format!("UpToken {token}"))
        .body(contexts.join(","))
        .send()
        .await
        .map_err(|e| format!("Finalize request failed: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("mkfile failed with status {status}: {body}"));
    }

    let payload = response
        .json::<QiniuMkfileResponse>()
        .await
        .map_err(|e| format!("Failed to parse mkfile response: {e}"))?;

    Ok(payload.key.unwrap_or(key))
}
