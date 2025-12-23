import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import TlbsMap from 'tlbs-map-vue'
import { setupI18n } from '@/services/i18n'
import { AppException } from '@/common/exception.ts'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import { pinia } from '@/stores'
import { initializePlatform, isIOS, isMobile } from '@/utils/PlatformConstants'
import { startWebVitalObserver } from '@/utils/WebVitalsObserver'
import { invoke } from '@tauri-apps/api/core'
import App from '@/App.vue'

initializePlatform()
startWebVitalObserver()

if (isIOS()) {
  invoke('request_ios_badge_authorization').catch((error) => {
    console.warn('[HuLaBadge] 请求 iOS 角标权限失败', error)
  })
}

import('@/services/webSocketAdapter')

if (process.env.NODE_ENV === 'development') {
  import('@/utils/Console.ts').then((module) => {
    /**! 控制台打印项目版本信息(不需要可手动关闭)*/
    module.consolePrint()
  })

  if (isMobile()) {
    import('eruda').then((module) => {
      const eruda = 'default' in module ? module.default : module
      eruda.init()
    })
  }
}

export const forceUpdateMessageTop = (topValue: number) => {
  // 获取所有符合条件的元素
  const messages = document.querySelectorAll('.n-message-container.n-message-container--top')

  messages.forEach((el) => {
    const dom = el as HTMLElement
    dom.style.top = `${topValue}px`
  })
}

if (isMobile()) {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setup)
  } else {
    setup()
  }
}

async function setup() {
  await invoke('set_complete', { task: 'frontend' })
}

const app = createApp(App)
app
  .use(router)
  .use(pinia)
  .use(TlbsMap)
  .use(setupI18n)
  .directive('resize', vResize)
  .directive('slide', vSlide)
  .mount('#app')
app.config.errorHandler = (err) => {
  if (err instanceof AppException) {
    window.$message.error(err.message)
    return
  }
  throw err
}
