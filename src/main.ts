import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getInsets } from 'tauri-plugin-safe-area-insets'
import App from '@/App.vue'
import { AppException } from '@/common/exception.ts'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import { type OsType, type } from '@tauri-apps/plugin-os'
import { pinia } from '@/stores'
import { type SafeArea, useMobileStore } from '@/stores/mobile'

if (WebviewWindow.getCurrent().label === 'home') {
  import('@/services/webSocket')
}

const app = createApp(App)
app.use(router).use(pinia).directive('resize', vResize).directive('slide', vSlide).mount('#app')
app.config.errorHandler = (err) => {
  if (err instanceof AppException) {
    window.$message.error(err.message)
    return
  }
  throw err
}
if (process.env.NODE_ENV === 'development') {
  import('@/utils/Console.ts').then((module) => {
    /**! 控制台打印项目版本信息(不需要可手动关闭)*/
    module.consolePrint()
  })
}

export const forceUpdateMessageTop = (topValue: number) => {
  // 获取所有符合条件的元素
  const messages = document.querySelectorAll('.n-message-container.n-message-container--top')

  messages.forEach((el) => {
    const dom = el as HTMLElement
    dom.style.top = `${topValue}px`
  })
}

/**
 * 将安全区参数写入 CSS 变量中，用于覆盖 iOS 的 env() 变量在 Android 上无效的问题
 * 适用于 Naive UI、modal、message 等组件的安全区适配
 *
 * @param {SafeArea} insets - 安全区域边距，包括 top/bottom/left/right 四个方向的数值（单位：px）
 */
const updateSafeAreaStyle = (insets: SafeArea) => {
  const root = document.documentElement

  root.style.setProperty('--safe-area-inset-top', `${insets.top}px`)
  root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`)
  root.style.setProperty('--safe-area-inset-left', `${insets.left}px`)
  root.style.setProperty('--safe-area-inset-right', `${insets.right}px`)

  console.groupEnd()
}

/**
 * 根据当前操作系统类型，获取设备的安全区域信息
 *
 * Android 使用原生插件 `tauri-plugin-safe-area-insets` 获取边距
 * iOS 由于 env() 在安卓无效，通过读取 CSS 变量来获取样式值
 *
 * @param {OsType} envType - 当前运行环境的操作系统类型 ('android' 或 'ios')
 * @returns {Promise<SafeArea>} - 返回一个包含安全边距的 SafeArea 对象
 * @throws {Error} - 如果当前环境不支持安全区域获取则抛出错误
 */
const getSafeArea = async (envType: OsType): Promise<SafeArea> => {
  if (envType === 'android') {
    const insets = await getInsets()
    return insets
  } else if (envType === 'ios') {
    //  获取Document的DOM
    const rootStyle = getComputedStyle(document.documentElement)

    // 手动获取其安全区域值
    const insets: SafeArea = {
      top: parseInt(rootStyle.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(rootStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(rootStyle.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(rootStyle.getPropertyValue('--safe-area-inset-right') || '0')
    }

    return insets
  } else {
    throw new Error(`当前环境不支持获取安全区域 ${envType}`)
  }
}

/**
 * 监听窗口大小变化并更新状态
 *
 * 会根据当前平台动态采用不同的监听方案：
 * - 首选 ResizeObserver（性能更优）
 * - Android 降级使用 safeAreaChanged 自定义事件
 * - iOS 降级使用 resize 事件
 *
 * @param {OsType} envType - 当前运行环境的操作系统类型 ('android' 或 'ios')
 * @throws {Error} - 如果环境类型无法识别则抛出异常
 */
const listenWindowResize = (envType: OsType) => {
  const mobileStore = useMobileStore()

  if (typeof window.ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(async () => {
      console.log('[ResizeObserver] 窗口大小更新')
      // 这里不需要监听整个窗口的大小，只需要监听它改变了就行
      const insets = await getSafeArea(envType)
      mobileStore.updateSafeArea(insets)
    })
    resizeObserver.observe(document.documentElement)
    return
  } else {
    // 这里是在找不到ResizeObserver时的向下兼容操作

    if (envType === 'android') {
      // 如果没有ResizeObserver，则监听safeAreaChanged事件
      window.addEventListener('safeAreaChanged', (event) => {
        console.log('[safeAreaChanged] 窗口大小更新')
        const customEvent = event as CustomEvent<SafeArea>
        mobileStore.updateSafeArea(customEvent.detail)
      })
    } else if (envType === 'ios') {
      window.addEventListener('resize', async () => {
        console.log('[resize] 窗口大小更新')
        const insets = await getSafeArea(envType)
        mobileStore.updateSafeArea(insets)
      })
    } else {
      throw new Error(`当前环境不支持获取安全区域 ${envType}`)
    }
  }
}

// 使用立即执行的异步函数来处理异步，避免ios死机问题
;(async () => {
  try {
    const envType = type()

    if (envType !== 'ios' && envType !== 'android') return

    const mobileStore = useMobileStore()

    const insets = await getSafeArea(envType)

    // 判断环境是安卓时才覆盖安全区域的自定义样式，如果是ios则在global/mobile.scss里已经全局覆盖了
    if (envType === 'android') {
      // 更新安全区域状态
      updateSafeAreaStyle(insets)
    }

    // 首次加载时需要更新安全区域状态
    mobileStore.updateSafeArea(insets)

    listenWindowResize(envType)
  } catch (error) {
    console.log('获取安全区域出错：', error)
  }
})()
