import { defineStore } from 'pinia'
import { RoomTypeEnum } from '@/enums'
import { useChatStore } from '@/stores/chat'
import type { ContactItem, RequestFriendItem } from '@/services/types'
import { clearQueue, readCountQueue } from '@/utils/ReadCountQueue.ts'
import apis from '@/services/apis'
import { invoke } from '@tauri-apps/api/core'

export const useGlobalStore = defineStore(
  'global',
  () => {
    const chatStore = useChatStore()

    // 未读消息标记：好友请求未读数和新消息未读数
    const unReadMark = reactive<{ newFriendUnreadCount: number; newMsgUnreadCount: number }>({
      newFriendUnreadCount: 0,
      newMsgUnreadCount: 0
    })

    // 当前阅读未读列表状态
    const currentReadUnreadList = reactive<{ show: boolean; msgId: number | null }>({
      show: false,
      msgId: null
    })

    // 当前会话信息：包含房间ID和房间类型
    const currentSession = reactive<{ roomId: number; type: RoomTypeEnum }>({
      roomId: 1,
      type: RoomTypeEnum.GROUP
    })

    /** 当前选中的联系人信息 */
    const currentSelectedContact = ref<ContactItem | RequestFriendItem>()

    // 添加好友模态框信息
    const addFriendModalInfo = reactive<{ show: boolean; uid?: number }>({
      show: false,
      uid: void 0
    })

    // 创建群聊模态框信息
    const createGroupModalInfo = reactive<{
      show: boolean
      isInvite: boolean // 是否为邀请模式
      selectedUid: number[] // 选中的用户ID列表
    }>({
      show: false,
      isInvite: false,
      selectedUid: []
    })

    // 提示框显示状态
    const tipVisible = ref<boolean>(false)

    // 更新全局未读消息计数
    const updateGlobalUnreadCount = async () => {
      // 计算所有会话的未读消息总数
      const totalUnread = chatStore.sessionList.reduce((total, session) => {
        return total + (session.unreadCount || 0)
      }, 0)
      unReadMark.newMsgUnreadCount = totalUnread
      await invoke('set_badge_count', { count: totalUnread > 0 ? totalUnread : null })
    }

    // 监听当前会话变化
    watch(currentSession, (val) => {
      // 清理已读数查询队列
      clearQueue()
      // 延迟1秒后开始查询已读数
      setTimeout(readCountQueue, 1000)
      // 标记该房间的消息为已读
      apis.markMsgRead({ roomId: val.roomId })
      // 更新会话的已读状态
      chatStore.markSessionRead(val.roomId)
      // 更新全局未读计数
      updateGlobalUnreadCount()
    })

    // 设置提示框显示状态
    const setTipVisible = (visible: boolean) => {
      tipVisible.value = visible
    }

    return {
      unReadMark,
      currentSession,
      addFriendModalInfo,
      currentSelectedContact,
      currentReadUnreadList,
      createGroupModalInfo,
      tipVisible,
      setTipVisible,
      updateGlobalUnreadCount
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
