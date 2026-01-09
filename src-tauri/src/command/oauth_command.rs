use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

// 定义状态以管理 OAuth 服务器任务
pub struct OauthServerState {
    pub handle: Mutex<Option<JoinHandle<()>>>,
}

impl Default for OauthServerState {
    fn default() -> Self {
        Self {
            handle: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_oauth_server<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, OauthServerState>,
) -> Result<u16, String> {
    // 1. 尝试终止旧任务
    {
        let mut handle_lock = state.handle.lock().map_err(|e| e.to_string())?;
        if let Some(handle) = handle_lock.take() {
            handle.abort(); // 终止旧任务
        }
    }

    // 2. 尝试绑定端口
    // 如果端口仍被占用（可能是操作系统还没释放），可以重试几次或直接报错
    // 这里简单处理：如果被占用，可能是上次任务虽然 abort 了但 socket 还没释放，或者被其他程序占用
    // 由于我们 abort 了任务，listener 应该被 drop，端口应该被释放。
    // 但 TcpListener drop 后端口释放可能不是立即的。

    let listener = match TcpListener::bind("127.0.0.1:36677").await {
        Ok(l) => l,
        Err(_) => {
            // 如果绑定失败，可能是端口还未释放，稍等一下再试
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            TcpListener::bind("127.0.0.1:36677")
                .await
                .map_err(|e| format!("启动本地授权服务失败(端口 36677 被占用): {}", e))?
        }
    };

    let local_addr = listener.local_addr().map_err(|e| e.to_string())?;
    let port = local_addr.port();

    // 3. 启动新任务
    let handle = tauri::async_runtime::spawn(async move {
        loop {
            if let Ok((mut stream, _)) = listener.accept().await {
                let mut buffer = [0; 1024];
                if let Ok(n) = stream.read(&mut buffer).await {
                    let request = String::from_utf8_lossy(&buffer[..n]);
                    let mut emitted = false;
                    if let Some(ts) = request.find("token=") {
                        let rest = &request[ts + 6..];
                        let end_amp = rest.find('&').unwrap_or(rest.len());
                        let end_space = rest.find(' ').unwrap_or(rest.len());
                        let end = std::cmp::min(end_amp, end_space);
                        let token = &rest[..end];
                        let mut refresh = "";
                        if let Some(rs) = request.find("refreshToken=") {
                            let rrest = &request[rs + 13..];
                            let rend_amp = rrest.find('&').unwrap_or(rrest.len());
                            let rend_space = rrest.find(' ').unwrap_or(rrest.len());
                            let rend = std::cmp::min(rend_amp, rend_space);
                            refresh = &rrest[..rend];
                        }
                        let mut uid = "";
                        if let Some(us) = request.find("uid=") {
                            let urest = &request[us + 4..];
                            let uend_amp = urest.find('&').unwrap_or(urest.len());
                            let uend_space = urest.find(' ').unwrap_or(urest.len());
                            let uend = std::cmp::min(uend_amp, uend_space);
                            uid = &urest[..uend];
                        }
                        let payload =
                            format!("token={}&refreshToken={}&uid={}", token, refresh, uid);
                        let _ = app.emit("oauth-token", payload);
                        emitted = true;
                    }
                    if !emitted {
                        if let Some(start) = request.find("code=") {
                            let rest = &request[start + 5..];
                            let end_amp = rest.find('&').unwrap_or(rest.len());
                            let end_space = rest.find(' ').unwrap_or(rest.len());
                            let end = std::cmp::min(end_amp, end_space);
                            let code = &rest[..end];
                            let _ = app.emit("gitee-auth-code", code);
                            emitted = true;
                        }
                    }
                    let response = if emitted {
                        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;'><h1>登录成功</h1><p>您可以关闭此窗口返回应用。</p></div><script>setTimeout(function(){window.close()}, 2000);</script>"
                    } else {
                        "HTTP/1.1 200 OK\r\n\r\n"
                    };
                    let _ = stream.write_all(response.as_bytes()).await;
                    let _ = stream.flush().await;
                }
            } else {
                // accept 失败，可能是 listener 关闭
                break;
            }
        }
    });

    // 4. 保存新任务句柄
    {
        let mut handle_lock = state.handle.lock().map_err(|e| e.to_string())?;
        *handle_lock = Some(handle);
    }

    Ok(port)
}
