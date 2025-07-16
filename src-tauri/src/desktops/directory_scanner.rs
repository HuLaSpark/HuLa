use async_walkdir::WalkDir as AsyncWalkDir;
use futures::stream::StreamExt;
use serde::Serialize;
use std::path::PathBuf;
use std::time::Instant;
use sysinfo::Disks;
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;

#[derive(Serialize)]
pub struct DirectoryInfo {
    pub path: String,
    pub total_size: u64,
    pub disk_mount_point: String,
    pub disk_total_space: u64,
    pub disk_used_space: u64,
    pub disk_usage_percentage: f64,
    pub usage_percentage: f64,
}

#[derive(Serialize, Clone)]
pub struct DirectoryScanProgress {
    pub current_path: String,
    pub files_processed: u64,
    pub total_size: u64,
    pub elapsed_time: u64,
    pub elapsed_seconds: f64,
    pub progress_percentage: f64,
}

lazy_static::lazy_static! {
    static ref CANCEL_SENDER: broadcast::Sender<()> = {
        let (tx, _) = broadcast::channel(1);
        tx
    };
}

/// 带进度事件的目录大小扫描
async fn get_directory_size_with_progress(
    directory_path: String,
    handle: AppHandle,
) -> Result<u64, String> {
    let path = PathBuf::from(&directory_path);

    if !path.exists() {
        return Err("目录不存在".to_string());
    }

    if !path.is_dir() {
        return Err("指定路径不是目录".to_string());
    }

    // 创建取消接收器
    let mut cancel_receiver = CANCEL_SENDER.subscribe();
    
    let start_time = Instant::now();
    
    // 1.快速预扫描计算总文件数
    let mut total_files = 0u64;
    let mut entries = AsyncWalkDir::new(&path);
    
    let _ = handle.emit("directory-scan-progress", &DirectoryScanProgress {
        current_path: "正在统计文件数量...".to_string(),
        files_processed: 0,
        total_size: 0,
        elapsed_time: 0,
        elapsed_seconds: 0.0,
        progress_percentage: 0.0,
    });
    
    loop {
        tokio::select! {
            // 检查取消信号
            _ = cancel_receiver.recv() => {
                let _ = handle.emit("directory-scan-cancelled", ());
                return Err("扫描已取消".to_string());
            }
            // 处理文件扫描
            entry = entries.next() => {
                match entry {
                    Some(Ok(entry)) => {
                        if entry.file_type().await.map_or(false, |ft| ft.is_file()) {
                            total_files += 1;
                        }
                    }
                    Some(Err(_)) => continue,
                    None => break, // 扫描完成
                }
            }
        }
    }
    
    // 2.实际扫描并计算准确进度
    let mut total_size = 0u64;
    let mut files_processed = 0u64;
    let mut last_progress_time = Instant::now();
    
    let mut entries = AsyncWalkDir::new(&path);

    loop {
        tokio::select! {
            // 检查取消信号
            _ = cancel_receiver.recv() => {
                let _ = handle.emit("directory-scan-cancelled", ());
                return Err("扫描已取消".to_string());
            }
            // 处理文件扫描
            entry = entries.next() => {
                match entry {
                    Some(Ok(entry)) => {
                        if entry.file_type().await.map_or(false, |ft| ft.is_file()) {
                            match entry.metadata().await {
                                Ok(metadata) => {
                                    total_size = total_size.saturating_add(metadata.len());
                                    files_processed += 1;

                                    // 进度更新：每200ms或每100个文件发送一次
                                    let now = Instant::now();
                                    if now.duration_since(last_progress_time).as_millis() > 200
                                        || files_processed % 100 == 0
                                    {
                                        last_progress_time = now;

                                        // 只在需要发送事件时才转换路径
                                        let current_path = entry.path().to_string_lossy().to_string();

                                        let elapsed = now.duration_since(start_time).as_millis() as u64;
                                        let elapsed_seconds = elapsed as f64 / 1000.0;

                                        // 计算精确的进度百分比
                                        let progress_percentage = if total_files > 0 {
                                            (files_processed as f64 / total_files as f64) * 100.0
                                        } else {
                                            0.0
                                        };
                                        
                                        let progress = DirectoryScanProgress {
                                            current_path: current_path.clone(),
                                            files_processed,
                                            total_size,
                                            elapsed_time: elapsed,
                                            elapsed_seconds,
                                            progress_percentage,
                                        };

                                        let _ = handle.emit("directory-scan-progress", &progress);
                                    }
                                }
                                Err(_) => continue,
                            }
                        }
                    }
                    Some(Err(_)) => continue,
                    None => break, // 扫描完成
                }
            }
        }
    }

    let final_elapsed = start_time.elapsed().as_millis() as u64;
    let final_elapsed_seconds = final_elapsed as f64 / 1000.0;

    let final_progress = DirectoryScanProgress {
        current_path: "扫描完成".to_string(),
        files_processed,
        total_size,
        elapsed_time: final_elapsed,
        elapsed_seconds: final_elapsed_seconds,
        progress_percentage: 100.0,
    };

    let _ = handle.emit("directory-scan-complete", &final_progress);

    Ok(total_size)
}

/// 取消目录扫描
#[tauri::command]
pub fn cancel_directory_scan() -> Result<(), String> {
    // 发送取消信号，立即中断所有正在进行的扫描
    let _ = CANCEL_SENDER.send(());
    Ok(())
}

/// 带进度事件的目录使用信息
#[tauri::command]
pub async fn get_directory_usage_info_with_progress(
    directory_path: String,
    handle: AppHandle,
) -> Result<DirectoryInfo, String> {
    let total_size = get_directory_size_with_progress(directory_path.clone(), handle).await?;

    let path = PathBuf::from(&directory_path);
    let path_str = path.to_string_lossy().to_string();

    let disks = Disks::new_with_refreshed_list();

    let mut best_match = String::new();
    let mut best_match_len = 0;
    let mut disk_total_space = 0u64;
    let mut disk_available_space = 0u64;

    for disk in &disks {
        let mount_point = disk.mount_point().to_string_lossy().to_string();

        // Windows下路径比较需要处理路径分隔符
        let normalized_path = path_str.replace('\\', "/");
        let normalized_mount_point = mount_point.replace('\\', "/");

        if normalized_path.starts_with(&normalized_mount_point)
            && mount_point.len() > best_match_len
        {
            best_match_len = mount_point.len();
            disk_total_space = disk.total_space();
            disk_available_space = disk.available_space();
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

    // 计算磁盘已用空间和使用占比
    let disk_used_space = disk_total_space.saturating_sub(disk_available_space);
    let disk_usage_percentage = if disk_total_space > 0 {
        (disk_used_space as f64 / disk_total_space as f64) * 100.0
    } else {
        0.0
    };

    Ok(DirectoryInfo {
        path: directory_path,
        total_size,
        disk_mount_point: best_match,
        disk_total_space,
        disk_used_space,
        disk_usage_percentage,
        usage_percentage,
    })
}