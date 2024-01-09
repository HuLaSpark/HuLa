import { createApp } from 'vue'
import 'uno.css'
import '@unocss/reset/eric-meyer.css' // unocss提供的浏览器默认样式重置
import { pinia } from '@/stores'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from '@/App.vue'

pinia.use(piniaPluginPersistedstate)
const app = createApp(App)
app.use(pinia).mount('#app')
