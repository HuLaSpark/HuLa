#[cfg(target_os = "ios")]
mod platform {
    unsafe extern "C" {
        fn hula_show_splashscreen();
        fn hula_hide_splashscreen();
    }

    pub fn show() {
        unsafe { hula_show_splashscreen() };
    }

    pub fn hide() {
        unsafe { hula_hide_splashscreen() };
    }
}

#[cfg(target_os = "android")]
mod platform {
    use jni::{JavaVM, objects::JObject};
    // tao 0.35 不再初始化 ndk-context，Activity 上下文需从 tao 获取
    use tauri::tao::platform::android::prelude::main_android_context;

    fn invoke(method: &str) {
        let Some(ctx) = main_android_context() else {
            tracing::warn!("[Splashscreen] android context not ready, skip {}", method);
            return;
        };

        let result = (|| -> jni::errors::Result<()> {
            let vm = unsafe { JavaVM::from_raw(ctx.java_vm.cast()) }?;
            let mut env = vm.attach_current_thread()?;
            let activity = unsafe { JObject::from_raw(ctx.context_jobject as jni::sys::jobject) };

            // 直接调用Activity实例的方法，不使用静态方法
            let result = env.call_method(&activity, method, "()V", &[]);

            let _ = activity.into_raw();

            result.map(|_| ()).map_err(|err| {
                if env.exception_check().unwrap_or(false) {
                    let _ = env.exception_describe();
                    let _ = env.exception_clear();
                }
                err
            })
        })();

        if let Err(err) = result {
            tracing::error!(
                "[Splashscreen] failed to call {} on Android: {}",
                method,
                err
            );
        }
    }

    pub fn show() {
        invoke("show");
    }

    pub fn hide() {
        invoke("hide");
    }
}

#[cfg(not(any(target_os = "ios", target_os = "android")))]
mod platform {
    pub fn show() {}
    pub fn hide() {}
}

pub fn show() {
    platform::show();
}

pub fn hide() {
    platform::hide();
}

/// Tauri command: 隐藏启动画面（由前端调用）
#[tauri::command]
pub fn hide_splash_screen() -> Result<(), String> {
    tracing::info!("hide_splash_screen called from frontend");
    hide();
    Ok(())
}
