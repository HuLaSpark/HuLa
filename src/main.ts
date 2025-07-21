import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import '@/services/webSocket'
import { pinia } from '@/stores'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import App from '@/App.vue'
import { AppException } from '@/common/exception.ts'
import { type } from '@tauri-apps/plugin-os'
import { useMobileStore } from '@/stores/mobile'
import { getInsets } from 'tauri-plugin-safe-area-insets'

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

const envType = type()

// 判断是移动环境时才做
if (envType === 'android') {
  try {
    const mobileStore = useMobileStore()
    const insets = await getInsets()
    mobileStore.updateSafeArea(insets)
    console.log('插件中获取的安全区域参数：', insets)
  } catch (error) {
    console.log('获取安全区域出错：', error)
  }
}
