import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

export const pinia = createPinia()
// 默认开启持久化存储
pinia.use(
  createPersistedState({
    auto: true
  })
)
