#import <UIKit/UIKit.h>
#import <dispatch/dispatch.h>

static UIView *hulaSplashView = nil;

static UIWindow *HulaFindActiveWindow(void) {
  UIWindow *targetWindow = nil;
  if (@available(iOS 13.0, *)) {
    NSSet<UIScene *> *connectedScenes = UIApplication.sharedApplication.connectedScenes;
    for (UIScene *scene in connectedScenes) {
      if (scene.activationState != UISceneActivationStateForegroundActive &&
          scene.activationState != UISceneActivationStateForegroundInactive) {
        continue;
      }
      if (![scene isKindOfClass:[UIWindowScene class]]) {
        continue;
      }
      UIWindowScene *windowScene = (UIWindowScene *)scene;
      for (UIWindow *window in windowScene.windows) {
        if (window.isHidden) {
          continue;
        }
        if (window.isKeyWindow) {
          return window;
        }
        if (targetWindow == nil) {
          targetWindow = window;
        }
      }
    }
  }
  return targetWindow;
}

static void HulaEnsureSplashView(void) {
  UIWindow *window = HulaFindActiveWindow();
  if (window == nil) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(16 * NSEC_PER_MSEC)),
                   dispatch_get_main_queue(), ^{
                     HulaEnsureSplashView();
                   });
    return;
  }

  if (hulaSplashView != nil) {
    if (hulaSplashView.superview != window) {
      [hulaSplashView removeFromSuperview];
      hulaSplashView.frame = window.bounds;
      [window addSubview:hulaSplashView];
    }
    return;
  }

  UIImage *image = [UIImage imageNamed:@"LaunchImage"];
  if (image == nil) {
    image = [UIImage imageNamed:@"Mobile/2"];
  }

  UIImageView *imageView = [[UIImageView alloc] initWithFrame:window.bounds];
  imageView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  imageView.contentMode = UIViewContentModeScaleAspectFill;
  imageView.backgroundColor = UIColor.whiteColor;
  imageView.image = image;
  imageView.accessibilityIdentifier = @"hula.native.splash";

  hulaSplashView = imageView;
  [window addSubview:hulaSplashView];
}

static void HulaShowSplashView(void) {
  HulaEnsureSplashView();
  if (hulaSplashView == nil) {
    return;
  }
  hulaSplashView.alpha = 1.0;
  hulaSplashView.hidden = NO;
}

static void HulaHideSplashView(void) {
  if (hulaSplashView == nil) {
    return;
  }
  [UIView animateWithDuration:0.35
                        delay:0
                      options:UIViewAnimationOptionCurveEaseInOut
                   animations:^{
                     hulaSplashView.alpha = 0.0;
                   }
                   completion:^(BOOL finished) {
                     (void)finished;
                     [hulaSplashView removeFromSuperview];
                     hulaSplashView = nil;
                   }];
}

#ifdef __cplusplus
extern "C" {
#endif

void hula_show_splashscreen(void) {
  dispatch_async(dispatch_get_main_queue(), ^{
    HulaShowSplashView();
  });
}

void hula_hide_splashscreen(void) {
  dispatch_async(dispatch_get_main_queue(), ^{
    HulaHideSplashView();
  });
}

#ifdef __cplusplus
}
#endif
