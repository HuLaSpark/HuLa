import { defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import apis from '@/services/apis'
import type { MarkItemType, MessageType, RevokedMsgType, SessionItem } from '@/services/types'
import { MarkEnum, MessageStatusEnum, MsgEnum, RoomTypeEnum, StoresEnum } from '@/enums'
import { computedTimeBlock } from '@/utils/ComputedTime.ts'
import { useCachedStore } from '@/stores/cached.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { cloneDeep } from 'lodash-es'
import { useUserStore } from '@/stores/user.ts'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { invoke } from '@tauri-apps/api/core'
import { MessageDbService, SessionDbService } from '@/services/dbService'
import { error } from '@tauri-apps/plugin-log'

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
    const cachedStore = useCachedStore()
    const userStore = useUserStore()
    const globalStore = useGlobalStore()
    const groupStore = useGroupStore()
    const contactStore = useContactStore()

    // 会话列表
    const sessionList = reactive<SessionItem[]>([])
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
      sessionList.find((session) => session.roomId === globalStore.currentSession.roomId)
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
    watch(currentRoomId, (val, oldVal) => {
      if (oldVal !== undefined && val !== oldVal) {
        // TODO: 后续增加消息池优化 存储到sqlite
        // 1. 立即清空当前消息列表
        if (currentMessageMap.value) {
          currentMessageMap.value.clear()
        }

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

        // 4. 使用 nextTick 确保状态已更新
        nextTick(async () => {
          try {
            // 5. 重新加载消息
            await getMsgList()
          } catch (error) {
            console.error('无法加载消息:', error)
            currentMessageOptions.value = {
              isLast: false,
              isLoading: false,
              cursor: ''
            }
          }
        })

        // 群组的时候去请求
        if (currentRoomType.value === RoomTypeEnum.GROUP) {
          groupStore.getGroupUserList(true)
          groupStore.getCountStatistic()
          cachedStore.getGroupAtUserBaseInfo()
        }

        // 标记当前会话已读
        if (val) {
          const session = sessionList.find((s) => s.roomId === val)
          if (session?.unreadCount) {
            markSessionRead(val)
            updateTotalUnreadCount()
          }
        }
      }

      // 重置当前回复的消息
      currentMsgReply.value = {}
    })

    // 当前消息回复
    const currentMsgReply = ref<Partial<MessageType>>({})

    // 将消息列表转换为数组
    const chatMessageList = computed(() => [...(currentMessageMap.value?.values() || [])])

    // 获取消息列表
    const getMsgList = async (size = pageSize) => {
      currentMessageOptions.value && (currentMessageOptions.value.isLoading = true)

      try {
        // 首先尝试从本地数据库获取消息
        const localMessages = await MessageDbService.getMessagesByRoomId(
          currentRoomId.value,
          size,
          currentMessageOptions.value?.cursor
        )

        // 如果本地数据库有数据并且不是第一次加载(无游标)，直接使用本地数据
        if (localMessages.list.length > 0 && currentMessageOptions.value?.cursor) {
          // 处理消息列表
          processMessages(localMessages.list)

          // 更新分页信息
          if (currentMessageOptions.value) {
            currentMessageOptions.value.cursor = localMessages.cursor
            currentMessageOptions.value.isLast = localMessages.isLast
            currentMessageOptions.value.isLoading = false
          }

          return
        }

        // 本地没有数据或是第一次加载，则从API获取
        const data = await apis
          .getMsgList({
            pageSize: size,
            cursor: currentMessageOptions.value?.cursor,
            roomId: currentRoomId.value
          })
          .finally(() => {
            currentMessageOptions.value && (currentMessageOptions.value.isLoading = false)
          })

        if (!data) return
        const computedList = computedTimeBlock(data.list)

        // 处理消息列表
        processMessages(computedList)

        // 更新分页信息
        if (currentMessageOptions.value) {
          currentMessageOptions.value.cursor = data.cursor
          currentMessageOptions.value.isLast = data.isLast
          currentMessageOptions.value.isLoading = false
        }

        // 将获取的数据保存到本地数据库
        await MessageDbService.saveMessages(computedList)
      } catch (err) {
        error(`加载消息失败: ${err}`)
        if (currentMessageOptions.value) {
          currentMessageOptions.value.isLoading = false
        }
      }
    }

    // 处理消息列表的辅助函数
    const processMessages = (messageList: MessageType[]) => {
      /** 收集需要请求用户详情的 uid */
      const uidCollectYet: Set<string> = new Set() // 去重用
      for (const msg of messageList) {
        const replyItem = msg.message.body?.reply
        if (replyItem?.id) {
          const messageIds = currentReplyMap.value?.get(replyItem.id) || []
          messageIds.push(msg.message.id)
          currentReplyMap.value?.set(replyItem.id, messageIds)
        }
        // 查询消息发送者的信息
        uidCollectYet.add(msg.fromUser.uid)
      }

      // 获取用户信息缓存
      cachedStore.getBatchUserInfo([...uidCollectYet])

      // 为保证获取的历史消息在前面
      const newList = [...messageList, ...chatMessageList.value]
      currentMessageMap.value?.clear() // 清空Map
      for (const msg of newList) {
        currentMessageMap.value?.set(msg.message.id, msg)
      }
    }

    // 获取会话列表
    const getSessionList = async (isFresh = false) => {
      if (!isFresh && (sessionOptions.isLast || sessionOptions.isLoading)) return
      sessionOptions.isLoading = true

      try {
        // 首先尝试从本地数据库获取会话列表
        const localSessions = await SessionDbService.getSessionList(
          sessionList.length > 100 ? sessionList.length : 100,
          isFresh || !sessionOptions.cursor ? '' : sessionOptions.cursor
        )

        // 如果本地数据库有数据并且不是刷新操作，直接使用本地数据
        if (localSessions.list.length > 0 && !isFresh) {
          // 更新会话列表
          isFresh
            ? sessionList.splice(0, sessionList.length, ...localSessions.list)
            : sessionList.push(...localSessions.list)
          sessionOptions.cursor = localSessions.cursor
          sessionOptions.isLast = localSessions.isLast
          sessionOptions.isLoading = false

          sortAndUniqueSessionList()

          // 处理会话加载完成后的操作
          handleSessionsLoaded(isFresh)
          return
        }

        // 本地没有数据或是刷新操作，则从API获取
        const response = await apis
          .getSessionList({
            pageSize: sessionList.length > 100 ? sessionList.length : 100,
            cursor: isFresh || !sessionOptions.cursor ? '' : sessionOptions.cursor
          })
          .catch(() => {
            sessionOptions.isLoading = false
          })

        if (!response) return
        const data = response
        if (!data) return

        // 更新会话列表
        isFresh ? sessionList.splice(0, sessionList.length, ...data.list) : sessionList.push(...data.list)
        sessionOptions.cursor = data.cursor
        sessionOptions.isLast = data.isLast
        sessionOptions.isLoading = false

        sortAndUniqueSessionList()

        // 处理会话加载完成后的操作
        handleSessionsLoaded(isFresh)

        // 将获取的数据保存到本地数据库
        await SessionDbService.saveSessions(sessionList)
      } catch (err) {
        error(`加载会话列表失败: ${err}`)
        sessionOptions.isLoading = false
      }
    }

    // 处理会话加载完成后的操作
    const handleSessionsLoaded = async (isFresh: boolean) => {
      // 保存当前选中的会话ID
      const currentSelectedRoomId = globalStore.currentSession.roomId

      if (!isFirstInit || isFresh) {
        isFirstInit = true
        // 只有在没有当前选中会话时，才设置第一个会话为当前会话
        if (!currentSelectedRoomId || currentSelectedRoomId === '1') {
          globalStore.currentSession.roomId = sessionList[0]?.roomId || ''
          globalStore.currentSession.type = sessionList[0]?.type || RoomTypeEnum.GROUP
        }

        // 请求消息列表
        await getMsgList()

        // 请求第一个群成员列表
        currentRoomType.value === RoomTypeEnum.GROUP && (await groupStore.getGroupUserList(true))

        // 初始化所有用户基本信息
        userStore.isSign && (await cachedStore.initAllUserBaseInfo())

        // 联系人列表
        await contactStore.getContactList(true)

        // 确保在会话列表加载完成后更新总未读数
        await nextTick(() => {
          updateTotalUnreadCount()
        })
      }
    }

    /** 会话列表去重并排序 */
    const sortAndUniqueSessionList = () => {
      const temp: Record<string, SessionItem> = {}
      for (const item of sessionList) {
        temp[item.roomId] = item
      }
      sessionList.splice(0, sessionList.length, ...Object.values(temp))
      sessionList.sort((pre, cur) => cur.activeTime - pre.activeTime)
    }

    // 更新会话
    const updateSession = (roomId: string, roomProps: Partial<SessionItem>) => {
      const session = sessionList.find((item) => item.roomId === roomId)
      session && roomProps && Object.assign(session, roomProps)
      sortAndUniqueSessionList()
    }

    // 更新会话最后活跃时间
    const updateSessionLastActiveTime = (roomId: string, room?: SessionItem) => {
      const session = sessionList.find((item) => item.roomId === roomId)
      if (session) {
        Object.assign(session, { activeTime: Date.now() })
      } else if (room) {
        const newItem = cloneDeep(room)
        newItem.activeTime = Date.now()
        sessionList.unshift(newItem)
      }
      sortAndUniqueSessionList()
    }

    // 通过房间ID获取会话信息
    const getSession = (roomId: string): SessionItem => {
      return sessionList.find((item) => item.roomId === roomId) as SessionItem
    }

    // 推送消息
    const pushMsg = async (msg: MessageType) => {
      console.log('开始推送消息:', msg.message.id)
      const current = messageMap.get(msg.message.roomId)
      current?.set(msg.message.id, msg)

      // 检查消息数量是否超过阈值
      if (current && current.size > MESSAGE_THRESHOLD) {
        // 获取所有消息ID并按时间排序
        const messageIds = Array.from(current.keys())
        const messagesToDelete = messageIds.slice(0, messageIds.length - KEEP_MESSAGE_COUNT)

        // 删除旧消息
        messagesToDelete.forEach((id) => current.delete(id))

        // 清理本地数据库中的旧消息
        try {
          await MessageDbService.cleanupOldMessages(msg.message.roomId, KEEP_MESSAGE_COUNT)
          console.log(`清理旧消息成功, 保留${KEEP_MESSAGE_COUNT}条最新消息`)
        } catch (err) {
          console.error('清理旧消息失败:', err)
        }
      }

      // 获取用户信息缓存
      const uid = msg.fromUser.uid
      const cacheUser = cachedStore.userCachedList[uid]
      await cachedStore.getBatchUserInfo([uid])

      // 发完消息就要刷新会话列表
      let detailResponse = undefined
      if (!current) {
        detailResponse = await apis.sessionDetail({ id: msg.message.roomId })
      }

      // 更新会话的文本属性和未读数
      const session = sessionList.find((item) => item.roomId === msg.message.roomId)
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

        // 更新本地数据库中的会话信息
        try {
          await SessionDbService.saveSession(session)
          console.log('会话信息保存成功:', session.roomId)
        } catch (err) {
          console.error('保存会话信息失败:', err)
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

      // 将新消息保存到本地数据库
      try {
        console.log('开始将消息保存到数据库:', msg.message.id)
        const result = await MessageDbService.saveMessage(msg)
        if (result) {
          console.log('消息保存到数据库成功:', msg.message.id)
        } else {
          console.error('消息保存到数据库失败:', msg.message.id)
        }
      } catch (err) {
        console.error('保存消息到数据库时发生异常:', err)
      }
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
      return keys.findIndex((key) => key === msgId)
    }

    // 更新点赞、举报数
    const updateMarkCount = (markList: MarkItemType[]) => {
      for (const mark of markList) {
        const { msgId, markType, markCount } = mark

        const msgItem = currentMessageMap.value?.get(msgId)
        if (msgItem) {
          if (markType === MarkEnum.LIKE) {
            msgItem.message.messageMark.likeCount = markCount
          } else if (markType === MarkEnum.DISLIKE) {
            msgItem.message.messageMark.dislikeCount = markCount
          }
        }
      }
    }

    // 更新消息撤回状态 TODO: 撤回消息消息计数没有改变
    const updateRecallStatus = (data: RevokedMsgType) => {
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

        message.message.type = MsgEnum.RECALL
        const cacheUser = cachedStore.userCachedList[data.recallUid]
        // 如果撤回者的 id 不等于消息发送人的 id, 或者你本人就是管理员，那么显示管理员撤回的。
        if (data.recallUid !== message.fromUser.uid) {
          message.message.body = `管理员"${cacheUser.name}"撤回了一条消息` // 后期根据本地用户数据修改
        } else {
          // 如果被撤回的消息是消息发送者撤回，正常显示
          message.message.body = `"${cacheUser.name}"撤回了一条消息` // 后期根据本地用户数据修改
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
    const updateMsg = async ({
      msgId,
      status,
      newMsgId,
      body
    }: {
      msgId: string
      status: MessageStatusEnum
      newMsgId?: string
      body?: any
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
        currentMessageMap.value?.set(msg.message.id, msg)
        if (newMsgId && msgId !== newMsgId) {
          currentMessageMap.value?.delete(msgId)

          // 更新本地数据库中的消息ID
          await MessageDbService.updateMessageId(msgId, newMsgId)
        } else {
          // 更新本地数据库中的消息状态
          await MessageDbService.updateMessageStatus(msgId, status)
        }
      }
    }

    // 标记已读数为 0
    const markSessionRead = async (roomId: string) => {
      const session = sessionList.find((item) => item.roomId === roomId)
      const unreadCount = session?.unreadCount || 0
      if (session && session.unreadCount > 0) {
        session.unreadCount = 0
        // 使用 nextTick 确保状态更新后再计算总未读数
        nextTick(() => {
          updateTotalUnreadCount()
        })

        // 更新本地数据库中的未读数
        await SessionDbService.updateUnreadCount(roomId, 0)
      }
      return unreadCount
    }

    // 根据消息id获取消息体
    const getMessage = (messageId: string) => {
      return currentMessageMap.value?.get(messageId)
    }

    // 删除会话
    const removeContact = async (roomId: string) => {
      const index = sessionList.findIndex((session) => session.roomId === roomId)
      if (index !== -1) {
        sessionList.splice(index, 1)
        // 删除会话后更新未读计数
        nextTick(() => {
          updateTotalUnreadCount()
        })

        // 从本地数据库中删除会话
        await SessionDbService.deleteSession(roomId)
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

    // 更新全局未读数
    const updateTotalUnreadCount = async () => {
      // 使用 Array.from 确保遍历的是最新的 sessionList
      const totalUnread = Array.from(sessionList).reduce((total, session) => {
        // 确保 unreadCount 是数字且不为负数
        const unread = Math.max(0, session.unreadCount || 0)
        return total + unread
      }, 0)

      // 更新全局 store 中的未读计数
      globalStore.unReadMark.newMsgUnreadCount = totalUnread
      // 更新系统托盘图标上的未读数
      invoke('set_badge_count', { count: totalUnread > 0 ? totalUnread : null })
    }

    // 清空所有未读数
    const clearUnreadCount = async () => {
      // 清空所有会话的未读数
      for (const session of sessionList) {
        session.unreadCount = 0
        // 更新本地数据库中的未读数
        await SessionDbService.updateUnreadCount(session.roomId, 0)
      }
      // 更新全局未读数
      updateTotalUnreadCount()
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
      clearUnreadCount
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
