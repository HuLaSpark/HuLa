import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import TlbsMap from 'tlbs-map-vue'
import { initMobileClient } from '#/mobile-client/MobileClient'
import App from '@/App.vue'
import { AppException } from '@/common/exception.ts'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import { pinia } from '@/stores'
import { initializePlatform } from '@/utils/PlatformConstants'
import { invoke } from '@tauri-apps/api/core'

initializePlatform()

const app = createApp(App)
app.use(router).use(pinia).use(TlbsMap).directive('resize', vResize).directive('slide', vSlide).mount('#app')
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

initMobileClient()

// Effectively a JavaScript main function
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', setup)
} else {
  // DOMContentLoaded 已经触发，直接执行
  setup()
}

const hideInitialSplash = () => {
  const splash = document.getElementById('initial-splash')
  if (!splash) {
    return
  }

  splash.classList.add('initial-splash--hide')
  splash.addEventListener(
    'transitionend',
    () => {
      splash.remove()
    },
    { once: true }
  )
}

// Setup function
async function setup() {
  // Set the frontend task as being completed
  console.log('set_complete frontend')
  await import('@/services/webSocketAdapter')
  await invoke('set_complete', { task: 'frontend' })
  hideInitialSplash()
  const router = useRouter()
  router.push('/mobile/login')
}
