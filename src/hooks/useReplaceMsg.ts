import { useUserStore } from '@/stores/user'
import type { MessageType } from '@/services/types'
import { MsgEnum, RoomTypeEnum } from '@/enums'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { useUserInfo } from '@/hooks/useCached.ts'

/**
 * 用于处理消息内容展示的hook，包括@提醒和撤回消息处理
 */
export const useReplaceMsg = () => {
  const userStore = useUserStore()

  /**
   * 检查单条消息是否@当前用户
   * @param message 消息对象
   * @returns 是否@当前用户
   */
  const checkMessageAtMe = (message: MessageType) => {
    if (!message?.message?.body?.atUidList || !userStore.userInfo.uid) {
      return false
    }

    // 确保类型一致的比较
    return message.message.body.atUidList.some((atUid: string) => String(atUid) === String(userStore.userInfo.uid))
  }

  /**
   * 检查消息是否@当前用户及是否在未读范围内
   * @param roomId 房间ID
   * @param roomType 房间类型
   * @param currentRoomId 当前激活的房间ID
   * @param messages 消息列表
   * @param unreadCount 未读消息数量
   * @returns 是否有人@当前用户
   */
  const checkRoomAtMe = (
    roomId: string,
    roomType: RoomTypeEnum,
    currentRoomId: string,
    messages: MessageType[],
    unreadCount: number = 0
  ) => {
    // 仅在群聊且不是当前会话时才考虑@提醒
    if (roomType !== RoomTypeEnum.GROUP || roomId === currentRoomId) {
      return false
    }

    // 过滤出@当前用户的消息
    const messagesWithAt = messages.filter(checkMessageAtMe)

    // 检查是否有@我的消息以及是否在未读范围内
    return messagesWithAt.some((msg) => messages.indexOf(msg) >= messages.length - (unreadCount || 0))
  }

  /**
   * 获取带有@提醒标记的消息内容
   * @param isAtMe 是否@当前用户
   * @param content 原始消息内容
   * @returns 带有@提醒标记的消息内容
   */
  const getAtMeContent = (isAtMe: boolean, content: string) => {
    if (!isAtMe) return content

    const atPrefix = '<span class="text-#d5304f mr-4px">[有人@我]</span>'
    return `${atPrefix}${content}`
  }

  /**
   * 处理撤回消息显示逻辑
   * @param message 消息对象
   * @param roomType 房间类型
   * @param userName 发送消息用户的名称
   * @returns 格式化后的撤回消息文本
   */
  const formatRecallMessage = (message: MessageType, roomType: RoomTypeEnum, userName: string) => {
    const { userUid } = useCommon()

    if (roomType === RoomTypeEnum.GROUP) {
      return `${userName}:撤回了一条消息`
    } else {
      return message.fromUser.uid === userUid.value ? '你撤回了一条消息' : '对方撤回了一条消息'
    }
  }

  /**
   * 获取消息发送者的用户名
   * @param message 消息对象
   * @param defaultName 默认名称（可选）
   * @returns 发送者用户名
   */
  const getMessageSenderName = (message: MessageType, defaultName: string = '') => {
    if (!message?.fromUser?.uid) return defaultName
    return useUserInfo(message.fromUser.uid).value.name || defaultName
  }

  /**
   * 处理消息内容，包括撤回消息和@提醒
   * @param message 消息对象
   * @param roomType 房间类型
   * @param userName 发送消息用户的名称（可选，如果不提供会自动从消息中提取）
   * @param isAtMe 是否有人@我
   * @returns 格式化后的消息内容
   */
  const formatMessageContent = (
    message: MessageType,
    roomType: RoomTypeEnum,
    userName: string = '',
    isAtMe: boolean
  ) => {
    // 如果没有提供用户名，自动从消息中获取
    const senderName = userName || getMessageSenderName(message)
    // 判断是否是撤回消息
    if (message.message?.type === MsgEnum.RECALL) {
      return formatRecallMessage(message, roomType, senderName)
    }

    // 正常消息，处理内容
    const messageContent = renderReplyContent(
      senderName,
      message.message?.type,
      message.message?.body?.content || message.message?.body,
      roomType
    ) as string

    // 处理@提醒
    return getAtMeContent(isAtMe, messageContent)
  }

  return {
    checkMessageAtMe,
    checkRoomAtMe,
    getAtMeContent,
    formatRecallMessage,
    formatMessageContent,
    getMessageSenderName
  }
}
