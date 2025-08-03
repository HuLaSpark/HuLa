import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import App from '@/App.vue'
import { AppException } from '@/common/exception.ts'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import { pinia } from '@/stores'
import { type } from '@tauri-apps/plugin-os'

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
  // 只在移动端(iOS和Android)执行
  if (type() !== 'ios' && type() !== 'android') return

  // 获取所有符合条件的元素
  const messages = document.querySelectorAll('.n-message-container.n-message-container--top')

  messages.forEach((el) => {
    const dom = el as HTMLElement
    dom.style.top = `${topValue}px`
  })
}

window.addEventListener('keyboardDidShow', (e) => {
  console.log('键盘弹出，高度：', e)
})

window.addEventListener('keyboardDidHide', () => {
  console.log('键盘隐藏')
})

if (type() === 'ios' || type() === 'android') {
  import('@/mobile/mobile-client/MobileClient').then((module) => {
    module.initMobileClient()
  })
}
