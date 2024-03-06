import { defineStore } from 'pinia'

interface AlwaysOnTopData {
  isAlwaysOnTop: boolean
}

interface AlwaysOnTop {
  [key: string]: AlwaysOnTopData | boolean
}

export const alwaysOnTop = defineStore('alwaysOnTop', {
  state: (): AlwaysOnTop => ({}),
  actions: {
    setWindowTop(key: string, data: AlwaysOnTopData | boolean) {
      this.$state[key] = data
    },
    getWindowTop(key: string) {
      return this.$state[key]
    }
  },
  persist: true
})
