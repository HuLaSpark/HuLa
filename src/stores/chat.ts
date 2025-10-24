import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import { ErrorType } from '@/common/exception'
import { type MessageStatusEnum, MsgEnum, RoomTypeEnum, StoresEnum, TauriCommand } from '@/enums'
import type { MarkItemType, MessageType, RevokedMsgType, SessionItem } from '@/services/types'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useUserStore } from '@/stores/user.ts'
import { getSessionDetail } from '@/utils/ImRequestUtils'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { unreadCountManager } from '@/utils/UnreadCountManager'

type RecalledMessage = {
  messageId: string
  content: string
  recallTime: number
  originalType: MsgEnum
}

// 定义每页加载的消息数量
export const pageSize = 20

// 撤回消息的过期时间
const RECALL_EXPIRATION_TIME = 2 * 60 * 1000 // 2分钟，单位毫秒

// // 定义消息数量阈值
// const MESSAGE_THRESHOLD = 120
// // 定义保留的最新消息数量
// const KEEP_MESSAGE_COUNT = 60

// 创建src/workers/timer.worker.ts
const timerWorker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url))

// 添加错误处理
timerWorker.onerror = (error) => {
  console.error('[Worker Error]', error)
}

export const useChatStore = defineStore(
  StoresEnum.CHAT,
  () => {
    const route = useRoute()
    // const router = useRouter()
    const userStore = useUserStore()
    const globalStore = useGlobalStore()
    const groupStore = useGroupStore()

    // 会话列表
    const sessionList = ref<SessionItem[]>([])
    // 会话列表的加载状态
    const sessionOptions = reactive({ isLast: false, isLoading: false, cursor: '' })

    // 存储所有消息的Record
    const messageMap = reactive<Record<string, Record<string, MessageType>>>({})
    // 消息加载状态
    const messageOptions = reactive<Record<string, { isLast: boolean; isLoading: boolean; cursor: string }>>({})

    // 回复消息的映射关系
    const replyMapping = reactive<Record<string, Record<string, string[]>>>({})
    // 存储撤回的消息内容和时间
    const recalledMessages = reactive<Record<string, RecalledMessage>>({})
    // 存储每条撤回消息的过期定时器
    const expirationTimers: Record<string, boolean> = {}
    const isMsgMultiChoose = ref<boolean>(false)
    const msgMultiChooseMode = ref<'normal' | 'forward'>('normal')

    // 当前聊天室的消息Map计算属性
    const currentMessageMap = computed(() => {
      return messageMap[globalStore.currentSession!.roomId] || {}
    })

    // 当前聊天室的消息加载状态计算属性
    const currentMessageOptions = computed({
      get: () => {
        const roomId = globalStore.currentSession!.roomId
        const current = messageOptions[roomId]
        if (current === undefined) {
          messageOptions[roomId] = { isLast: false, isLoading: false, cursor: '' }
        }
        return messageOptions[roomId]
      },
      set: (val) => {
        const roomId = globalStore.currentSession!.roomId
        messageOptions[roomId] = val as { isLast: boolean; isLoading: boolean; cursor: string }
      }
    })

    // 当前聊天室的回复消息映射计算属性
    const currentReplyMap = computed({
      get: () => {
        const roomId = globalStore.currentSession!.roomId
        const current = replyMapping[roomId]
        if (current === undefined) {
          replyMapping[roomId] = {}
        }
        return replyMapping[roomId]
      },
      set: (val) => {
        const roomId = globalStore.currentSession!.roomId
        replyMapping[roomId] = val as Record<string, string[]>
      }
    })

    // 判断是否应该显示“没有更多消息”
    const shouldShowNoMoreMessage = computed(() => {
      return currentMessageOptions.value?.isLast
    })

    // 判断当前是否为群聊
    const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)

    // 获取当前会话信息的计算属性
    const currentSessionInfo = computed(() =>
      sessionList.value.find((session) => session.roomId === globalStore.currentSession?.roomId)
    )

    // 新消息计数相关的响应式数据
    const newMsgCount = reactive<Record<string, { count: number; isStart: boolean }>>({})

    // 当前聊天室的新消息计数计算属性
    const currentNewMsgCount = computed({
      get: () => {
        const roomId = globalStore.currentSession!.roomId
        const current = newMsgCount[roomId]
        if (current === undefined) {
          newMsgCount[roomId] = { count: 0, isStart: false }
        }
        return newMsgCount[roomId]
      },
      set: (val) => {
        const roomId = globalStore.currentSession!.roomId
        newMsgCount[roomId] = val as { count: number; isStart: boolean }
      }
    })

    const changeRoom = async () => {
      const currentWindowLabel = WebviewWindow.getCurrent()
      if (currentWindowLabel.label !== 'home' && currentWindowLabel.label !== 'mobile-home') {
        return
      }

      currentMessageOptions.value = {
        isLast: false,
        isLoading: false,
        cursor: ''
      }

      // 3. 清空回复映射
      if (currentReplyMap.value) {
        for (const key in currentReplyMap.value) {
          delete currentReplyMap.value[key]
        }
      }

      try {
        // 从服务器加载消息
        await getMsgList(pageSize, true)
      } catch (error) {
        console.error('无法加载消息:', error)
        currentMessageOptions.value = {
          isLast: false,
          isLoading: false,
          cursor: ''
        }
      }

      // 标记当前会话已读
      const session = sessionList.value.find((s) => s.roomId === globalStore.currentSession!.roomId)
      if (session?.unreadCount) {
        markSessionRead(globalStore.currentSession!.roomId)
        updateTotalUnreadCount()
      }

      // 重置当前回复的消息
      currentMsgReply.value = {}
    }

    // 当前消息回复
    const currentMsgReply = ref<Partial<MessageType>>({})

    // 将消息列表转换为数组并计算时间间隔
    const chatMessageList = computed(() => {
      if (!currentMessageMap.value || Object.keys(currentMessageMap.value).length === 0) return []

      return Object.values(currentMessageMap.value).sort((a, b) => Number(a.message.id) - Number(b.message.id))
    })

    const chatMessageListByRoomId = computed(() => (roomId: string) => {
      if (!messageMap[roomId] || Object.keys(messageMap[roomId]).length === 0) return []

      return Object.values(messageMap[roomId]).sort((a, b) => Number(a.message.id) - Number(b.message.id))
    })

    // 登录之后，加载一次所有会话的消息
    const setAllSessionMsgList = async (size = pageSize) => {
      await info('初始设置所有会话消息列表')
      for (const session of sessionList.value) {
        await getPageMsg(size, session.roomId, '', true)
      }
    }

    // 获取消息列表
    const getMsgList = async (size = pageSize, async?: boolean) => {
      await info('获取消息列表')
      // 获取当前房间ID，用于后续比较
      const requestRoomId = globalStore.currentSession!.roomId

      await getPageMsg(size, requestRoomId, currentMessageOptions.value?.cursor, async)
    }

    const getPageMsg = async (pageSize: number, roomId: string, cursor: string = '', async?: boolean) => {
      // 查询本地存储，获取消息数据
      const data: any = await invokeWithErrorHandler(
        TauriCommand.PAGE_MSG,
        {
          param: {
            pageSize: pageSize,
            cursor: cursor,
            roomId: roomId,
            async: !!async
          }
        },
        {
          customErrorMessage: '获取消息列表失败',
          errorType: ErrorType.Network
        }
      )

      // 更新 messageOptions
      messageOptions[roomId] = {
        isLast: data.isLast,
        isLoading: false,
        cursor: data.cursor
      }

      // 确保 messageMap[roomId] 已初始化
      if (!messageMap[roomId]) {
        messageMap[roomId] = {}
      }

      for (const msg of data.list) {
        messageMap[roomId][msg.message.id] = msg
      }
    }

    // 获取会话列表
    const getSessionList = async (_isFresh = false) => {
      try {
        if (sessionOptions.isLoading) return
        sessionOptions.isLoading = true
        const response: any = await invokeWithErrorHandler(TauriCommand.LIST_CONTACTS, undefined, {
          customErrorMessage: '获取会话列表失败',
          errorType: ErrorType.Network
        }).catch(() => {
          sessionOptions.isLoading = false
          return null
        })
        if (!response) return
        const data = response
        if (!data) {
          return
        }

        sessionList.value = [...data]
        sessionOptions.isLoading = false

        sortAndUniqueSessionList()
      } catch (e) {
        console.error('获取会话列表失败11:', e)
        sessionOptions.isLoading = false
      } finally {
        sessionOptions.isLoading = false
      }
    }

    /** 会话列表去重并排序 */
    const sortAndUniqueSessionList = () => {
      const temp: Record<string, SessionItem> = {}
      for (const item of sessionList.value) {
        temp[item.roomId] = item
      }
      sessionList.value.splice(0, sessionList.value.length, ...Object.values(temp))
      sessionList.value.sort((pre, cur) => cur.activeTime - pre.activeTime)
    }

    // 更新会话
    const updateSession = (roomId: string, data: Partial<SessionItem>) => {
      const index = sessionList.value.findIndex((session) => session.roomId === roomId)
      if (index !== -1) {
        sessionList.value[index] = { ...sessionList.value[index], ...data }

        // 如果更新了免打扰状态，需要重新计算全局未读数
        if ('muteNotification' in data) {
          requestUnreadCountUpdate()
        }
      }
    }

    // 更新会话最后活跃时间, 只要更新的过程中会话不存在，那么将会话刷新出来
    const updateSessionLastActiveTime = (roomId: string) => {
      const session = sessionList.value.find((item) => item.roomId === roomId)
      if (session) {
        Object.assign(session, { activeTime: Date.now() })
      } else {
        addSession(roomId)
      }
      return session
    }

    const addSession = async (roomId: string) => {
      const resp = await getSessionDetail({ id: roomId })
      sessionList.value.unshift(resp)
      sortAndUniqueSessionList()
    }

    // 通过房间ID获取会话信息
    const getSession = (roomId: string) => {
      const currentSession = roomId ? sessionList.value.find((item) => item.roomId === roomId) : sessionList.value[0]
      return currentSession
    }

    // 推送消息
    const pushMsg = async (msg: MessageType, options: { isActiveChatView?: boolean; activeRoomId?: string } = {}) => {
      if (!msg.message.id) {
        msg.message.id = `${msg.message.roomId}_${msg.message.sendTime}_${msg.fromUser.uid}`
      }
      const messageKey = msg.message.id

      let roomMessages = messageMap[msg.message.roomId]
      if (!roomMessages) {
        roomMessages = {}
        messageMap[msg.message.roomId] = roomMessages
      }

      const existedMsg = roomMessages[messageKey]
      roomMessages[messageKey] = msg

      if (existedMsg) {
        return
      }

      const targetRoomId = options.activeRoomId ?? globalStore.currentSessionRoomId ?? ''
      let isActiveChatView = options.isActiveChatView
      if (isActiveChatView === undefined) {
        const currentPath = route?.path
        isActiveChatView =
          (currentPath === '/message' || currentPath?.startsWith('/mobile/chatRoom')) &&
          targetRoomId === msg.message.roomId
      }

      // 获取用户信息缓存
      const uid = msg.fromUser.uid
      const cacheUser = groupStore.getUserInfo(uid)

      // 更新会话的文本属性和未读数
      const session = updateSessionLastActiveTime(msg.message.roomId)
      if (session) {
        const lastMsgUserName = cacheUser?.name
        const formattedText =
          msg.message.type === MsgEnum.RECALL
            ? session.type === RoomTypeEnum.GROUP
              ? `${lastMsgUserName}:撤回了一条消息`
              : msg.fromUser.uid === userStore.userInfo!.uid
                ? '你撤回了一条消息'
                : '对方撤回了一条消息'
            : renderReplyContent(
                lastMsgUserName,
                msg.message.type,
                msg.message.body?.content || msg.message.body,
                session.type
              )
        session.text = formattedText!
        // 更新未读数
        if (msg.fromUser.uid !== userStore.userInfo!.uid) {
          if (!isActiveChatView || msg.message.roomId !== targetRoomId) {
            session.unreadCount = (session.unreadCount || 0) + 1
            // 使用防抖机制更新，适合并发消息场景
            requestUnreadCountUpdate()
          }
        }
      }

      // 如果收到的消息里面是艾特自己的就发送系统通知
      if (msg.message.body.atUidList?.includes(userStore.userInfo!.uid) && cacheUser) {
        sendNotification({
          title: cacheUser.name as string,
          body: msg.message.body.content,
          icon: cacheUser.avatar as string
        })
      }
    }

    const checkMsgExist = (roomId: string, msgId: string) => {
      const current = messageMap[roomId]
      return current && msgId in current
    }

    const clearMsgCheck = () => {
      chatMessageList.value.forEach((msg) => (msg.isCheck = false))
    }

    // 过滤掉拉黑用户的发言
    const filterUser = (uid: string) => {
      for (const roomId in messageMap) {
        const messages = messageMap[roomId]
        for (const msgId in messages) {
          const msg = messages[msgId]
          if (msg.fromUser.uid === uid) {
            delete messages[msgId]
          }
        }
      }
    }

    // 加载更多消息
    const loadMore = async (size?: number) => {
      if (currentMessageOptions.value?.isLast) return
      await getMsgList(size, true)
    }

    /** 清除新消息计数 */
    const clearNewMsgCount = () => {
      currentNewMsgCount.value && (currentNewMsgCount.value.count = 0)
    }

    // 查找消息在列表里面的索引
    const getMsgIndex = (msgId: string) => {
      if (!msgId) return -1
      const keys = currentMessageMap.value ? Object.keys(currentMessageMap.value) : []
      return keys.indexOf(msgId)
    }

    // 更新所有标记类型的数量
    const updateMarkCount = async (markList: MarkItemType[]) => {
      info('保存消息标记到本地数据库')
      for (const mark of markList) {
        const { msgId, markType, markCount, actType, uid } = mark

        await invokeWithErrorHandler(
          TauriCommand.SAVE_MESSAGE_MARK,
          {
            data: {
              msgId: msgId.toString(),
              markType,
              markCount,
              actType,
              uid: uid.toString()
            }
          },
          {
            customErrorMessage: '保存消息标记',
            errorType: ErrorType.Client
          }
        )

        const msgItem = currentMessageMap.value?.[String(msgId)]
        if (msgItem && msgItem.message.messageMarks) {
          // 获取当前的标记状态，如果不存在则初始化
          const currentMarkStat = msgItem.message.messageMarks[String(markType)] || {
            count: 0,
            userMarked: false
          }

          // 根据动作类型更新计数和用户标记状态
          // actType: 1表示确认(添加标记)，2表示取消(移除标记)
          if (actType === 1) {
            // 添加标记
            // 如果是当前用户的操作，设置userMarked为true
            if (uid === userStore.userInfo!.uid) {
              currentMarkStat.userMarked = true
            }
            // 更新计数
            currentMarkStat.count = markCount
          } else if (actType === 2) {
            // 取消标记
            // 如果是当前用户的操作，设置userMarked为false
            if (uid === userStore.userInfo!.uid) {
              currentMarkStat.userMarked = false
            }
            // 更新计数
            currentMarkStat.count = markCount
          }

          // 更新messageMark对象
          msgItem.message.messageMarks[String(markType)] = currentMarkStat
        }
      }
    }

    const recordRecallMsg = (data: { recallUid: string; msg: MessageType }) => {
      // 存储撤回的消息内容和时间
      const recallTime = Date.now()
      recalledMessages[data.msg.message.id] = {
        messageId: data.msg.message.id,
        content: data.msg.message.body.content,
        recallTime,
        originalType: data.msg.message.type
      }

      if (data.recallUid === userStore.userInfo!.uid) {
        // 使用 Worker 来处理定时器
        timerWorker.postMessage({
          type: 'startTimer',
          msgId: data.msg.message.id,
          duration: RECALL_EXPIRATION_TIME
        })
      }

      // 记录这个消息ID已经有了定时器
      expirationTimers[data.msg.message.id] = true
    }

    // 更新消息撤回状态
    const updateRecallMsg = async (data: RevokedMsgType) => {
      const { msgId } = data
      const message = currentMessageMap.value?.[msgId]
      if (message && typeof data.recallUid === 'string') {
        let recallMessageBody: string = ''

        const currentUid = userStore.userInfo!.uid
        // 被撤回消息的原始发送人
        const senderUid = message.fromUser.uid

        const isRecallerCurrentUser = data.recallUid === currentUid
        const isSenderCurrentUser = senderUid === currentUid

        if (isRecallerCurrentUser) {
          // 当前用户是撤回操作执行者
          if (data.recallUid === senderUid) {
            // 自己的视角
            recallMessageBody = '你撤回了一条消息'
          } else {
            // 撤回他人的消息：群主/管理员视角
            const senderUser = groupStore.getUserInfo(senderUid)!
            recallMessageBody = `你撤回了${senderUser.name}的一条消息`
          }
        } else {
          // 当前用户不是撤回操作执行者
          const isLord = groupStore.isCurrentLord(data.recallUid)
          const isAdmin = groupStore.isAdmin(data.recallUid)

          // 构建角色前缀
          let rolePrefix = ''
          if (isLord) {
            rolePrefix = '群主'
          } else if (isAdmin) {
            rolePrefix = '管理员'
          }
          // 普通成员不显示角色前缀
          if (isSenderCurrentUser) {
            // 当前用户是被撤回消息的发送者（被撤回者视角）
            recallMessageBody = `${rolePrefix}撤回了你的一条消息`
          } else {
            // 当前用户是旁观者（其他成员视角）
            recallMessageBody = `${rolePrefix}撤回了一条消息`
          }
        }

        // 更新前端缓存
        message.message.type = MsgEnum.RECALL
        message.message.body.content = recallMessageBody

        // 同步更新 SQLite 数据库
        try {
          await invokeWithErrorHandler(
            TauriCommand.UPDATE_MESSAGE_RECALL_STATUS,
            {
              messageId: message.message.id,
              messageType: MsgEnum.RECALL,
              messageBody: recallMessageBody
            },
            {
              customErrorMessage: '更新撤回消息状态失败',
              errorType: ErrorType.Client
            }
          )
          info(`✅ [RECALL] Successfully updated message recall status in database, message_id: ${msgId}`)
        } catch (error) {
          console.error(`❌ [RECALL] Failed to update message recall status in database:`, error)
        }
      }

      // 更新与这条撤回消息有关的消息
      const messageList = currentReplyMap.value?.[msgId]
      if (messageList) {
        for (const id of messageList) {
          const msg = currentMessageMap.value?.[id]
          if (msg) {
            msg.message.body.reply.body = '原消息已被撤回'
          }
        }
      }
    }

    // 获取撤回消息
    const getRecalledMessage = (msgId: string): RecalledMessage | undefined => {
      return recalledMessages[msgId]
    }

    // 删除消息
    const deleteMsg = (msgId: string) => {
      if (currentMessageMap.value && msgId in currentMessageMap.value) {
        delete currentMessageMap.value[msgId]
      }
    }

    // 更新消息
    const updateMsg = ({
      msgId,
      status,
      newMsgId,
      body,
      uploadProgress,
      timeBlock
    }: {
      msgId: string
      status: MessageStatusEnum
      newMsgId?: string
      body?: any
      uploadProgress?: number
      timeBlock?: number
    }) => {
      const msg = currentMessageMap.value?.[msgId]
      if (msg) {
        msg.message.status = status
        msg.timeBlock = timeBlock
        if (newMsgId) {
          msg.message.id = newMsgId
        }
        if (body) {
          msg.message.body = body
        }
        if (uploadProgress !== undefined) {
          console.log(`📱 更新消息进度: ${uploadProgress}% (消息ID: ${msgId})`)
          // 确保响应式更新，创建新的消息对象
          const updatedMsg = { ...msg, uploadProgress }
          if (currentMessageMap.value) {
            currentMessageMap.value[msg.message.id] = updatedMsg
          }
          // 强制触发响应式更新
          messageMap[globalStore.currentSession!.roomId] = { ...currentMessageMap.value }
        } else {
          if (currentMessageMap.value) {
            currentMessageMap.value[msg.message.id] = msg
          }
        }
        if (newMsgId && msgId !== newMsgId && currentMessageMap.value) {
          delete currentMessageMap.value[msgId]
        }
      }
    }

    // 标记已读数为 0
    const markSessionRead = (roomId: string) => {
      const session = sessionList.value.find((s) => s.roomId === roomId)
      if (session) {
        // 更新会话的未读数
        session.unreadCount = 0

        // 重新计算全局未读数，使用 chatStore 中的方法以保持一致性
        updateTotalUnreadCount()
      }
    }

    // 根据消息id获取消息体
    const getMessage = (messageId: string) => {
      return currentMessageMap.value?.[messageId]
    }

    // 删除会话
    const removeSession = (roomId: string) => {
      const index = sessionList.value.findIndex((session) => session.roomId === roomId)
      if (index !== -1) {
        sessionList.value.splice(index, 1)
        if (globalStore.currentSessionRoomId === roomId) {
          globalStore.updateCurrentSessionRoomId(sessionList.value[0].roomId)
        }

        // 删除会话后更新未读计数
        requestUnreadCountUpdate()
      }
    }

    // 监听 Worker 消息
    timerWorker.onmessage = (e) => {
      const { type, msgId } = e.data

      if (type === 'timeout') {
        console.log(`[Timeout] 消息ID: ${msgId} 已过期`)
        delete recalledMessages[msgId]
        delete expirationTimers[msgId]
      } else if (type === 'allTimersCompleted') {
        // 所有定时器都完成了，可以安全地清理资源
        clearAllExpirationTimers()
        terminateWorker()
      }
    }

    // 终止 worker
    const terminateWorker = () => {
      timerWorker.terminate()
    }

    // 清理所有定时器
    const clearAllExpirationTimers = () => {
      for (const msgId in expirationTimers) {
        // 通知 worker 停止对应的定时器
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId
        })
      }
      for (const msgId in expirationTimers) {
        delete expirationTimers[msgId]
      }
    }

    // 更新未读消息计数
    const updateTotalUnreadCount = () => {
      // 使用统一的计数管理器
      unreadCountManager.calculateTotal(sessionList.value, globalStore.unReadMark)
    }

    // 设置计数管理器的更新回调
    unreadCountManager.setUpdateCallback(() => {
      unreadCountManager.calculateTotal(sessionList.value, globalStore.unReadMark)
    })

    // 使用防抖机制的更新函数
    const requestUnreadCountUpdate = (sessionId?: string) => {
      unreadCountManager.requestUpdate(sessionId)
    }

    // 清空所有会话的未读数
    const clearUnreadCount = () => {
      sessionList.value.forEach((session) => {
        session.unreadCount = 0
      })
      // 更新全局未读数
      requestUnreadCountUpdate()
    }

    const clearRedundantMessages = (roomId: string) => {
      const currentMessages = messageMap[roomId]
      if (!currentMessages) return

      // 将消息转换为数组并按消息ID倒序排序
      const sortedMessages = Object.values(currentMessages).sort((a, b) => Number(b.message.id) - Number(a.message.id))

      // 保留前20条消息的ID
      const keepMessageIds = new Set(sortedMessages.slice(0, 20).map((msg) => msg.message.id))

      // 删除多余的消息
      for (const msgId in currentMessages) {
        if (!keepMessageIds.has(msgId)) {
          delete currentMessages[msgId]
        }
      }
    }

    // 重置当前聊天室的消息并刷新最新消息
    const resetAndRefreshCurrentRoomMessages = async () => {
      if (!globalStore.currentSession!.roomId) return

      // 保存当前房间ID，用于后续比较
      const requestRoomId = globalStore.currentSession!.roomId

      try {
        // 1. 清空消息数据 避免竞态条件
        if (messageMap[requestRoomId]) {
          messageMap[requestRoomId] = {}
        }

        // 2. 重置消息加载状态，强制cursor为空以获取最新消息
        messageOptions[requestRoomId] = {
          isLast: false,
          isLoading: true,
          cursor: ''
        }

        // 3. 清空回复映射
        const currentReplyMapping = replyMapping[requestRoomId]
        if (currentReplyMapping) {
          for (const key in currentReplyMapping) {
            delete currentReplyMapping[key]
          }
        }

        // 4. 直接调用getPageMsg获取最新消息，强制使用空cursor
        await getPageMsg(pageSize, requestRoomId, '')

        console.log('[Network] 已重置并刷新当前聊天室的消息列表')
      } catch (error) {
        console.error('[Network] 重置并刷新消息列表失败:', error)
        // 如果获取失败，确保重置加载状态
        if (globalStore.currentSession!.roomId === requestRoomId) {
          messageOptions[requestRoomId] = {
            isLast: false,
            isLoading: false,
            cursor: ''
          }
        }
      }
    }

    // 获取所有群组类型的会话
    const getGroupSessions = () => {
      return sessionList.value.filter((session) => session.type === RoomTypeEnum.GROUP)
    }

    const setMsgMultiChoose = (flag: boolean, mode: 'normal' | 'forward' = 'normal') => {
      isMsgMultiChoose.value = flag
      msgMultiChooseMode.value = flag ? mode : 'normal'
    }

    // 重置所有会话选择状态
    const resetSessionSelection = () => {
      sessionList.value.forEach((session) => {
        session.isCheck = false
      })
    }

    return {
      getMsgIndex,
      chatMessageList,
      pushMsg,
      deleteMsg,
      clearNewMsgCount,
      updateMarkCount,
      updateRecallMsg,
      recordRecallMsg,
      updateMsg,
      newMsgCount,
      messageMap,
      currentMessageMap,
      currentMessageOptions,
      currentReplyMap,
      currentNewMsgCount,
      loadMore,
      currentMsgReply,
      filterUser,
      sessionList,
      sessionOptions,
      getSessionList,
      updateSession,
      updateSessionLastActiveTime,
      markSessionRead,
      getSession,
      isGroup,
      currentSessionInfo,
      getMessage,
      getRecalledMessage,
      recalledMessages,
      clearAllExpirationTimers,
      updateTotalUnreadCount,
      requestUnreadCountUpdate,
      clearUnreadCount,
      resetAndRefreshCurrentRoomMessages,
      getGroupSessions,
      removeSession,
      changeRoom,
      addSession,
      setAllSessionMsgList,
      chatMessageListByRoomId,
      shouldShowNoMoreMessage,
      isMsgMultiChoose,
      clearMsgCheck,
      setMsgMultiChoose,
      msgMultiChooseMode,
      resetSessionSelection,
      checkMsgExist,
      clearRedundantMessages
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
