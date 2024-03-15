import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

interface AlwaysOnTopData {
  isAlwaysOnTop: boolean
}

interface AlwaysOnTop {
  [key: string]: AlwaysOnTopData | boolean
}

export const alwaysOnTop = defineStore(StoresEnum.ALWAYS_ON_TOP, {
  state: (): AlwaysOnTop => ({}),
  actions: {
    setWindowTop(key: string, data: AlwaysOnTopData | boolean) {
      this.$state[key] = data
    },
    getWindowTop(key: string) {
      return this.$state[key]
    }
  }
})
