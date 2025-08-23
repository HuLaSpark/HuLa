import mitt from 'mitt'
import { type SafeArea, useMobileStore } from '@/stores/mobile'
import { isAndroid, isIOS, isMobile } from '@/utils/PlatformConstants'
import { AndroidAdapter } from './AndroidAdapter'
import { IosAdapter } from './IosAdapter'
import type {
  IMobileClientAdapter,
  KeyboardListenerResult,
  TKeyboardHideCallback,
  TKeyboardShowCallback
} from './interface/adapter'
import type { IMobileClient } from './interface/client'

const RESIZE_UPDATE = 'resize-update'

export type ResizeEvent = { isFullScreen: boolean; safeArea: SafeArea }

export type MobileClientEvents = {
  [RESIZE_UPDATE]: ResizeEvent
}

export class MobileClient implements IMobileClient {
  public mobileStore = useMobileStore()
  private clientAdapter!: IMobileClientAdapter
  public mitt = mitt<MobileClientEvents>()

  getSafeArea(): Promise<SafeArea> {
    return this.clientAdapter.getSafeArea()
  }

  public async init() {
    if (!isMobile()) return

    try {
      await this.initAdapter()
      await this.initState()
      await this.listenWindowResize()
    } catch (error) {
      console.error('[MobileClient] 初始化失败:', error)
    }
  }

  private async initAdapter(): Promise<void> {
    if (isAndroid()) {
      this.clientAdapter = new AndroidAdapter()
      return
    }
    if (isIOS()) {
      this.clientAdapter = new IosAdapter()
      return
    }

    throw new Error('[MobileClient] 找不到匹配的适配器')
  }

  /**
   * 将安全区参数写入 CSS 变量中，用于覆盖 iOS 的 env() 变量在 Android 上无效的问题
   * 适用于 Naive UI、modal、message 等组件的安全区适配
   *
   * @param {SafeArea} insets - 安全区域边距，包括 top/bottom/left/right 四个方向的数值（单位：px）
   */
  public updateSafeAreaStyle(insets: SafeArea) {
    const root = document.documentElement

    root.style.setProperty('--safe-area-inset-top', `${insets.top}px`)
    root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`)
    root.style.setProperty('--safe-area-inset-left', `${insets.left}px`)
    root.style.setProperty('--safe-area-inset-right', `${insets.right}px`)

    console.groupEnd()
  }

  /**
   * 监听窗口大小变化并更新状态
   */
  public async listenWindowResize() {
    this.clientAdapter.listenWindowResize((safeArea) => {
      this.mobileStore.updateSafeArea(safeArea)
      this.mitt.emit(RESIZE_UPDATE, {
        isFullScreen: this.mobileStore.isFullScreen,
        safeArea: safeArea
      })
    })
  }

  private async initState() {
    try {
      const insets = await this.getSafeArea()

      if (isAndroid()) {
        // 更新安全区域状态
        this.updateSafeAreaStyle(insets)
      }

      // 首次加载时需要更新安全区域状态
      this.mobileStore.updateSafeArea(insets)
      return
    } catch (error) {
      throw new Error(`[MobileClient] 获取安全区域出错 ${error}`)
    }
  }

  public subscribeResizeListener(callback: (data: ResizeEvent) => void) {
    this.mitt.on(RESIZE_UPDATE, callback)
  }

  public destroyResizeListener(callback: (data: ResizeEvent) => void) {
    this.mitt.off(RESIZE_UPDATE, callback)
  }

  public keyboardListener(
    showCallback: TKeyboardShowCallback,
    hideCallback: TKeyboardHideCallback
  ): KeyboardListenerResult {
    if (!this.clientAdapter || typeof this.clientAdapter.keyboardListener !== 'function') {
      throw new Error('[MobileClient] keyboardListener 无法初始化，未找到有效的适配器')
    }

    return this.clientAdapter.keyboardListener(showCallback, hideCallback)
  }
}

export let mobileClient!: MobileClient

export const initMobileClient = async () => {
  mobileClient = new MobileClient()
  await mobileClient.init()
}
