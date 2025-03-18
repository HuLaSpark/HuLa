import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useHistoryStore = defineStore(
  StoresEnum.HISTORY,
  () => {
    const emoji = ref<string[]>([])
    // 记录上次选择的表情选项卡索引
    const lastEmojiTabIndex = ref<number>(0)

    const setEmoji = (item: string[]) => {
      emoji.value = item
    }

    // 设置上次选择的表情选项卡索引
    const setLastEmojiTabIndex = (index: number) => {
      lastEmojiTabIndex.value = index
    }

    return {
      emoji,
      setEmoji,
      lastEmojiTabIndex,
      setLastEmojiTabIndex
    }
  },
  {
    share: {
      enable: true
    }
  }
)
