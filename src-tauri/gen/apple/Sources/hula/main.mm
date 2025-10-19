#include "bindings/bindings.h"

extern "C" void hula_disable_keyboard_accessory(void);

int main(int argc, char * argv[]) {
    // 提前启动 iOS 键盘工具栏隐藏补丁（会在主线程定时尝试）
    hula_disable_keyboard_accessory();

    ffi::start_app();
    return 0;
}
