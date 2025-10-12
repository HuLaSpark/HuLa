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
    use jni::{
        JavaVM,
        objects::{JObject, JValue},
    };

    const CLASS_NAME: &str = "com/hula_ios/app/SplashScreen";

    fn invoke(method: &str) -> Result<(), jni::errors::Error> {
        let ctx = ndk_context::android_context();
        let vm = unsafe { JavaVM::from_raw(ctx.vm().cast()) }?;
        let mut env = vm.attach_current_thread()?;
        let activity = unsafe { JObject::from_raw(ctx.context() as jni::sys::jobject) };

        let result = env.call_static_method(
            CLASS_NAME,
            method,
            "(Landroid/app/Activity;)V",
            &[JValue::Object(&activity)],
        );

        let _ = activity.into_raw();

        result.map(|_| ()).map_err(|err| {
            if env.exception_check().unwrap_or(false) {
                let _ = env.exception_describe();
                let _ = env.exception_clear();
            }
            err
        })
    }

    pub fn show() {
        if let Err(err) = invoke("show") {
            tracing::error!("[Splashscreen] failed to show on Android: {}", err);
        }
    }

    pub fn hide() {
        if let Err(err) = invoke("hide") {
            tracing::error!("[Splashscreen] failed to hide on Android: {}", err);
        }
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
