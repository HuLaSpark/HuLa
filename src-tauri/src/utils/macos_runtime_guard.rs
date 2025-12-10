/// 针对 macOS (WKWebView) 的运行时防护
pub fn apply_runtime_guards() {
    sanitize_sensitive_env();
    enforce_debugger_policy();
}

fn sanitize_sensitive_env() {
    const BLOCKED_VARS: [&str; 6] = [
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "WEBVIEW2_BROWSER_EXECUTABLE_FOLDER",
        "WEBVIEW2_USER_DATA_FOLDER",
        "WEBVIEW2_WAIT_FOR_SCRIPT_DEBUGGER",
        "WEBKIT_INSPECTOR_SERVER",
        "DYLD_INSERT_LIBRARIES",
    ];

    BLOCKED_VARS.iter().for_each(|key| unsafe {
        std::env::remove_var(key);
    });
}

fn enforce_debugger_policy() {
    #[cfg(not(debug_assertions))]
    {
        if prevent_debugger_attach().is_err() {
            eprintln!("[HuLa] 无法设置调试防护 (macOS) 。");
        }
    }

    #[cfg(debug_assertions)]
    {
        eprintln!("[HuLa] 调试构建：macOS 运行时防护仅记录提示，不阻断调试。");
    }
}

#[cfg(not(debug_assertions))]
fn prevent_debugger_attach() -> Result<(), ()> {
    unsafe {
        // PT_DENY_ATTACH 会阻止后续调试器附加；若当前已被调试，系统会直接终止进程
        if libc::ptrace(libc::PT_DENY_ATTACH, 0, std::ptr::null_mut(), 0) == -1 {
            return Err(());
        }
        Ok(())
    }
}
