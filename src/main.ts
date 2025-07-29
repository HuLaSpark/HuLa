import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { type } from '@tauri-apps/plugin-os'
import { getInsets } from 'tauri-plugin-safe-area-insets'
import App from '@/App.vue'
import { AppException } from '@/common/exception.ts'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import { pinia } from '@/stores'
import { SafeArea, useMobileStore } from '@/stores/mobile'

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

/**
 * 将安全区参数写入 CSS 变量中，用于覆盖 iOS 的 env() 变量在 Android 上无效的问题
 * 适用于 Naive UI、modal、message 等组件的安全区适配
 */
const updateSafeAreaStyle = (insets: SafeArea) => {
  const root = document.documentElement

  root.style.setProperty('--safe-area-inset-top', `${insets.top}px`)
  root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`)
  root.style.setProperty('--safe-area-inset-left', `${insets.left}px`)
  root.style.setProperty('--safe-area-inset-right', `${insets.right}px`)

  // ✅ 读取刚刚写入的实际值
  // const computed = getComputedStyle(root)
  // const top = computed.getPropertyValue('--safe-area-inset-top')
  // const bottom = computed.getPropertyValue('--safe-area-inset-bottom')
  // const left = computed.getPropertyValue('--safe-area-inset-left')
  // const right = computed.getPropertyValue('--safe-area-inset-right')

  // console.group('[SafeArea] CSS变量覆盖验证')
  // console.log('👆 --safe-area-inset-top:', top.trim())
  // console.log('👇 --safe-area-inset-bottom:', bottom.trim())
  // console.log('👈 --safe-area-inset-left:', left.trim())
  // console.log('👉 --safe-area-inset-right:', right.trim())
  console.groupEnd()
}

export const forceUpdateMessageTop = (topValue: number) => {
  // 获取所有符合条件的元素
  const messages = document.querySelectorAll('.n-message-container.n-message-container--top')

  messages.forEach((el) => {
    const dom = el as HTMLElement
    dom.style.top = `${topValue}px`
  })
}

const envType = type()

// 判断是移动环境时才做
if (envType === 'android') {
  // 使用立即执行的异步函数来处理 await
  ;(async () => {
    try {
      const mobileStore = useMobileStore()

      const insets = await getInsets()

      updateSafeAreaStyle(insets)

      mobileStore.updateSafeArea(insets)

      console.log('插件中获取的安全区域参数：', insets)

      // window.addEventListener('safeAreaChanged', (e) => {
      //   console.log('布局有变动：', e)
      // })
    } catch (error) {
      console.log('获取安全区域出错：', error)
    }
  })()
}
