import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useHistoryStore = defineStore(
  StoresEnum.HISTORY,
  () => {
    const emoji = ref<string[]>([])

    const setEmoji = (item: string[]) => {
      emoji.value = item
    }

    return {
      emoji,
      setEmoji
    }
  },
  {
    share: {
      enable: true
    }
  }
)
