import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { type } from '@tauri-apps/plugin-os'

type SafeArea = {
  bottom: number
  left: number
  right: number
  top: number
}

export const useMobileStore = defineStore(StoresEnum.MOBILE, () => {
  const _envType = type()

  const envType = _envType

  const bottomTabBarPosition = ref<DOMRect>({
    height: 0,
    width: 0,
    x: 0,
    y: 0,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    toJSON: function () {}
  })

  const safeArea = ref<SafeArea>({
    bottom: -1,
    left: -1,
    right: -1,
    top: -1
  })

  const updateSafeArea = (newSafeArea: SafeArea) => {
    safeArea.value = newSafeArea
    console.log('写入缓存：', safeArea.value)
  }

  const updateBottomTabBarPosition = (newPosition: DOMRect) => {
    bottomTabBarPosition.value = newPosition
    console.log('位置更新：', bottomTabBarPosition.value)
  }

  return { safeArea, envType, updateSafeArea, updateBottomTabBarPosition, bottomTabBarPosition }
})
