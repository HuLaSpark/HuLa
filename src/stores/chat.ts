import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { orderBy, uniqBy } from 'es-toolkit'
import pLimit from 'p-limit'
import { defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import { ErrorType } from '@/common/exception'
import { MittEnum, type MessageStatusEnum, MsgEnum, RoomTypeEnum, StoresEnum, TauriCommand } from '@/enums'
import type { MarkItemType, MessageType, RevokedMsgType, SessionItem } from '@/services/types'
import { useGlobalStore } from '@/stores/global.ts'
import { useFeedStore } from '@/stores/feed.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useUserStore } from '@/stores/user.ts'
import { getSessionDetail, markMsgRead } from '@/utils/ImRequestUtils'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { useSessionUnreadStore } from '@/stores/sessionUnread'
import { unreadCountManager } from '@/utils/UnreadCountManager'
import { useMitt } from '@/hooks/useMitt'

type RecalledMessage = {
  messageId: string
  content: string
  recallTime: number
  originalType: MsgEnum
}

// 定义每页加载的消息数量
export const pageSize = 20

// 单个会话在内存中的消息保留上限，防止后台会话无限增长
const ROOM_MESSAGE_CACHE_LIMIT = 40

// 撤回消息的过期时间
const RECALL_EXPIRATION_TIME = 2 * 60 * 1000 // 2分钟，单位毫秒

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
    const userStore = useUserStore()
    const globalStore = useGlobalStore()
    const feedStore = useFeedStore()
    const groupStore = useGroupStore()
    const sessionUnreadStore = useSessionUnreadStore()

    // 会话列表
    const sessionList = ref<SessionItem[]>([])
    // 会话列表的快速查找 Map，通过 roomId 进行 O(1) 查找
    const sessionMap = ref<Record<string, SessionItem>>({})
    // 会话列表的加载状态
    const sessionOptions = reactive({ isLast: false, isLoading: false, cursor: '' })
    // 消息同步加载状态（用于显示同步中的提示）
    const syncLoading = ref(false)

    // 持久化的未读数同步回内存里的会话对象，确保刷新或切账号后还能看到旧的未读状态
    const syncPersistedUnreadCounts = (targetSessions: SessionItem[] = sessionList.value) => {
      if (!targetSessions.length) {
        return
      }
      sessionUnreadStore.apply(userStore.userInfo?.uid, targetSessions)
    }

    // 更新本地缓存里的某个会话未读数
    const persistUnreadCount = (roomId: string, count: number) => {
      if (!roomId) {
        return
      }
      sessionUnreadStore.set(userStore.userInfo?.uid, roomId, count)
    }

    // 在删除会话或清理数据时同步移除缓存，避免旧数据污染
    const removeUnreadCountCache = (roomId: string) => {
      if (!roomId) {
        return
      }
      sessionUnreadStore.remove(userStore.userInfo?.uid, roomId)
    }

    // 将已有的会话列表同步到 sessionMap，解决持久化恢复或请求失败时 map 为空的问题
    const rebuildSessionMap = () => {
      if (!sessionList.value.length) {
        return
      }
      sessionMap.value = sessionList.value.reduce(
        (map, session) => {
          map[session.roomId] = session
          return map
        },
        {} as Record<string, SessionItem>
      )
    }

    // 兜底获取会话，优先使用 map，没有时从列表里回填一份到 map
    const resolveSessionByRoomId = (roomId: string) => {
      if (!roomId) return undefined

      let session = sessionMap.value[roomId]
      if (!session) {
        if (!Object.keys(sessionMap.value).length && sessionList.value.length) {
          rebuildSessionMap()
        }
        session = sessionMap.value[roomId] ?? sessionList.value.find((item) => item.roomId === roomId)
        if (session) {
          sessionMap.value[roomId] = session
        }
      }
      return session
    }

    // 记录最近一次将会话标记已读时的活跃时间，用于下次登录时识别“旧未读”
    const lastReadActiveTime = ref<Record<string, number>>({})

    // 在刷新会话列表后，处理服务器返回的“旧未读”——本地之前已读（未读数为0）、活跃时间未变但服务端仍返回未读
    const reconcileStaleUnread = async (prevSessions?: Record<string, SessionItem>) => {
      if (!prevSessions) return
      const promises: Promise<unknown>[] = []

      for (const session of sessionList.value) {
        const prev = prevSessions[session.roomId]
        if (!prev) continue

        const prevUnread = Math.max(0, prev.unreadCount || 0)
        const currentUnread = Math.max(0, session.unreadCount || 0)
        const hasValidActiveTime = !!prev.activeTime && !!session.activeTime

        // 只有在「本地之前为 0、当前为正数、且存在有效活跃时间并未变化」时认为是陈旧未读
        if (prevUnread === 0 && currentUnread > 0 && hasValidActiveTime && session.activeTime === prev.activeTime) {
          console.log('[Chat][reconcileStaleUnread] clear stale unread', session.roomId, {
            prevUnread,
            currentUnread,
            activeTime: session.activeTime
          })
          updateSession(session.roomId, { unreadCount: 0 })
          // 补一次已读上报，避免下一次刷新又回灌
          promises.push(
            markMsgRead(session.roomId).catch((error) => {
              console.error('[chat] 补偿已读上报失败:', error)
            })
          )
        }
      }

      if (promises.length) {
        await Promise.allSettled(promises)
        requestUnreadCountUpdate()
      }
    }

    // 使用本地记录的“最后已读活跃时间”兜底清理陈旧未读，避免重登时短暂闪现
    const reconcileUnreadWithReadHistory = async () => {
      const promises: Promise<unknown>[] = []

      for (const session of sessionList.value) {
        const activeTime = session.activeTime || 0
        const lastReadTime = lastReadActiveTime.value[session.roomId] || 0
        const currentUnread = Math.max(0, session.unreadCount || 0)

        if (currentUnread > 0 && lastReadTime > 0 && (activeTime === 0 || activeTime <= lastReadTime)) {
          console.log('[Chat][reconcileUnreadWithReadHistory] clear by lastRead', session.roomId, {
            activeTime,
            lastReadTime,
            currentUnread
          })
          updateSession(session.roomId, { unreadCount: 0 })
          promises.push(
            markMsgRead(session.roomId).catch((error) => {
              console.error('[chat] 基于已读历史的补偿上报失败:', error)
            })
          )
        }
      }

      if (promises.length) {
        await Promise.allSettled(promises)
        requestUnreadCountUpdate()
      }
    }

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
      return messageMap[globalStore.currentSessionRoomId] || {}
    })

    // 当前聊天室的消息加载状态计算属性
    const currentMessageOptions = computed({
      get: () => {
        const roomId = globalStore.currentSessionRoomId
        const current = messageOptions[roomId]
        if (current === undefined) {
          messageOptions[roomId] = { isLast: false, isLoading: false, cursor: '' }
        }
        return messageOptions[roomId]
      },
      set: (val) => {
        const roomId = globalStore.currentSessionRoomId
        messageOptions[roomId] = val as { isLast: boolean; isLoading: boolean; cursor: string }
      }
    })

    // 当前聊天室的回复消息映射计算属性
    const currentReplyMap = computed({
      get: () => {
        const roomId = globalStore.currentSessionRoomId
        const current = replyMapping[roomId]
        if (current === undefined) {
          replyMapping[roomId] = {}
        }
        return replyMapping[roomId]
      },
      set: (val) => {
        const roomId = globalStore.currentSessionRoomId
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
    const currentSessionInfo = computed(() => {
      const roomId = globalStore.currentSessionRoomId
      if (!roomId) return undefined

      // 直接从 sessionMap 中查找（页面刷新后会自动恢复）
      return resolveSessionByRoomId(roomId)
    })

    // 新消息计数相关的响应式数据
    const newMsgCount = reactive<Record<string, { count: number; isStart: boolean }>>({})

    // 当前聊天室的新消息计数计算属性
    const currentNewMsgCount = computed({
      get: () => {
        const roomId = globalStore.currentSessionRoomId
        const current = newMsgCount[roomId]
        if (current === undefined) {
          newMsgCount[roomId] = { count: 0, isStart: false }
        }
        return newMsgCount[roomId]
      },
      set: (val) => {
        const roomId = globalStore.currentSessionRoomId
        newMsgCount[roomId] = val as { count: number; isStart: boolean }
      }
    })

    /**
     * 清理非当前房间的消息缓存
     * @description 切换房间时调用，释放内存，只保留当前房间的消息
     * 注意：只清空消息内容，不删除 key，避免影响响应式依赖
     */
    const clearOtherRoomsMessages = (currentRoomId: string) => {
      for (const roomId in messageMap) {
        if (roomId !== currentRoomId) {
          // 只清空消息内容，保留响应式对象结构
          for (const msgId in messageMap[roomId]) {
            delete messageMap[roomId][msgId]
          }
        }
      }
    }

    /**
     * 切换聊天室
     * @description
     * 当用户切换到不同的聊天室时调用此方法，执行完整的房间切换流程。
     * 该方法会清空旧房间的消息数据，重新加载新房间的消息，并处理相关的状态重置。
     */
    const changeRoom = async () => {
      const currentWindowLabel = WebviewWindow.getCurrent()
      if (currentWindowLabel.label !== 'home' && currentWindowLabel.label !== 'mobile-home') {
        return
      }

      // 如果 currentSession 不存在，直接返回
      if (!globalStore.currentSessionRoomId) {
        return
      }

      const roomId = globalStore.currentSessionRoomId

      // 清理其他房间的消息缓存，释放内存
      clearOtherRoomsMessages(roomId)

      // 清理过期的撤回消息缓存
      cleanupExpiredRecalledMessages()

      // 1. 清空当前房间的旧消息数据
      if (messageMap[roomId]) {
        messageMap[roomId] = {}
      }

      // 2. 重置消息加载状态
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
        await getPageMsg(pageSize, roomId, '')
      } catch (error) {
        console.error('无法加载消息:', error)
        currentMessageOptions.value = {
          isLast: false,
          isLoading: false,
          cursor: ''
        }
      }

      // 标记当前会话已读
      if (globalStore.currentSessionRoomId) {
        const session = resolveSessionByRoomId(globalStore.currentSessionRoomId)
        if (session?.unreadCount) {
          markSessionRead(globalStore.currentSessionRoomId)
        }
      }

      // 重置当前回复的消息
      currentMsgReply.value = {}
    }

    // 当前消息回复
    const currentMsgReply = ref<Partial<MessageType>>({})

    // 将消息列表转换为数组并计算时间间隔
    const chatMessageList = computed(() => {
      if (!currentMessageMap.value || Object.keys(currentMessageMap.value).length === 0) return []

      // 直接使用 Rust 后端计算的 timeBlock，不做前端计算
      return Object.values(currentMessageMap.value).sort((a, b) => Number(a.message.id) - Number(b.message.id))
    })

    const chatMessageListByRoomId = computed(() => (roomId: string) => {
      if (!messageMap[roomId] || Object.keys(messageMap[roomId]).length === 0) return []

      return Object.values(messageMap[roomId]).sort((a, b) => Number(a.message.id) - Number(b.message.id))
    })

    const findRoomIdByMsgId = (msgId: string) => {
      if (!msgId) return ''
      for (const roomId of Object.keys(messageMap)) {
        const roomMessages = messageMap[roomId]
        if (roomMessages && msgId in roomMessages) {
          return roomId
        }
      }
      return ''
    }

    /**
     * 登录之后，加载一次所有会话的消息
     * @description
     * 使用受控并发加载（p-limit），避免大量会话时阻塞 UI
     * - 优先加载最近活跃的会话
     * - 限制并发数为 5，平衡性能和服务器压力
     * - 使用 Promise.allSettled 确保部分失败不影响其他会话
     */
    const setAllSessionMsgList = async (size = pageSize) => {
      await info('初始设置所有会话消息列表')

      if (sessionList.value.length === 0) return

      // 按活跃时间排序，优先加载最近的会话
      const sortedSessions = [...sessionList.value].sort((a, b) => b.activeTime - a.activeTime)

      // 创建并发限制器（最多同时 5 个请求）
      const limit = pLimit(5)

      // 使用 p-limit 包装任务并执行
      const tasks = sortedSessions.map((session) => limit(() => getPageMsg(size, session.roomId, '', true)))

      // 并发执行所有任务
      const results = await Promise.allSettled(tasks)

      // 统计加载结果
      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const failCount = results.filter((r) => r.status === 'rejected').length

      await info(`会话消息加载完成: 成功 ${successCount}/${sortedSessions.length}, 失败 ${failCount}`)

      // 记录失败的会话（可选）
      if (failCount > 0) {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`会话 ${sortedSessions[index].roomId} 消息加载失败:`, result.reason)
          }
        })
      }
    }

    // 获取消息列表
    const getMsgList = async (size = pageSize, async?: boolean) => {
      await info('获取消息列表')
      // 获取当前房间ID，用于后续比较
      const requestRoomId = globalStore.currentSessionRoomId

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

    const remoteSyncLocks = new Set<string>()
    const fetchCurrentRoomRemoteOnce = async (size = pageSize) => {
      const roomId = globalStore.currentSessionRoomId
      if (!roomId) return
      if (remoteSyncLocks.has(roomId)) return
      remoteSyncLocks.add(roomId)
      try {
        const opts = messageOptions[roomId] || { isLast: false, isLoading: false, cursor: '' }
        opts.cursor = ''
        messageOptions[roomId] = opts
        await getPageMsg(size, roomId, '')
      } finally {
        remoteSyncLocks.delete(roomId)
      }
    }

    // 获取会话列表
    const getSessionList = async (_isFresh = false) => {
      try {
        if (sessionOptions.isLoading) return
        sessionOptions.isLoading = true
        // 避免显示上次会话的陈旧未读，在同步期间先清零消息未读，待拉取完成后再计算
        globalStore.unreadReady = false
        globalStore.unReadMark.newMsgUnreadCount = 0
        unreadCountManager.refreshBadge(globalStore.unReadMark, feedStore.unreadCount)
        const prevSessions =
          sessionList.value.length > 0
            ? sessionList.value.reduce(
                (map, item) => {
                  map[item.roomId] = { ...item }
                  return map
                },
                {} as Record<string, SessionItem>
              )
            : undefined
        const data: any = await invokeWithErrorHandler(TauriCommand.LIST_CONTACTS, undefined, {
          customErrorMessage: '获取会话列表失败',
          errorType: ErrorType.Network
        }).catch(() => {
          sessionOptions.isLoading = false
          return null
        })
        if (!data) {
          // 拉取失败也要恢复未读角标的展示，避免 unreadReady 卡在 false
          globalStore.unreadReady = true
          unreadCountManager.refreshBadge(globalStore.unReadMark, feedStore.unreadCount)
          return
        }

        // console.log(
        //   '[SessionDebug] 后端返回的会话列表:',
        //   data.map((item: SessionItem) => ({
        //     roomId: item.roomId,
        //     unreadCount: item.unreadCount,
        //     name: item.name
        //   }))
        // )

        sessionList.value = [...data]
        syncPersistedUnreadCounts()
        sessionOptions.isLoading = false

        // 同步更新 sessionMap
        for (const session of sessionList.value) {
          sessionMap.value[session.roomId] = session
        }

        sortAndUniqueSessionList()

        // 补偿陈旧未读后再一次性更新未读角标，避免加载过程闪现旧数据
        await reconcileStaleUnread(prevSessions)
        await reconcileUnreadWithReadHistory()
        await clearCurrentSessionUnread()
        updateTotalUnreadCount()
        // 如果当前会话仍被服务器标记为未读，主动上报并清零，避免气泡卡住
        const currentRoomId = globalStore.currentSessionRoomId
        if (currentRoomId) {
          const currentSession = resolveSessionByRoomId(currentRoomId)
          if (currentSession?.unreadCount) {
            try {
              await markMsgRead(currentRoomId)
            } catch (error) {
              console.error('[chat] 会话列表同步后上报已读失败:', error)
            }
            markSessionRead(currentRoomId)
            // 清除当前会话未读后，需要重新计算总未读数，确保程序坞图标正确更新
            updateTotalUnreadCount()
          }
        }
        globalStore.unreadReady = true
        unreadCountManager.refreshBadge(globalStore.unReadMark, feedStore.unreadCount)
      } catch (e) {
        console.error('获取会话列表失败11:', e)
        sessionOptions.isLoading = false
        // 出错时也恢复未读展示，避免角标长时间隐藏
        globalStore.unreadReady = true
        unreadCountManager.refreshBadge(globalStore.unReadMark, feedStore.unreadCount)
      } finally {
        sessionOptions.isLoading = false
      }
    }

    /** 会话列表去重并排序 */
    const sortAndUniqueSessionList = () => {
      // 使用 uniqBy 按 roomId 去重，使用 orderBy 按 activeTime 降序排序
      const uniqueAndSorted = orderBy(
        uniqBy(sessionList.value, (item) => item.roomId),
        [(item) => item.activeTime],
        ['desc']
      )
      sessionList.value.splice(0, sessionList.value.length, ...uniqueAndSorted)
    }

    // 更新会话
    const updateSession = (roomId: string, data: Partial<SessionItem>) => {
      const session = resolveSessionByRoomId(roomId)
      if (session) {
        const updatedSession = { ...session, ...data }

        // 同步更新 sessionList
        const index = sessionList.value.findIndex((s) => s.roomId === roomId)
        if (index !== -1) {
          sessionList.value[index] = updatedSession
        }

        // 同步更新 sessionMap
        sessionMap.value[roomId] = updatedSession

        if ('unreadCount' in data && typeof updatedSession.unreadCount === 'number') {
          persistUnreadCount(roomId, updatedSession.unreadCount)
          requestUnreadCountUpdate(roomId)
        }

        // 如果更新了免打扰状态，需要重新计算全局未读数
        if ('muteNotification' in data) {
          requestUnreadCountUpdate()
        }
      }
    }

    // 更新会话最后活跃时间, 只要更新的过程中会话不存在，那么将会话刷新出来
    const updateSessionLastActiveTime = (roomId: string) => {
      // O(1) 查找
      const session = resolveSessionByRoomId(roomId)
      if (session) {
        Object.assign(session, { activeTime: Date.now() })
      } else {
        addSession(roomId)
      }
      return session
    }

    const addSession = async (roomId: string) => {
      const resp = await getSessionDetail({ id: roomId })
      syncPersistedUnreadCounts([resp])
      sessionList.value.unshift(resp)
      // 同步更新 sessionMap
      sessionMap.value[roomId] = resp
      sortAndUniqueSessionList()
    }

    // 通过房间ID获取会话信息
    const getSession = (roomId: string) => {
      if (!roomId) {
        return sessionList.value[0]
      }

      // O(1) 查找（页面刷新后自动从持久化恢复）
      return resolveSessionByRoomId(roomId)
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
            persistUnreadCount(session.roomId, session.unreadCount)
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

      // 防止后台会话长期堆积消息，超出上限时做裁剪（保持当前会话完整，避免阅读中被截断）
      if (!isActiveChatView || msg.message.roomId !== targetRoomId) {
        clearRedundantMessages(msg.message.roomId, ROOM_MESSAGE_CACHE_LIMIT)
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
    // const filterUser = (uid: string) => {
    //   for (const roomId in messageMap) {
    //     const messages = messageMap[roomId]
    //     for (const msgId in messages) {
    //       const msg = messages[msgId]
    //       if (msg.fromUser.uid === uid) {
    //         delete messages[msgId]
    //       }
    //     }
    //   }
    // }

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

    const recordRecallMsg = (data: {
      recallUid: string
      msg: MessageType
      originalType?: number
      originalContent?: string
    }) => {
      // 存储撤回的消息内容和时间
      const recallTime = Date.now()
      // 优先使用传入的 originalType 和 originalContent，避免竞态条件导致类型已被修改
      recalledMessages[data.msg.message.id] = {
        messageId: data.msg.message.id,
        content: data.originalContent ?? data.msg.message.body.content,
        recallTime,
        originalType: data.originalType ?? data.msg.message.type
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
      const roomIdFromPayload = data.roomId || currentMessageMap.value?.[msgId]?.message?.roomId
      const resolvedRoomId = roomIdFromPayload || findRoomIdByMsgId(msgId)
      const session = resolvedRoomId ? resolveSessionByRoomId(resolvedRoomId) : undefined
      const sessionType = session?.type ?? RoomTypeEnum.SINGLE
      const roomMessages = resolvedRoomId ? messageMap[resolvedRoomId] : undefined
      const message = roomMessages?.[msgId] || currentMessageMap.value?.[msgId]
      let recallMessageBody = ''

      if (message && typeof data.recallUid === 'string') {
        const currentUid = userStore.userInfo!.uid
        // 被撤回消息的原始发送人
        const senderUid = message.fromUser.uid

        const isRecallerCurrentUser = data.recallUid === currentUid
        const isSenderCurrentUser = senderUid === currentUid
        const recallerUser = groupStore.getUserInfo(data.recallUid, resolvedRoomId)
        const recallerName = recallerUser?.myName || recallerUser?.name || data.recallUid || ''
        const senderUser = groupStore.getUserInfo(senderUid, resolvedRoomId)
        const senderName = senderUser?.myName || senderUser?.name || message.fromUser.username || senderUid
        const isGroup = sessionType === RoomTypeEnum.GROUP

        if (isRecallerCurrentUser) {
          // 当前用户是撤回操作执行者
          if (data.recallUid === senderUid) {
            // 自己的视角
            recallMessageBody = '你撤回了一条消息'
          } else {
            // 撤回他人的消息
            recallMessageBody = `你撤回了${senderName}的一条消息`
          }
        } else {
          // 当前用户不是撤回操作执行者
          if (isGroup) {
            // 群聊下，展示撤回人昵称
            const recallerLabel = recallerName || '对方'
            if (isSenderCurrentUser) {
              recallMessageBody = `${recallerLabel}撤回了你的一条消息`
            } else {
              recallMessageBody = `${recallerLabel}撤回了一条消息`
            }
          } else {
            // 非群聊保持原有单聊逻辑
            if (isSenderCurrentUser) {
              // 当前用户是被撤回消息的发送者（被撤回者视角）
              recallMessageBody = '对方撤回了你的一条消息'
            } else {
              // 当前用户是旁观者（其他成员视角）
              recallMessageBody = '对方撤回了一条消息'
            }
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
          info(`[RECALL] Successfully updated message recall status in database, message_id: ${msgId}`)
        } catch (error) {
          console.error(`[RECALL] Failed to update message recall status in database:`, error)
        }
      }

      if (resolvedRoomId) {
        const session = resolveSessionByRoomId(resolvedRoomId)
        if (session && recallMessageBody) {
          session.text = recallMessageBody
        }
        useMitt.emit(MittEnum.UPDATE_SESSION_LAST_MSG, { roomId: resolvedRoomId })
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

    const clearRoomMessages = (roomId: string) => {
      if (!roomId) return

      if (messageMap[roomId]) {
        messageMap[roomId] = {}
      }

      if (replyMapping[roomId]) {
        replyMapping[roomId] = {}
      }

      const defaultOptions = {
        isLast: true,
        isLoading: false,
        cursor: ''
      }

      if (globalStore.currentSessionRoomId === roomId) {
        currentMessageOptions.value = defaultOptions
        currentReplyMap.value = {}
        currentMsgReply.value = {}
      } else {
        messageOptions[roomId] = defaultOptions
      }

      newMsgCount[roomId] = { count: 0, isStart: false }
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
        // 只在 timeBlock 有值时才更新，避免覆盖原有值
        if (timeBlock !== undefined) {
          msg.timeBlock = timeBlock
        }
        if (newMsgId) {
          msg.message.id = newMsgId
        }
        if (body) {
          msg.message.body = body
        }
        if (uploadProgress !== undefined) {
          console.log(`更新消息进度: ${uploadProgress}% (消息ID: ${msgId})`)
          // 确保响应式更新，创建新的消息对象
          const updatedMsg = { ...msg, uploadProgress }
          if (currentMessageMap.value) {
            currentMessageMap.value[msg.message.id] = updatedMsg
          }
          // 强制触发响应式更新
          messageMap[globalStore.currentSessionRoomId] = { ...currentMessageMap.value }
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
      const session = resolveSessionByRoomId(roomId)
      if (!session) return
      if (session.unreadCount === 0) {
        requestUnreadCountUpdate(roomId)
        return
      }

      // 记录已读时的活跃时间，用于重登时识别陈旧未读
      const activeTime = session.activeTime || Date.now()
      lastReadActiveTime.value[roomId] = activeTime
      sessionUnreadStore.setLastRead(userStore.userInfo?.uid, roomId, activeTime)

      updateSession(roomId, { unreadCount: 0 })
      // 立即刷新全局未读，避免等待防抖
      updateTotalUnreadCount()
    }

    // 清理当前会话的未读（用于重连/重登后仍停留在该会话时的兜底）
    const clearCurrentSessionUnread = async () => {
      const roomId = globalStore.currentSessionRoomId
      if (!roomId) return
      const session = resolveSessionByRoomId(roomId)
      if (!session?.unreadCount) return

      try {
        await markMsgRead(roomId)
      } catch (error) {
        console.error('[chat] 补偿上报已读失败:', error)
      }
      markSessionRead(roomId)
    }

    // 根据消息id获取消息体
    const getMessage = (messageId: string) => {
      return currentMessageMap.value?.[messageId]
    }

    // 删除会话
    const removeSession = (roomId: string) => {
      const session = resolveSessionByRoomId(roomId)
      if (session) {
        // 从数组中删除
        const index = sessionList.value.findIndex((s) => s.roomId === roomId)
        if (index !== -1) {
          sessionList.value.splice(index, 1)
        }

        // 从 map 中删除
        delete sessionMap.value[roomId]
        delete lastReadActiveTime.value[roomId]
        sessionUnreadStore.setLastRead(userStore.userInfo?.uid, roomId, 0)

        if (globalStore.currentSessionRoomId === roomId) {
          globalStore.updateCurrentSessionRoomId(sessionList.value[0].roomId)
        }

        // 删除会话后更新未读计数
        requestUnreadCountUpdate()
      }
      removeUnreadCountCache(roomId)
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

    // 清理所有定时器和撤回消息缓存
    const clearAllExpirationTimers = () => {
      for (const msgId in expirationTimers) {
        // 通知 worker 停止对应的定时器
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId
        })
      }
      // 清理 expirationTimers
      for (const msgId in expirationTimers) {
        delete expirationTimers[msgId]
      }
      // 同时清理 recalledMessages，避免内存累积
      for (const msgId in recalledMessages) {
        delete recalledMessages[msgId]
      }
    }

    // 清理过期的撤回消息（超过2分钟的）
    const cleanupExpiredRecalledMessages = () => {
      const now = Date.now()
      for (const msgId in recalledMessages) {
        const msg = recalledMessages[msgId]
        if (now - msg.recallTime > RECALL_EXPIRATION_TIME) {
          delete recalledMessages[msgId]
          if (expirationTimers[msgId]) {
            timerWorker.postMessage({ type: 'clearTimer', msgId })
            delete expirationTimers[msgId]
          }
        }
      }
    }

    // 更新未读消息计数
    const updateTotalUnreadCount = () => {
      // 使用统一的计数管理器（包含朋友圈未读数）
      unreadCountManager.calculateTotal(sessionList.value, globalStore.unReadMark, feedStore.unreadCount)
    }

    // 设置计数管理器的更新回调
    unreadCountManager.setUpdateCallback(() => {
      unreadCountManager.calculateTotal(sessionList.value, globalStore.unReadMark, feedStore.unreadCount)
    })

    // 使用防抖机制的更新函数
    const requestUnreadCountUpdate = (sessionId?: string) => {
      unreadCountManager.requestUpdate(sessionId)
    }

    // 清空所有会话的未读数
    const clearUnreadCount = () => {
      sessionList.value.forEach((session) => {
        session.unreadCount = 0
        persistUnreadCount(session.roomId, 0)
      })
      // 更新全局未读数
      requestUnreadCountUpdate()
    }

    const clearRedundantMessages = (roomId: string, limit: number = pageSize) => {
      const currentMessages = messageMap[roomId]
      if (!currentMessages) return

      // 将消息转换为数组并按消息ID倒序排序，前面的元素代表最新的消息
      const sortedMessages = Object.values(currentMessages).sort((a, b) => Number(b.message.id) - Number(a.message.id))

      if (sortedMessages.length <= limit) {
        return
      }

      const keptMessages = sortedMessages.slice(0, limit)
      const keepMessageIds = new Set(keptMessages.map((msg) => msg.message.id))
      const fallbackCursor = keptMessages[keptMessages.length - 1]?.message.id || ''

      // 删除多余的消息
      for (const msgId in currentMessages) {
        if (!keepMessageIds.has(msgId)) {
          delete currentMessages[msgId]
        }
      }

      if (!messageOptions[roomId]) {
        messageOptions[roomId] = { isLast: false, isLoading: false, cursor: '' }
      }

      // 更新游标为当前内存里最旧的那条消息ID，确保后续「加载更多」能从数据库补齐更早的消息
      if (fallbackCursor) {
        messageOptions[roomId] = {
          ...messageOptions[roomId],
          cursor: fallbackCursor,
          isLast: false
        }
      }

      // 控制台提示裁剪信息，方便定位内存压缩触发点
      console.info(
        '[chat][trim]',
        `roomId=${roomId}`,
        `removed=${sortedMessages.length - keptMessages.length}`,
        `kept=${keptMessages.length}`,
        `limit=${limit}`
      )
    }

    /**
     * 重置并刷新当前聊天室的消息列表
     * @description
     * 清空当前聊天室的所有本地消息缓存，并从服务器重新获取最新的消息列表。
     * 主要用于需要强制刷新消息的场景，确保显示的是最新的服务器数据。
     */
    const resetAndRefreshCurrentRoomMessages = async () => {
      if (!globalStore.currentSessionRoomId) return

      // 保存当前房间ID，用于后续比较
      const requestRoomId = globalStore.currentSessionRoomId

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
        if (globalStore.currentSessionRoomId === requestRoomId) {
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
      clearRoomMessages,
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
      sessionList,
      sessionOptions,
      syncLoading,
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
      cleanupExpiredRecalledMessages,
      updateTotalUnreadCount,
      requestUnreadCountUpdate,
      clearUnreadCount,
      resetAndRefreshCurrentRoomMessages,
      fetchCurrentRoomRemoteOnce,
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
