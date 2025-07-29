import { type } from '@tauri-apps/plugin-os'
import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export type SafeArea = {
  bottom: number
  left: number
  right: number
  top: number
}

export const useMobileStore = defineStore(StoresEnum.MOBILE, () => {
  const _envType = type()

  const envType = _envType

  const initBottomTabBarPosition = ref<DOMRect>({
    height: 0,
    width: 0,
    x: 0,
    y: 0,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    toJSON: () => {}
  })

  const bottomTabBarPosition = ref<DOMRect>({
    height: 0,
    width: 0,
    x: 0,
    y: 0,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    toJSON: () => {}
  })

  const safeArea = ref<SafeArea>({
    bottom: -1,
    left: -1,
    right: -1,
    top: -1
  })

  const updateSafeArea = (newSafeArea: SafeArea) => {
    safeArea.value = newSafeArea
    console.log('安全区域更新：', safeArea.value)
  }

  const updateTabBarPosition = (options: { newPosition: DOMRect; isInit: boolean }) => {
    bottomTabBarPosition.value = options.newPosition
    if (options.isInit) {
      console.log('位置状态初始化')
      initBottomTabBarPosition.value = options.newPosition
    }
  }

  return {
    safeArea,
    envType,
    updateSafeArea,
    updateTabBarPosition,
    bottomTabBarPosition,
    initBottomTabBarPosition
  }
})
