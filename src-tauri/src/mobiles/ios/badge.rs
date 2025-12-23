#[cfg(target_os = "ios")]
mod platform {
    unsafe extern "C" {
        fn hula_set_application_badge(count: i32);
        fn hula_request_badge_authorization();
    }

    pub fn set_badge(count: Option<u32>) {
        let sanitized = count.unwrap_or(0).min(99_999) as i32;
        unsafe { hula_set_application_badge(sanitized) };
    }

    pub fn request_authorization() {
        unsafe { hula_request_badge_authorization() };
    }
}

#[cfg(not(target_os = "ios"))]
mod platform {
    pub fn set_badge(_count: Option<u32>) {
        // 非 iOS 平台无需处理
    }

    pub fn request_authorization() {}
}

pub fn set_badge_count(count: Option<u32>) {
    platform::set_badge(count);
}

#[cfg(target_os = "ios")]
#[tauri::command]
pub fn set_ios_badge(count: Option<u32>) -> Result<(), String> {
    set_badge_count(count);
    Ok(())
}

#[cfg(target_os = "ios")]
#[tauri::command]
pub fn request_ios_badge_authorization() -> Result<(), String> {
    platform::request_authorization();
    Ok(())
}
