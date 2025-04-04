use reqwest::{Client, Proxy};
use std::time::Duration;
use tungstenite::client::connect_with_config;
use tungstenite::http::Uri;
use tungstenite::protocol::WebSocketConfig;

// 定义测试用的URL列表
const TEST_API_URLS: [&str; 1] = [
    "/system/config/init",
];

#[tauri::command]
pub async fn test_ws_proxy(proxy_type: String, proxy_host: String, proxy_port: u16, proxy_suffix: String) -> Result<bool, String> {
    if proxy_type.is_empty() {
        return Ok(true); // 不使用代理时直接返回成功
    }

    let proxy_url = match proxy_type.as_str() {
        "ws" => format!("ws://{}:{}/{}", proxy_host, proxy_port, proxy_suffix),
        "wss" => format!("wss://{}:{}/{}", proxy_host, proxy_port, proxy_suffix),
        _ => return Err("不支持的代理类型".to_string()),
    };
    let uri = Uri::from_maybe_shared(format!("{}?clientId=test", proxy_url)).unwrap();
    let config = if proxy_type == "wss" { Some(WebSocketConfig::default()) } else { None };
    let mut result = match connect_with_config(uri, config, 3) {
        Ok(ws) => {
            ws
        }
        Err(e) => {
            println!("{:?}", e);
            return Err("代理无法连接，请检查代理设置".to_string())
        }
    };
    let _ = result.0.close(None).map_err(|_| {});
    Ok(true)
}

#[tauri::command]
pub async fn test_api_proxy(proxy_type: String, proxy_host: String, proxy_port: u16, proxy_suffix: String) -> Result<bool, String> {
    if proxy_type.is_empty() {
        return Ok(true); // 不使用代理时直接返回成功
    }

    let proxy_url = match proxy_type.as_str() {
        "http" => format!("http://{}:{}", proxy_host, proxy_port),
        "https" => format!("https://{}:{}", proxy_host, proxy_port),
        "socks5" => format!("socks5://{}:{}", proxy_host, proxy_port),
        _ => return Err("不支持的代理类型".to_string()),
    };

    // 构建代理客户端，移除了dns_resolver配置
    let client = Client::builder()
        .proxy(Proxy::all(&proxy_url).map_err(|e| format!("代理设置错误: {}", e))?)
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;

    // 依次测试多个URL，直到有一个成功
    for url in TEST_API_URLS.iter() {
        match test_url(&client, format!("{}/{}{}",proxy_url.as_str(), proxy_suffix.as_str(), url).as_str()).await {
            Ok(_) => return Ok(true),
            Err(e) => {
                println!("测试 {} 失败: {}", url, e);
                // 如果是DNS错误，直接返回特定错误信息
                if e.contains("dns error") {
                    return Err("DNS解析失败，请检查网络连接或代理设置".to_string());
                }
            }
        }
    }

    Err("所有测试网站均无法连接，请检查代理设置".to_string())
}

async fn test_url(client: &Client, url: &str) -> Result<(), String> {
    match client.get(url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                Ok(())
            } else {
                Err(format!("HTTP状态码错误: {}", response.status()))
            }
        }
        Err(e) => Err(format!("请求失败: {}", e)),
    }
}
