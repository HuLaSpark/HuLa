import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { FriendItem, RequestFriendItem, SessionItem } from '@/services/types'
import { useChatStore } from '@/stores/chat'
import { clearQueue, readCountQueue } from '@/utils/ReadCountQueue.ts'
import { unreadCountManager } from '@/utils/UnreadCountManager'
import { markMsgRead } from '../utils/ImRequestUtils'

export const useGlobalStore = defineStore(
  StoresEnum.GLOBAL,
  () => {
    const chatStore = useChatStore()

    // 未读消息标记：好友请求未读数和新消息未读数
    const unReadMark = reactive<{
      newFriendUnreadCount: number
      newMsgUnreadCount: number
      newGroupUnreadCount: number
    }>({
      newFriendUnreadCount: 0,
      newGroupUnreadCount: 0,
      newMsgUnreadCount: 0
    })

    // 当前阅读未读列表状态
    const currentReadUnreadList = reactive<{ show: boolean; msgId: number | null }>({
      show: false,
      msgId: null
    })

    const currentSessionRoomId = ref('')
    // 当前会话信息：包含房间ID和房间类型
    const currentSession = computed((): SessionItem => {
      return chatStore.getSession(currentSessionRoomId.value)!
    })

    /** 当前选中的联系人信息 */
    const currentSelectedContact = ref<FriendItem | RequestFriendItem>()

    // 添加好友模态框信息 TODO: 虚拟列表添加好友有时候会不展示对应的用户信息
    const addFriendModalInfo = ref<{ show: boolean; uid?: string }>({
      show: false,
      uid: void 0
    })

    // 添加群聊模态框信息
    const addGroupModalInfo = ref<{ show: boolean; name?: string; avatar?: string; account?: string }>({
      show: false,
      name: '',
      avatar: '',
      account: ''
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

    /** 提示框显示状态 */
    const tipVisible = ref<boolean>(false)
    /** 系统托盘菜单显示的状态 */
    const isTrayMenuShow = ref<boolean>(false)

    // home窗口位置、宽高信息
    const homeWindowState = ref<{ width?: number; height?: number }>({
      width: 960,
      height: 720
    })

    // 设置提示框显示状态
    const setTipVisible = (visible: boolean) => {
      tipVisible.value = visible
    }

    // 设置home窗口位置、宽高信息
    const setHomeWindowState = (newState: { width: number; height: number }) => {
      // 验证窗口大小，如果小于最小限制，则使用默认值
      const MIN_WIDTH = 330
      const MIN_HEIGHT = 480
      const DEFAULT_WIDTH = 960
      const DEFAULT_HEIGHT = 720

      if (newState.width < MIN_WIDTH || newState.height < MIN_HEIGHT) {
        info(
          `[global] 窗口大小异常 (${newState.width}x${newState.height})，强制设置为默认值 (${DEFAULT_WIDTH}x${DEFAULT_HEIGHT})`
        )
        homeWindowState.value = {
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT
        }
      } else {
        homeWindowState.value = { ...homeWindowState.value, ...newState }
      }
    }

    // 更新全局未读消息计数
    const updateGlobalUnreadCount = () => {
      info('[global]更新全局未读消息计数')
      // 使用统一的计数管理器，避免重复逻辑
      unreadCountManager.calculateTotal(chatStore.sessionList, unReadMark)
    }

    // 监听当前会话变化，添加防重复触发逻辑
    watch(currentSessionRoomId, async (val, oldVal) => {
      const webviewWindowLabel = WebviewWindow.getCurrent()
      if (webviewWindowLabel.label !== 'home' && webviewWindowLabel.label !== '/mobile/message') {
        return
      }
      // 只有当房间ID真正发生变化时才执行操作
      if (currentSession.value.unreadCount > 0 && (!oldVal || val! !== oldVal)) {
        info(`[global]当前会话发生实际变化: ${oldVal} -> ${val}`)
        // 清理已读数查询队列
        clearQueue()
        // 延攱1秒后开始查询已读数
        setTimeout(readCountQueue, 1000)
        // 标记该房间的消息为已读
        markMsgRead(val! || '1')
        // 更新会话的已读状态
        chatStore.markSessionRead(val! || '1')
      }
    })

    const updateCurrentSessionRoomId = (id: string) => {
      currentSessionRoomId.value = id
    }

    return {
      unReadMark,
      currentSession,
      addFriendModalInfo,
      addGroupModalInfo,
      currentSelectedContact,
      currentReadUnreadList,
      createGroupModalInfo,
      tipVisible,
      isTrayMenuShow,
      homeWindowState,
      setTipVisible,
      updateGlobalUnreadCount,
      setHomeWindowState,
      updateCurrentSessionRoomId,
      currentSessionRoomId
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
