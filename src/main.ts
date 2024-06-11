import { createApp } from 'vue'
import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import '@/services/webSocket'
import { pinia } from '@/stores'
import vResize from '@/directives/v-resize'
import vSlide from '@/directives/v-slide.ts'
import router from '@/router'
import App from '@/App.vue'
import { consolePrint } from '@/utils/Common.ts'

const app = createApp(App)
app.use(router).use(pinia).directive('resize', vResize).directive('slide', vSlide).mount('#app')
/**! 控制台打印项目版本信息(不需要可手动关闭)*/
consolePrint()
