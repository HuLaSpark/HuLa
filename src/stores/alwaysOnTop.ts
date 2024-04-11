import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const alwaysOnTop = defineStore(StoresEnum.ALWAYS_ON_TOP, {
  state: (): STO.AlwaysOnTop => ({}),
  actions: {
    setWindowTop(key: string, data: boolean) {
      this.$state[key] = data
    },
    getWindowTop(key: string) {
      return this.$state[key]
    }
  }
})
