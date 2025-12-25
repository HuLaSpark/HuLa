import { MessageStatusEnum, MittEnum } from '@/enums'
import { sendMessageWithChannel, type SendMessagePayload } from '@/utils/MessageSender'
import { useChatStore } from '@/stores/chat'
import { useMitt } from '@/hooks/useMitt'

export type SendWithTrackingOptions = {
  tempMsgId: string
  payload: SendMessagePayload
  /** 是否在发送成功后更新会话最近活跃时间，默认 true */
  updateSessionActive?: boolean
  /** 是否在状态变更时滚动至底部，默认 true */
  scrollOnUpdate?: boolean
  onSuccess?: (payload: any) => void
  onError?: (msgId?: string) => void
}

export const useMessageSender = () => {
  const chatStore = useChatStore()

  const sendWithTracking = async (options: SendWithTrackingOptions) => {
    const { tempMsgId, payload, updateSessionActive = true, scrollOnUpdate = true, onSuccess, onError } = options

    await sendMessageWithChannel({
      data: payload,
      onSuccess: (response) => {
        chatStore.updateMsg({
          msgId: response?.oldMsgId ?? tempMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: response?.message?.id,
          body: response?.message?.body,
          timeBlock: response?.timeBlock
        })
        if (scrollOnUpdate) {
          useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
        }
        onSuccess?.(response)
      },
      onError: (msgId) => {
        chatStore.updateMsg({
          msgId: msgId || tempMsgId,
          status: MessageStatusEnum.FAILED
        })
        if (scrollOnUpdate) {
          useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
        }
        onError?.(msgId)
      }
    })

    if (updateSessionActive) {
      chatStore.updateSessionLastActiveTime(payload.roomId)
    }
  }

  return {
    sendWithTracking
  }
}
