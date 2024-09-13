import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

interface AlwaysOnTopState {
  [key: string]: boolean
}

export const useAlwaysOnTopStore = defineStore(StoresEnum.ALWAYS_ON_TOP, () => {
  const alwaysOnTop = ref<AlwaysOnTopState>({})

  const setWindowTop = (key: string, data: boolean) => {
    alwaysOnTop.value[key] = data
  }

  const getWindowTop = (key: string) => {
    return alwaysOnTop.value[key]
  }

  return {
    alwaysOnTop,
    setWindowTop,
    getWindowTop
  }
})
