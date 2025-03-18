import { defineStore } from 'pinia'
import apis from '@/services/apis'
import type { EmojiItem } from '@/services/types'
import { useUserStore } from '@/stores/user'
import { StoresEnum } from '@/enums'

export const useEmojiStore = defineStore(StoresEnum.EMOJI, () => {
  const isLoading = ref(false) // 是否正在加载
  const userStore = useUserStore()
  const emojiList = ref<EmojiItem[]>([])

  /**
   * 获取我的全部表情
   */
  const getEmojiList = async () => {
    isLoading.value = true
    const res = await apis.getEmoji({ uid: userStore.userInfo.uid! }).catch(() => {
      isLoading.value = false
    })
    if (!res) return
    emojiList.value = res
  }

  /**
   * 添加表情
   */
  const addEmoji = async (emojiUrl: string) => {
    const { uid } = userStore.userInfo
    if (!uid || !emojiUrl) return
    apis.addEmoji({ expressionUrl: emojiUrl }).then((res) => {
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
    await apis.deleteEmoji({ id })
    await getEmojiList()
  }

  return {
    emojiList,
    addEmoji,
    getEmojiList,
    deleteEmoji
  }
})
