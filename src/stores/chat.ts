import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { cloneDeep } from 'lodash-es'
import { defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import { ErrorType } from '@/common/exception'
import { type MessageStatusEnum, MsgEnum, NotificationTypeEnum, RoomTypeEnum, StoresEnum, TauriCommand } from '@/enums'
import type { MarkItemType, MessageType, RevokedMsgType, SessionItem } from '@/services/types'
import { useCachedStore } from '@/stores/cached.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useUserStore } from '@/stores/user.ts'
import { computedTimeBlock } from '@/utils/ComputedTime.ts'
import { getSessionDetail } from '@/utils/ImRequestUtils'
import { isMac } from '@/utils/PlatformConstants'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'

type RecalledMessage = {
  messageId: string
  content: string
  recallTime: number
}

// 定义每页加载的消息数量
export const pageSize = 20
// 标识是否第一次请求
let isFirstInit = false

// 撤回消息的过期时间
const RECALL_EXPIRATION_TIME = 2 * 60 * 1000 // 2分钟，单位毫秒

// 定义消息数量阈值
const MESSAGE_THRESHOLD = 120
// 定义保留的最新消息数量
const KEEP_MESSAGE_COUNT = 60

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
    const cachedStore = useCachedStore()
    const userStore = useUserStore()
    const globalStore = useGlobalStore()
    const groupStore = useGroupStore()
    const contactStore = useContactStore()

    // 会话列表
    const sessionList = ref<SessionItem[]>([])
    // 会话列表的加载状态
    const sessionOptions = reactive({ isLast: false, isLoading: false, cursor: '' })

    // 当前房间ID和类型的计算属性
    const currentRoomId = computed(() => globalStore.currentSession?.roomId)
    const currentRoomType = computed(() => globalStore.currentSession?.type)

    // 存储所有消息的Map
    const messageMap = reactive<Map<string, Map<string, MessageType>>>(new Map([[currentRoomId.value, new Map()]]))
    // 消息加载状态
    const messageOptions = reactive<Map<string, { isLast: boolean; isLoading: boolean; cursor: string }>>(
      new Map([[currentRoomId.value, { isLast: false, isLoading: false, cursor: '' }]])
    )

    // 回复消息的映射关系
    const replyMapping = reactive<Map<string, Map<string, string[]>>>(new Map([[currentRoomId.value, new Map()]]))
    // 存储撤回的消息内容和时间
    const recalledMessages = reactive<Map<string, RecalledMessage>>(new Map())
    // 存储每条撤回消息的过期定时器
    const expirationTimers = new Map<string, boolean>()

    // 当前聊天室的消息Map计算属性
    const currentMessageMap = computed({
      get: () => {
        const current = messageMap.get(currentRoomId.value)
        if (current === undefined) {
          messageMap.set(currentRoomId.value, new Map())
        }
        return messageMap.get(currentRoomId.value)
      },
      set: (val) => {
        messageMap.set(currentRoomId.value, val as Map<string, MessageType>)
      }
    })

    // 当前聊天室的消息加载状态计算属性
    const currentMessageOptions = computed({
      get: () => {
        const current = messageOptions.get(currentRoomId.value)
        if (current === undefined) {
          messageOptions.set(currentRoomId.value, { isLast: false, isLoading: true, cursor: '' })
        }
        return messageOptions.get(currentRoomId.value)
      },
      set: (val) => {
        messageOptions.set(currentRoomId.value, val as { isLast: boolean; isLoading: boolean; cursor: string })
      }
    })

    // 当前聊天室的回复消息映射计算属性
    const currentReplyMap = computed({
      get: () => {
        const current = replyMapping.get(currentRoomId.value)
        if (current === undefined) {
          replyMapping.set(currentRoomId.value, new Map())
        }
        return replyMapping.get(currentRoomId.value)
      },
      set: (val) => {
        replyMapping.set(currentRoomId.value, val as Map<string, string[]>)
      }
    })

    // 判断当前是否为群聊
    const isGroup = computed(() => currentRoomType.value === RoomTypeEnum.GROUP)

    // 获取当前会话信息的计算属性
    const currentSessionInfo = computed(() =>
      sessionList.value.find((session) => session.roomId === globalStore.currentSession.roomId)
    )

    // 新消息计数相关的响应式数据
    const newMsgCount = reactive<Map<string, { count: number; isStart: boolean }>>(
      new Map([
        [
          currentRoomId.value,
          {
            count: 0,
            isStart: false
          }
        ]
      ])
    )

    // 当前聊天室的新消息计数计算属性
    const currentNewMsgCount = computed({
      get: () => {
        const current = newMsgCount.get(currentRoomId.value)
        if (current === undefined) {
          newMsgCount.set(currentRoomId.value, { count: 0, isStart: false })
        }
        return newMsgCount.get(currentRoomId.value)
      },
      set: (val) => {
        newMsgCount.set(currentRoomId.value, val as { count: number; isStart: boolean })
      }
    })

    // 监听当前房间ID的变化
    watch(
      () => globalStore.currentSession,
      async (val, _) => {
        const currentSession = {
          ...val
        }
        if (WebviewWindow.getCurrent().label !== 'home') {
          return
        }

        // 1. 立即清空当前消息列表
        // if (currentMessageMap.value) {
        //   currentMessageMap.value.clear()
        // }

        // 2. 重置消息加载状态
        currentMessageOptions.value = {
          isLast: false,
          isLoading: true,
          cursor: ''
        }

        // 3. 清空回复映射
        if (currentReplyMap.value) {
          currentReplyMap.value.clear()
        }

        // 4. 尝试从服务器加载新房间的消息
        nextTick(async () => {
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
        })

        // 标记当前会话已读
        if (val) {
          const session = sessionList.value.find((s) => s.roomId === currentSession.roomId)
          if (session?.unreadCount) {
            markSessionRead(currentSession.roomId)
            updateTotalUnreadCount()
          }
        }

        // 重置当前回复的消息
        currentMsgReply.value = {}
      },
      {
        deep: true
      }
    )

    // 当前消息回复
    const currentMsgReply = ref<Partial<MessageType>>({})

    // 将消息列表转换为数组
    const chatMessageList = computed(() => [...(currentMessageMap.value?.values() || [])])

    // 获取消息列表
    const getMsgList = async (size = pageSize, isSwitching = false) => {
      // 获取当前房间ID，用于后续比较
      const requestRoomId = currentRoomId.value

      currentMessageOptions.value && (currentMessageOptions.value.isLoading = true)
      const data: any = await invokeWithErrorHandler(
        TauriCommand.PAGE_MSG,
        {
          param: {
            pageSize: size,
            cursor: currentMessageOptions.value?.cursor,
            roomId: requestRoomId
          }
        },
        {
          customErrorMessage: '获取消息列表失败',
          errorType: ErrorType.Network
        }
      ).finally(() => {
        // 只有当当前房间ID仍然是请求时的房间ID时，才更新加载状态
        if (requestRoomId === currentRoomId.value && currentMessageOptions.value) {
          currentMessageOptions.value.isLoading = false
        }
      })
      // 如果没有数据或者房间ID已经变化，则不处理响应
      if (!data || requestRoomId !== currentRoomId.value) return

      const computedList = computedTimeBlock(data.list)

      /** 收集需要请求用户详情的 uid */
      const uidCollectYet: Set<string> = new Set() // 去重用
      for (const msg of computedList) {
        const replyItem = msg.message.body?.reply
        if (replyItem?.id) {
          const messageIds = currentReplyMap.value?.get(replyItem.id) || []
          messageIds.push(msg.message.id)
          currentReplyMap.value?.set(replyItem.id, messageIds)

          // 查询被回复用户的信息，被回复的用户信息里暂时无 uid
          // collectUidItem(replyItem.uid)
        }
        // 查询消息发送者的信息
        uidCollectYet.add(msg.fromUser.uid)
      }
      // 获取用户信息缓存
      await cachedStore.getBatchUserInfo([...uidCollectYet])

      // 再次检查房间ID是否变化，防止在获取用户信息期间切换了房间
      if (requestRoomId !== currentRoomId.value) return

      // 为保证获取的历史消息在前面
      const newList = isSwitching ? computedList : [...computedList, ...chatMessageList.value]
      // 构建新 Map 后一次性替换，避免清空帧导致 UI 闪烁
      const nextMap = new Map<string, MessageType>()
      for (const msg of newList) {
        nextMap.set(msg.message.id, msg)
      }
      currentMessageMap.value = nextMap

      if (currentMessageOptions.value) {
        currentMessageOptions.value.cursor = data.cursor
        currentMessageOptions.value.isLast = data.isLast
        currentMessageOptions.value.isLoading = false
      }
    }

    // 获取会话列表
    const getSessionList = async (isFresh = false) => {
      try {
        if (sessionOptions.isLoading) return
        sessionOptions.isLoading = true
        console.log('获取会话列表')
        const response: any = await invokeWithErrorHandler(TauriCommand.LIST_CONTACTS, undefined, {
          customErrorMessage: '获取会话列表失败22',
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

        // 保存当前选中的会话ID
        const currentSelectedRoomId = globalStore.currentSession.roomId

        sessionList.value = []
        sessionList.value.push(...data)
        sessionOptions.isLoading = false

        sortAndUniqueSessionList()

        // sessionList[0].unreadCount = 0
        if (!isFirstInit || isFresh) {
          isFirstInit = true
          // 只有在没有当前选中会话时，才设置第一个会话为当前会话
          if (!currentSelectedRoomId || currentSelectedRoomId === '1') {
            globalStore.currentSession.roomId = data[0].roomId
            globalStore.currentSession.type = data[0].type
          }

          // 用会话列表第一个去请求消息列表
          await getMsgList()
          // 请求第一个群成员列表
          currentRoomType.value === RoomTypeEnum.GROUP &&
            (await groupStore.getGroupUserList(globalStore.currentSession.roomId))
          // 初始化所有用户基本信息
          userStore.isSign && (await cachedStore.initAllUserBaseInfo())
          // 联系人列表
          await contactStore.getContactList(true)

          // 确保在会话列表加载完成后更新总未读数
          await nextTick(() => {
            updateTotalUnreadCount()
          })
        }
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
          updateTotalUnreadCount()
        }
      }
    }

    // 更新会话最后活跃时间
    const updateSessionLastActiveTime = (roomId: string, room?: SessionItem) => {
      const session = sessionList.value.find((item) => item.roomId === roomId)
      if (session) {
        Object.assign(session, { activeTime: Date.now() })
      } else if (room) {
        const newItem = cloneDeep(room)
        newItem.activeTime = Date.now()
        sessionList.value.unshift(newItem)
      }
      sortAndUniqueSessionList()
    }

    // 通过房间ID获取会话信息
    const getSession = (roomId: string): SessionItem => {
      return sessionList.value.find((item) => item.roomId === roomId) as SessionItem
    }

    // 推送消息
    const pushMsg = async (msg: MessageType) => {
      const current = messageMap.get(msg.message.roomId)
      current?.set(msg.message.id, msg)

      // 检查消息数量是否超过阈值
      if (current && current.size > MESSAGE_THRESHOLD) {
        // 获取所有消息ID并按时间排序
        const messageIds = Array.from(current.keys())
        const messagesToDelete = messageIds.slice(0, messageIds.length - KEEP_MESSAGE_COUNT)

        // 删除旧消息
        messagesToDelete.forEach((id) => current.delete(id))
      }

      // 获取用户信息缓存
      const uid = msg.fromUser.uid
      const cacheUser = cachedStore.userCachedList[uid]
      await cachedStore.getBatchUserInfo([uid])

      // 发完消息就要刷新会话列表
      let detailResponse
      if (!current) {
        detailResponse = await getSessionDetail({ id: msg.message.roomId })
      }

      // 更新会话的文本属性和未读数
      const session = sessionList.value.find((item) => item.roomId === msg.message.roomId)
      if (session) {
        const lastMsgUserName = cachedStore.userCachedList[uid]?.name
        const formattedText =
          msg.message.type === MsgEnum.RECALL
            ? session.type === RoomTypeEnum.GROUP
              ? `${lastMsgUserName}:撤回了一条消息`
              : msg.fromUser.uid === userStore.userInfo.uid
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
        if (msg.fromUser.uid !== userStore.userInfo.uid) {
          if (route?.path !== '/message' || msg.message.roomId !== currentRoomId.value) {
            session.unreadCount = (session.unreadCount || 0) + 1
            await nextTick(() => {
              updateTotalUnreadCount()
            })
          }
        }
      }

      updateSessionLastActiveTime(msg.message.roomId, detailResponse)

      // 如果收到的消息里面是艾特自己的就发送系统通知
      if (msg.message.body.atUidList?.includes(userStore.userInfo.uid) && cacheUser) {
        sendNotification({
          title: cacheUser.name as string,
          body: msg.message.body.content,
          icon: cacheUser.avatar as string
        })
      }

      // if (currentNewMsgCount.value) {
      //   currentNewMsgCount.value.count++
      //   return
      // }
    }

    // 过滤掉拉黑用户的发言
    const filterUser = (uid: string) => {
      for (const messages of messageMap.values()) {
        for (const msg of messages.values()) {
          if (msg.fromUser.uid === uid) {
            messages.delete(msg.message.id)
          }
        }
      }
    }

    // 加载更多消息
    const loadMore = async (size?: number) => {
      if (currentMessageOptions.value?.isLast || currentMessageOptions.value?.isLoading) return
      await getMsgList(size)
    }

    /** 清除新消息计数 */
    const clearNewMsgCount = () => {
      currentNewMsgCount.value && (currentNewMsgCount.value.count = 0)
    }

    // 查找消息在列表里面的索引
    const getMsgIndex = (msgId: string) => {
      if (!msgId) return -1
      const keys = currentMessageMap.value ? Array.from(currentMessageMap.value.keys()) : []
      return keys.indexOf(msgId)
    }

    // 更新所有标记类型的数量
    const updateMarkCount = async (markList: MarkItemType[]) => {
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

        const msgItem = currentMessageMap.value?.get(String(msgId))
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
            if (uid === userStore.userInfo.uid) {
              currentMarkStat.userMarked = true
            }
            // 更新计数
            currentMarkStat.count = markCount
          } else if (actType === 2) {
            // 取消标记
            // 如果是当前用户的操作，设置userMarked为false
            if (uid === userStore.userInfo.uid) {
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

    // 更新消息撤回状态
    const updateRecallStatus = async (data: RevokedMsgType) => {
      const { msgId } = data
      const message = currentMessageMap.value?.get(msgId)
      if (message && typeof data.recallUid === 'string') {
        // 存储撤回的消息内容和时间
        const recallTime = Date.now()
        recalledMessages.set(msgId, {
          messageId: msgId,
          content: message.message.body.content,
          recallTime
        })

        if (message.fromUser.uid === userStore.userInfo.uid) {
          // 使用 Worker 来处理定时器
          timerWorker.postMessage({
            type: 'startTimer',
            msgId,
            duration: RECALL_EXPIRATION_TIME
          })
        }

        // 记录这个消息ID已经有了定时器
        expirationTimers.set(msgId, true)

        const cacheUser = cachedStore.userCachedList[data.recallUid]
        let recallMessageBody: string

        // 如果撤回者的 id 不等于消息发送人的 id, 或者你本人就是管理员，那么显示管理员撤回的。
        if (data.recallUid !== message.fromUser.uid) {
          recallMessageBody = `管理员"${cacheUser.name}"撤回了一条消息` // 后期根据本地用户数据修改
        } else {
          // 如果被撤回的消息是消息发送者撤回，正常显示
          recallMessageBody = `"${cacheUser.name}"撤回了一条消息` // 后期根据本地用户数据修改
        }

        // 更新前端缓存
        message.message.type = MsgEnum.RECALL
        message.message.body = recallMessageBody

        // 同步更新 SQLite 数据库
        try {
          await invokeWithErrorHandler(
            TauriCommand.UPDATE_MESSAGE_RECALL_STATUS,
            {
              messageId: msgId,
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
      const messageList = currentReplyMap.value?.get(msgId)
      if (messageList) {
        for (const id of messageList) {
          const msg = currentMessageMap.value?.get(id)
          if (msg) {
            msg.message.body.reply.body = '原消息已被撤回'
          }
        }
      }
    }

    // 添加一个工具函数来触发消息列表更新
    const triggerMessageMapUpdate = () => {
      if (currentMessageMap.value) {
        const newMap = new Map(currentMessageMap.value)
        currentMessageMap.value = newMap
      }
    }

    // 获取撤回消息
    const getRecalledMessage = (msgId: string): RecalledMessage | undefined => {
      return recalledMessages.get(msgId)
    }

    // 删除消息
    const deleteMsg = (msgId: string) => {
      currentMessageMap.value?.delete(msgId)
    }

    // 更新消息
    const updateMsg = ({
      msgId,
      status,
      newMsgId,
      body,
      uploadProgress
    }: {
      msgId: string
      status: MessageStatusEnum
      newMsgId?: string
      body?: any
      uploadProgress?: number
    }) => {
      const msg = currentMessageMap.value?.get(msgId)
      if (msg) {
        msg.message.status = status
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
          currentMessageMap.value?.set(msg.message.id, updatedMsg)
          // 强制触发响应式更新
          messageMap.set(currentRoomId.value, new Map(currentMessageMap.value))
        } else {
          currentMessageMap.value?.set(msg.message.id, msg)
        }
        if (newMsgId && msgId !== newMsgId) {
          currentMessageMap.value?.delete(msgId)
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
      return currentMessageMap.value?.get(messageId)
    }

    // 删除会话
    const removeContact = (roomId: string) => {
      const index = sessionList.value.findIndex((session) => session.roomId === roomId)
      if (index !== -1) {
        sessionList.value.splice(index, 1)
        // 删除会话后更新未读计数
        nextTick(() => {
          updateTotalUnreadCount()
        })
      }
    }

    // 监听 Worker 消息
    timerWorker.onmessage = (e) => {
      const { type, msgId } = e.data

      if (type === 'timeout') {
        console.log(`[Timeout] 消息ID: ${msgId} 已过期`)
        recalledMessages.delete(msgId)
        expirationTimers.delete(msgId)
        triggerMessageMapUpdate()
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
      expirationTimers.forEach((_, msgId) => {
        // 通知 worker 停止对应的定时器
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId
        })
      })
      expirationTimers.clear()
    }

    // 更新未读消息计数
    const updateTotalUnreadCount = async () => {
      info('[chat]更新全局未读消息计数')
      // 使用 Array.from 确保遍历的是最新的 sessionList
      const totalUnread = Array.from(sessionList.value).reduce((total, session) => {
        // 免打扰的会话不计入全局未读数
        if (session.muteNotification === NotificationTypeEnum.NOT_DISTURB) {
          return total
        }
        // 确保 unreadCount 是数字且不为负数
        const unread = Math.max(0, session.unreadCount || 0)
        return total + unread
      }, 0)

      // 更新全局 store 中的未读计数
      globalStore.unReadMark.newMsgUnreadCount = totalUnread
      // 更新系统托盘图标上的未读数
      if (isMac()) {
        const count = totalUnread > 0 ? totalUnread : undefined
        await invokeWithErrorHandler('set_badge_count', { count })
      }
    }

    // 清空所有会话的未读数
    const clearUnreadCount = () => {
      sessionList.value.forEach((session) => {
        session.unreadCount = 0
      })
      // 更新全局未读数
      updateTotalUnreadCount()
    }

    // 重置当前聊天室的消息并刷新最新消息
    const resetAndRefreshCurrentRoomMessages = async () => {
      if (!currentRoomId.value) return

      // 保存当前房间ID，用于后续比较
      const requestRoomId = currentRoomId.value

      try {
        // 1. 清空当前消息列表
        if (currentMessageMap.value) {
          currentMessageMap.value.clear()
        }

        // 2. 重置消息加载状态
        if (currentMessageOptions.value) {
          currentMessageOptions.value = {
            isLast: false,
            isLoading: true,
            cursor: ''
          }
        }

        // 3. 清空回复映射
        if (currentReplyMap.value) {
          currentReplyMap.value.clear()
        }

        // 4. 从服务器获取最新的消息（默认20条）
        await getMsgList(pageSize)

        console.log('[Network] 已重置并刷新当前聊天室的消息列表')
      } catch (error) {
        console.error('[Network] 重置并刷新消息列表失败:', error)
        // 如果获取失败，确保重置加载状态
        if (currentRoomId.value === requestRoomId && currentMessageOptions.value) {
          currentMessageOptions.value = {
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

    const removeSession = (roomId: string) => {
      sessionList.value = sessionList.value.filter((session) => session.roomId !== roomId)
    }

    return {
      getMsgIndex,
      chatMessageList,
      pushMsg,
      deleteMsg,
      clearNewMsgCount,
      updateMarkCount,
      updateRecallStatus,
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
      removeContact,
      getRecalledMessage,
      recalledMessages,
      clearAllExpirationTimers,
      updateTotalUnreadCount,
      clearUnreadCount,
      resetAndRefreshCurrentRoomMessages,
      getGroupSessions,
      removeSession
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
