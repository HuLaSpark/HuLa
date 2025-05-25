use serde::Serialize;
use std::net::IpAddr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use surge_ping::{Client, Config, PingIdentifier, PingSequence};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::net::lookup_host;

// 网络状态枚举
#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
pub enum NetworkStrength {
    Strong,  // 强网络
    Weak,    // 弱网络
    Offline, // 离线
}

// 网络状态结构体
#[derive(Debug, Clone, Serialize)]
pub struct NetworkStatus {
    pub is_online: bool,
    pub strength: NetworkStrength,
    pub latency_ms: u64, // 延迟时间（毫秒）
    pub last_check: u64, // 上次检查时间戳
}

impl Default for NetworkStatus {
    fn default() -> Self {
        NetworkStatus {
            is_online: true, // 默认假设在线
            strength: NetworkStrength::Strong,
            latency_ms: 0,
            last_check: 0,
        }
    }
}

// 全局网络状态
lazy_static::lazy_static! {
    static ref NETWORK_STATUS: Arc<Mutex<NetworkStatus>> = Arc::new(Mutex::new(NetworkStatus::default()));
}

// 将域名解析为IP地址
async fn resolve_host(host: &str) -> Option<IpAddr> {
    // 删除可能的协议前缀
    let host = host.replace("https://", "").replace("http://", "");
    // 删除可能的路径
    let host = host.split('/').next().unwrap_or(&host);

    // 使用标准端口进行DNS解析
    match lookup_host(format!("{host}:80")).await {
        Ok(mut addrs) => addrs.next().map(|addr| addr.ip()),
        Err(_) => None,
    }
}

// 对IP地址进行ping测试
async fn ping_ip(ip: IpAddr, count: u8, timeout: Duration) -> Option<u64> {
    // 注意：Config::builder()没有timeout方法，我们在pinger中设置timeout
    let config = Config::default();
    let client = match Client::new(&config) {
        Ok(client) => client,
        Err(_) => return None,
    };

    let mut total_rtt = 0u64;
    let mut success_count = 0u8;

    for i in 0..count {
        let payload = vec![0; 56]; // 标准ping数据包大小
        let ping_id = PingIdentifier(rand::random());
        // 将u8转换为u16
        let seq_num = PingSequence(i as u16);

        // 创建pinger（这是一个Future，需要await）
        // pinger直接返回Pinger对象，不是Result
        let mut pinger = client.pinger(ip, ping_id).await;
        // 设置超时（timeout方法返回&mut Pinger，已经修改了原来的pinger）
        pinger.timeout(timeout);

        // 执行ping
        match pinger.ping(seq_num, &payload).await {
            Ok((_, rtt)) => {
                total_rtt += rtt.as_millis() as u64;
                success_count += 1;
            }
            Err(_) => continue,
        }
    }

    if success_count > 0 {
        Some(total_rtt / success_count as u64)
    } else {
        None
    }
}

// 异步检查网络状态
async fn check_network_status() -> NetworkStatus {
    // 测试多个网站以提高准确性
    let test_hosts = vec!["www.baidu.com", "www.qq.com", "www.aliyun.com"];

    // 200ms的超时时间用于判断弱网
    let weak_threshold = 200;
    let ping_timeout = Duration::from_secs(1); // 单次ping超时时间
    let ping_count = 5; // 每个网站ping 5次

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // 并发测试所有网站
    let mut futures = Vec::new();
    for host in test_hosts {
        let host = host.to_string();
        futures.push(tokio::spawn(async move {
            // 先解析域名
            if let Some(ip) = resolve_host(&host).await {
                // 如果解析成功，进行ping测试
                ping_ip(ip, ping_count, ping_timeout).await
            } else {
                None
            }
        }));
    }

    // 收集测试结果
    let mut successful_tests = 0;
    let mut total_latency = 0u64;

    for future in futures {
        if let Ok(result) = future.await {
            if let Some(latency) = result {
                successful_tests += 1;
                total_latency += latency;
            }
        }
    }

    // 根据测试结果判断网络状态
    if successful_tests == 0 {
        // 所有测试都失败，认为离线
        NetworkStatus {
            is_online: false,
            strength: NetworkStrength::Offline,
            latency_ms: 0,
            last_check: now,
        }
    } else {
        // 至少有一个测试成功，计算平均延迟
        let avg_latency = total_latency / successful_tests as u64;
        let strength = if avg_latency > weak_threshold {
            NetworkStrength::Weak
        } else {
            NetworkStrength::Strong
        };

        NetworkStatus {
            is_online: true,
            strength,
            latency_ms: avg_latency,
            last_check: now,
        }
    }
}

// 更新网络状态并通知前端
async fn update_network_status<R: Runtime>(app_handle: AppHandle<R>) {
    let status = check_network_status().await;

    // 获取旧状态进行比较
    let mut global_status = NETWORK_STATUS.lock().unwrap();
    let old_status = global_status.clone();

    // 更新全局状态
    *global_status = status.clone();

    // 如果状态有变化，通知前端
    if old_status.is_online != status.is_online || old_status.strength != status.strength {
        // 沿用记忆中的错误处理方式，不抛出错误，而是尝试发送并忽略可能的错误
        if let Some(window) = app_handle.get_webview_window("home") {
            let _ = window.emit("network-status-changed", &status);
        }
    }
}

// 启动网络监控服务
pub fn start_network_monitor<R: Runtime>(app_handle: AppHandle<R>) {
    let app_handle_clone = app_handle.clone();

    // 立即进行一次检查
    tauri::async_runtime::spawn(async move {
        update_network_status(app_handle).await;
    });

    // 创建后台任务定期检查
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await; // 每5秒检查一次
            update_network_status(app_handle_clone.clone()).await;
        }
    });
}

// 获取当前网络状态
#[tauri::command]
pub fn get_network_status() -> NetworkStatus {
    NETWORK_STATUS.lock().unwrap().clone()
}

// 手动触发网络状态检查
#[tauri::command]
pub async fn check_network<R: Runtime>(app_handle: AppHandle<R>) -> NetworkStatus {
    update_network_status(app_handle.clone()).await;
    NETWORK_STATUS.lock().unwrap().clone()
}
