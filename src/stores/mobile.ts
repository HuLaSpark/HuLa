import { type } from '@tauri-apps/plugin-os'
import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

type SafeArea = {
  bottom: number
  left: number
  right: number
  top: number
}

export const useMobileStore = defineStore(StoresEnum.MOBILE, () => {
  const _envType = type()

  const envType = _envType

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

  return { safeArea, envType, updateSafeArea }
})
