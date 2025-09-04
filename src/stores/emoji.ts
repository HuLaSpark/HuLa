import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { EmojiItem } from '@/services/types'
import { useUserStore } from '@/stores/user'
import * as imRequestUtils from '@/utils/ImRequestUtils'

export const useEmojiStore = defineStore(StoresEnum.EMOJI, () => {
  const isLoading = ref(false) // 是否正在加载
  const userStore = useUserStore()
  const emojiList = ref<EmojiItem[]>([])

  /**
   * 获取我的全部表情
   */
  const getEmojiList = async () => {
    isLoading.value = true
    const res = await imRequestUtils.getEmoji().catch(() => {
      isLoading.value = false
    })
    if (!res) return
    emojiList.value = res
  }

  /**
   * 添加表情
   */
  const addEmoji = async (emojiUrl: string) => {
    const { uid } = userStore.userInfo!
    if (!uid || !emojiUrl) return
    imRequestUtils.addEmoji({ expressionUrl: emojiUrl }).then((res) => {
      if (res) {
        window.$message.success('添加表情成功')
      }
    })
    await getEmojiList()
  }

  /**
   * 删除表情
   */
  const deleteEmoji = async (id: string) => {
    if (!id) return
    await imRequestUtils.deleteEmoji({ id })
    await getEmojiList()
  }

  return {
    emojiList,
    addEmoji,
    getEmojiList,
    deleteEmoji
  }
})
