pub mod init;
pub mod ios;
pub mod keyboard;
pub mod splash;

/// tao 0.35 起不再初始化 ndk-context，而 cpal/oboe 的原生录音仍依赖它。
/// Activity 上下文就绪后补上初始化，否则 Android 端语音消息录音会失败。
#[cfg(target_os = "android")]
pub fn init_android_ndk_context() {
    use std::sync::Once;
    use tauri::tao::platform::android::prelude::main_android_context;

    static INIT: Once = Once::new();

    std::thread::spawn(|| {
        for _ in 0..600 {
            if let Some(ctx) = main_android_context() {
                INIT.call_once(|| unsafe {
                    ndk_context::initialize_android_context(ctx.java_vm, ctx.context_jobject);
                });
                tracing::info!("[ndk-context] initialized from tao activity context");
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        tracing::warn!(
            "[ndk-context] android context not available, native audio recording may fail"
        );
    });
}
