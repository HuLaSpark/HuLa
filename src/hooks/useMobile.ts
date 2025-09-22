import { onMounted, onUnmounted } from 'vue'
import type { IKeyboardDidShowDetail } from '#/mobile-client/interface/adapter'
import { useMobileStore } from '@/stores/mobile'
import { isMobile } from '@/utils/PlatformConstants'

export const useMobile = () => {
  const mobileStore = useMobileStore()

  let removeShowFunction: () => void = () => {}
  let removeHideFunction: () => void = () => {}
  let removeForegroundFunction: () => void = () => {}
  let removeBackgroundFunction: () => void = () => {}

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

      // 前后台监听（新增）
      const lifecycleResult = module.mobileClient.appLifecycleListener(
        () => {
          console.log('App 回到前台')
          mobileStore.updateAppForeground?.(true) // 这里假设 store 有这个方法
        },
        () => {
          console.log('App 进入后台')
          mobileStore.updateAppForeground?.(false)
        }
      )
      removeForegroundFunction = lifecycleResult.removeForegroundFunction
      removeBackgroundFunction = lifecycleResult.removeBackgroundFunction
    }
  })

  onUnmounted(() => {
    removeShowFunction?.()
    removeHideFunction?.()
    removeForegroundFunction?.()
    removeBackgroundFunction?.()
  })
}
