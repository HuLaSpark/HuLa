import { defineStore } from 'pinia'
import apis from '@/services/apis'
import type { EmojiItem } from '@/services/types'
import { useUserStore } from '@/stores/user'

export const useEmojiStore = defineStore('emoji', () => {
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
    const {
      data: { data }
    } = res
    emojiList.value = data
  }

  /**
   * 添加表情
   */
  const addEmoji = async (emojiUrl: string) => {
    const { uid } = userStore.userInfo
    if (!uid || !emojiUrl) return
    apis.addEmoji({ uid, expressionUrl: emojiUrl }).then((res) => {
      if (res.success) {
        window.$message.success('添加成功')
      }
    })
    await getEmojiList()
  }

  /**
   * 删除表情
   */
  const deleteEmoji = async (id: number) => {
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
