import { computed } from 'vue'
import { MessageStatusEnum } from '@/enums'
import type { MessageType } from '@/services/types'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'

/**
 * Mock 消息 Hook
 */
export const useMockMessage = () => {
  const globalStore = useGlobalStore()
  // 获取本地存储的用户信息
  const userInfo = computed(() => JSON.parse(localStorage.getItem('user') || '{}'))

  /**
   * 模拟消息生成
   * @param type 消息类型
   * @param body 消息体
   * @param messageMarks 互动信息
   * @returns 服务器格式消息
   */
  const mockMessage = (type: number, body: any, messageMarks?: any): MessageType => {
    const currentTimeStamp: number = Date.now()
    const random: number = Math.floor(Math.random() * 15)
    // 唯一id 后五位时间戳+随机数
    const uniqueId: string = String(currentTimeStamp + random).slice(-7)
    const { uid = 0, name: username = '', avatar = '' } = userInfo.value || {}
    const groupStore = useGroupStore()

    return {
      fromUser: {
        username,
        uid,
        avatar,
        locPlace: groupStore.getUserInfo(uid)?.locPlace || 'xx'
      },
      message: {
        id: uniqueId,
        roomId: globalStore.currentSession!.roomId,
        sendTime: Number(currentTimeStamp),
        type: type,
        body,
        messageMarks: {
          likeCount: 0,
          userLike: 0,
          dislikeCount: 0,
          userDislike: 0,
          ...messageMarks
        },
        status: MessageStatusEnum.PENDING
      },
      sendTime: currentTimeStamp,
      loading: true
    }
  }

  return {
    mockMessage
  }
}
