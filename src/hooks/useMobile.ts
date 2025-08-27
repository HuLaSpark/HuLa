import { onMounted, onUnmounted } from 'vue'
import type { IKeyboardDidShowDetail } from '#/mobile-client/interface/adapter'
import { useMobileStore } from '@/stores/mobile'
import { isMobile } from '@/utils/PlatformConstants'

export const useMobile = () => {
  const mobileStore = useMobileStore()

  let removeShowFunction: () => void = () => {}
  let removeHideFunction: () => void = () => {}

  onMounted(async () => {
    if (isMobile()) {
      const module = await import('#/mobile-client/MobileClient')

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

      const result = module.mobileClient.keyboardListener(showKeyboard, hideKeyboard)
      removeShowFunction = result.removeShowFunction
      removeHideFunction = result.removeHideFunction
    }
  })

  onUnmounted(() => {
    removeShowFunction?.()
    removeHideFunction?.()
  })
}
