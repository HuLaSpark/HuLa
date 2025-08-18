import type { SafeArea } from '~/src/stores/mobile'
import type {
  IKeyboardDidShowDetail,
  IMobileClientAdapter,
  KeyboardListenerResult,
  TKeyboardHideCallback,
  TKeyboardShowCallback
} from './interface/adapter'

export class IosAdapter implements IMobileClientAdapter {
  // TODO 着个没测试过，需要测试才行
  keyboardListener(showCallback: TKeyboardShowCallback, hideCallback: TKeyboardHideCallback): KeyboardListenerResult {
    const showHandler = (e: Event) => {
      const detail = (e as CustomEvent<IKeyboardDidShowDetail>).detail
      showCallback(detail)
      console.log('[IosAdapter] 键盘弹出:', detail)
    }

    const hideHandler = () => {
      hideCallback()
      console.log('[IosAdapter] 键盘隐藏')
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
      // 判断环境是安卓时才覆盖安全区域的自定义样式，如果是ios则在global/mobile.scss里已经全局覆盖了

      //  获取Document的DOM
      const rootStyle = getComputedStyle(document.documentElement)

      // 手动获取其安全区域值
      const insets: SafeArea = {
        top: parseInt(rootStyle.getPropertyValue('--safe-area-inset-top') || '0', 10),
        bottom: parseInt(rootStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
        left: parseInt(rootStyle.getPropertyValue('--safe-area-inset-left') || '0', 10),
        right: parseInt(rootStyle.getPropertyValue('--safe-area-inset-right') || '0', 10)
      }

      return insets
    } catch (error) {
      throw new Error(`[IosAdapter] ${error}`)
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
        console.log('[IosAdapter] 窗口大小更新')
        // 这里不需要监听整个窗口的大小，只需要监听它改变了就行
        const insets = await this.getSafeArea()
        callback.call(this, insets)
      })
      resizeObserver.observe(document.documentElement)
      return
    } else {
      // 这里是在找不到ResizeObserver时的向下兼容操作
      window.addEventListener('resize', async () => {
        console.log('[IosAdapter] 窗口大小更新')
        const insets = await this.getSafeArea()
        callback.call(this, insets)
      })
    }
  }
}
