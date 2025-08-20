use crate::common::init::{CustomInit, init_common_plugins};
use tauri::Runtime;

impl<R: Runtime> CustomInit for tauri::Builder<R> {
    // 初始化插件
    fn init_plugin(self) -> Self {
        let builder = init_common_plugins(self);

        // 移动端特有的插件
        #[cfg(mobile)]
        let builder = builder
            .plugin(tauri_plugin_safe_area_insets::init())
            .plugin(tauri_plugin_hula::init())
            .plugin(tauri_plugin_barcode_scanner::init());

        builder
    }
}
