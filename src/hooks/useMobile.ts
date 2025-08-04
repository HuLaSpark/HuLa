import { onMounted, onUnmounted } from 'vue'
import { type } from '@tauri-apps/plugin-os'
import { useMobileStore } from '@/stores/mobile'
import type { IKeyboardDidShowDetail } from '@/mobile/mobile-client/interface/adapter'

export function useMobile() {
  console.log('即将初始化')
  onMounted(async () => {
    if (type() === 'ios' || type() === 'android') {
      const module = await import('@/mobile/mobile-client/MobileClient') // 这个module不能直接解构，否则会找不到模块中的方法

      const mobileStore = useMobileStore()

      await module.initMobileClient()

      console.log('初始化完成')

      const showKeyboard = (detail: IKeyboardDidShowDetail) => {
        console.log('键盘出现了')
        mobileStore.updateKeyboardDetail(detail)
        mobileStore.updateKeyboardState(true)
      }

      const hideKeyboard = () => {
        mobileStore.updateKeyboardState(false)
      }

      const { removeHideFunction, removeShowFunction } = module.mobileClient.keyboardListener(
        showKeyboard,
        hideKeyboard
      )

      onUnmounted(() => {
        removeShowFunction()
        removeHideFunction()
      })
    }
  })
}
