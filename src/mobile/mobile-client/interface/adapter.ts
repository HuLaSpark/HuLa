import type { SafeArea } from '@/stores/mobile'

export interface IMobileClientAdapter {
  /**
   * 获取当前设备的安全区域信息
   * @param envType - 操作系统类型，'android' 或 'ios'
   * @returns Promise<SafeArea> - 安全区域边距信息
   */
  getSafeArea(): Promise<SafeArea>

  /**
   * 监听窗口大小变化并更新安全区域状态
   * @param envType - 当前运行环境的操作系统类型
   */
  listenWindowResize(callback: (safeArea: SafeArea) => void): Promise<void>

  /**
   * 注册键盘显示事件监听器，并在键盘弹出时执行回调。
   *
   * 该方法适用于移动设备环境中，监听键盘弹出行为（如 iOS WebView 注入的事件）。
   * 回调函数将在键盘显示时触发，并收到键盘相关的位置信息。
   * 返回一个 Promise，Promise 解析值为取消监听函数，可在组件卸载或不再需要监听时调用以清除事件绑定，避免内存泄漏。
   *
   * @param callback - 当键盘显示时要执行的回调函数，接收键盘弹出详情作为参数。
   * @returns Promise 一个 Promise，解析值为一个取消监听函数，用于手动移除该事件监听。
   *
   * @example
   * const removeListener = await keyboardDidShow((detail) => {
   *   console.log('键盘显示，底部高度：', detail.bottomInset)
   * })
   *
   * // 页面卸载时移除监听器
   * removeListener()
   */
  keyboardListener(showCallback: TKeyboardShowCallback, hideCallback: TKeyboardHideCallback): KeyboardListenerResult

  /**
   * 注册应用前后台切换事件监听器
   */
  appLifecycleListener(
    foregroundCallback: TAppForegroundCallback,
    backgroundCallback: TAppBackgroundCallback
  ): AppLifecycleListenerResult
}

// keyboardListener相关的类型和属性接口
export type TKeyboardShowCallback = (detail: IKeyboardDidShowDetail) => void
export type TKeyboardHideCallback = () => void
export interface KeyboardListenerResult {
  removeShowFunction: () => void
  removeHideFunction: () => void
}

export interface IKeyboardDidShowDetail {
  bottomInset: number
  height: number
  keyboardVisible: boolean
  screenHeight: number
  timestamp: number
  visibleHeight: number
}

export type TAppForegroundCallback = () => void
export type TAppBackgroundCallback = () => void

export interface AppLifecycleListenerResult {
  removeForegroundFunction: () => void
  removeBackgroundFunction: () => void
}
