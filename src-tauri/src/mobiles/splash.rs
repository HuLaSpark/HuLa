#[cfg(target_os = "ios")]
mod ios {
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

#[cfg(not(target_os = "ios"))]
mod ios {
    pub fn show() {}
    pub fn hide() {}
}

pub fn show() {
    ios::show();
}

pub fn hide() {
    ios::hide();
}
