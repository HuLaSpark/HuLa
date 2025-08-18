import { getInsets } from 'tauri-plugin-safe-area-insets'
import type { SafeArea } from '~/src/stores/mobile'
import type {
  IKeyboardDidShowDetail,
  IMobileClientAdapter,
  KeyboardListenerResult,
  TKeyboardHideCallback,
  TKeyboardShowCallback
} from './interface/adapter'

export class AndroidAdapter implements IMobileClientAdapter {
  keyboardListener(showCallback: TKeyboardShowCallback, hideCallback: TKeyboardHideCallback): KeyboardListenerResult {
    const showHandler = (e: Event) => {
      const detail = (e as CustomEvent<IKeyboardDidShowDetail>).detail
      showCallback(detail)
      console.log('[AndroidAdapter] 键盘弹出:', detail)
    }

    const hideHandler = () => {
      hideCallback()
      console.log('[AndroidAdapter] 键盘隐藏')
    }

    window.addEventListener('keyboardDidShow', showHandler)
    window.addEventListener('keyboardDidHide', hideHandler)

    const removeShowFunction = () => {
      window.removeEventListener('keyboardDidShow', showHandler)
    }

    const removeHideFunction = () => {
      window.removeEventListener('keyboardDidHide', hideHandler)
    }

    return {
      removeShowFunction,
      removeHideFunction
    }
  }

  async getSafeArea(): Promise<SafeArea> {
    try {
      return await getInsets()
    } catch (error) {
      throw new Error(`[AndroidAdapter] ${error}`)
    }
  }

  /**
   * 监听窗口大小变化并更新状态
   *
   * 会根据当前平台动态采用不同的监听方案：
   * - 首选 ResizeObserver（性能更优）
   */
  public async listenWindowResize(callback: (safeArea: SafeArea) => void) {
    if (typeof window.ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(async () => {
        console.log('[AndroidAdapter] 窗口大小更新')
        // 这里不需要监听整个窗口的大小，只需要监听它改变了就行
        const insets = await this.getSafeArea()
        callback.call(this, insets)
      })
      resizeObserver.observe(document.documentElement)
      return
    } else {
      // 这里是在找不到ResizeObserver时的向下兼容操作
      window.addEventListener('resize', async () => {
        console.log('[AndroidAdapter] 窗口大小更新')
        const insets = await this.getSafeArea()
        callback.call(this, insets)
      })
    }
  }
}
