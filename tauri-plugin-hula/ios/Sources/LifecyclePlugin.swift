import Tauri
import UIKit
import WebKit

class LifecyclePlugin: Plugin {
  override init() {
    super.init()

    // 监听进入后台
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(appDidEnterBackground),
      name: UIApplication.didEnterBackgroundNotification,
      object: nil
    )

    // 监听回到前台
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(appWillEnterForeground),
      name: UIApplication.willEnterForegroundNotification,
      object: nil
    )
  }

  @objc private func appDidEnterBackground() {
    self.webView?.evaluateJavaScript(
      "window.dispatchEvent(new CustomEvent('appDidEnterBackground'));",
      completionHandler: nil
    )
  }

  @objc private func appWillEnterForeground() {
    self.webView?.evaluateJavaScript(
      "window.dispatchEvent(new CustomEvent('appDidEnterForeground'));",
      completionHandler: nil
    )
  }
}

@_cdecl("init_plugin_hula")
func initPlugin() -> Plugin {
  return LifecyclePlugin()
}
