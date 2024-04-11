import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const history = defineStore(StoresEnum.HISTORY, {
  state: (): STO.History => ({
    emoji: []
  }),
  actions: {
    setEmoji(item: string[]) {
      this.emoji = item
    }
  },
  share: {
    enable: true
  }
})
