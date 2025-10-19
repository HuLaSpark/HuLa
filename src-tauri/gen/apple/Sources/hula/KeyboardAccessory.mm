#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <dispatch/dispatch.h>

// 参考方案：通过覆盖 WKContentView 的 inputAccessoryView 返回 nil，
// 并清空 inputAssistantItem 的按钮组，以隐藏键盘顶部工具栏（Done/箭头）。

@interface _NoInputAccessoryView : NSObject
@end
@implementation _NoInputAccessoryView
- (id)inputAccessoryView {
    return nil;
}
@end

static BOOL HulaPatchTargetView(UIView *targetView) {
    if (!targetView) { return NO; }

    // 清空输入助手按钮组，防止出现默认工具栏按钮
    if ([targetView respondsToSelector:@selector(inputAssistantItem)]) {
        UITextInputAssistantItem *inputAssistantItem = [targetView inputAssistantItem];
        inputAssistantItem.leadingBarButtonGroups = @[];
        inputAssistantItem.trailingBarButtonGroups = @[];
    }

    // 为目标视图类创建一个子类，覆盖 inputAccessoryView 返回 nil
    NSString *noInputAccessoryViewClassName = [NSString stringWithFormat:@"%@_NoInputAccessoryView", targetView.class];
    Class newClass = NSClassFromString(noInputAccessoryViewClassName);
    if (newClass == nil) {
        newClass = objc_allocateClassPair(targetView.class, [noInputAccessoryViewClassName cStringUsingEncoding:NSASCIIStringEncoding], 0);
        if(!newClass) {
            return NO;
        }
        Method method = class_getInstanceMethod([_NoInputAccessoryView class], @selector(inputAccessoryView));
        class_addMethod(newClass, @selector(inputAccessoryView), method_getImplementation(method), method_getTypeEncoding(method));
        objc_registerClassPair(newClass);
    }

    // 替换当前对象的类为新类
    object_setClass(targetView, newClass);
    return YES;
}

static BOOL HulaIsWKContentView(UIView *view) {
    if (!view) { return NO; }
    // WKWebView 内容视图在不同 iOS 版本中名称可能为 WKContentView/WKScrollContentView 等
    NSString *className = NSStringFromClass(view.class);
    if ([className hasPrefix:@"WKContent"] || [className hasPrefix:@"WKScroll"] || [className isEqualToString:@"WKContentView"]) {
        return YES;
    }
    return NO;
}

static BOOL HulaPatchViewHierarchy(UIView *view) {
    if (!view) { return NO; }
    BOOL patched = NO;

    if (HulaIsWKContentView(view)) {
        patched = HulaPatchTargetView(view) || patched;
    }

    // 继续递归子视图
    for (UIView *sub in view.subviews) {
        patched = HulaPatchViewHierarchy(sub) || patched;
    }

    return patched;
}

static BOOL HulaPatchAllWindows(void) {
    BOOL patched = NO;
    if (@available(iOS 13.0, *)) {
        NSSet<UIScene *> *connectedScenes = UIApplication.sharedApplication.connectedScenes;
        for (UIScene *scene in connectedScenes) {
            if (![scene isKindOfClass:[UIWindowScene class]]) { continue; }
            UIWindowScene *windowScene = (UIWindowScene *)scene;
            for (UIWindow *window in windowScene.windows) {
                if (window.isHidden) { continue; }
                patched = HulaPatchViewHierarchy(window) || patched;
            }
        }
    } else {
        for (UIWindow *window in UIApplication.sharedApplication.windows) {
            if (window.isHidden) { continue; }
            patched = HulaPatchViewHierarchy(window) || patched;
        }
    }
    return patched;
}

static void HulaTryPatchRepeatedly(int attempt, int maxAttempts, NSTimeInterval interval) {
    // 在主线程执行，防止与 UIKit 交互的线程问题
    dispatch_async(dispatch_get_main_queue(), ^{
        BOOL ok = HulaPatchAllWindows();
        if (ok || attempt >= maxAttempts) {
            // 成功或达到最大重试次数，停止
            return;
        }
        // 继续下一次尝试
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(interval * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            HulaTryPatchRepeatedly(attempt + 1, maxAttempts, interval);
        });
    });
}

#ifdef __cplusplus
extern "C" {
#endif

// 对外暴露的入口：启动后反复尝试为 WKWebView 内容视图打补丁
void hula_disable_keyboard_accessory(void) {
    // 最多尝试 100 次，每次间隔 0.1 秒（总计约 10 秒）。
    // 一般在 WebView 创建后很快会被命中。
    HulaTryPatchRepeatedly(0, 100, 0.1);
}

#ifdef __cplusplus
}
#endif