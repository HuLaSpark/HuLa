use windows::Win32::{
    Foundation::BOOL,
    System::{
        Diagnostics::Debug::{CheckRemoteDebuggerPresent, IsDebuggerPresent},
        Threading::GetCurrentProcess,
    },
};

/// Windows 运行时防护：清理敏感环境变量 + 调试器检测
pub fn apply_runtime_guards() {
    sanitize_sensitive_env();
    enforce_debugger_policy();
}

fn sanitize_sensitive_env() {
    const BLOCKED_VARS: [&str; 4] = [
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "WEBVIEW2_BROWSER_EXECUTABLE_FOLDER",
        "WEBVIEW2_USER_DATA_FOLDER",
        "WEBVIEW2_WAIT_FOR_SCRIPT_DEBUGGER",
    ];

    for key in BLOCKED_VARS {
        std::env::remove_var(key);
    }
}

fn enforce_debugger_policy() {
    if debugger_attached() {
        eprintln!("[HuLa] 检测到调试器或远程调试会话，出于安全考虑终止启动。");

        #[cfg(not(debug_assertions))]
        {
            std::process::exit(0);
        }
    }
}

fn debugger_attached() -> bool {
    unsafe {
        if IsDebuggerPresent().as_bool() {
            return true;
        }

        let mut remote = BOOL(0);
        if CheckRemoteDebuggerPresent(GetCurrentProcess(), &mut remote).as_bool() {
            return remote.as_bool();
        }

        false
    }
}
