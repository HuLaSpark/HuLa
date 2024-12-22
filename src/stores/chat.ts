import { defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import apis from '@/services/apis'
import type { MarkItemType, MessageType, RevokedMsgType, SessionItem } from '@/services/types'
import { MarkEnum, MessageStatusEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { computedTimeBlock } from '@/utils/ComputedTime.ts'
import { useCachedStore } from '@/stores/cached.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { cloneDeep } from 'lodash-es'
import { useUserStore } from '@/stores/user.ts'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'

// 定义每页加载的消息数量
export const pageSize = 20
// 标识是否第一次请求
let isFirstInit = false

export const useChatStore = defineStore(
  'chat',
  () => {
    const route = useRoute()
    const cachedStore = useCachedStore()
    const userStore = useUserStore()
    const globalStore = useGlobalStore()
    const groupStore = useGroupStore()
    const contactStore = useContactStore()

    // 会话列表及其相关状态
    const sessionList = reactive<SessionItem[]>([]) // 会话列表
    const sessionOptions = reactive({ isLast: false, isLoading: false, cursor: '' }) // 会话列表的加载状态

    // 当前房间ID和类型的计算属性
    const currentRoomId = computed(() => globalStore.currentSession?.roomId)
    const currentRoomType = computed(() => globalStore.currentSession?.type)

    // 消息相关的响应式数据结构
    const messageMap = reactive<Map<number, Map<number, MessageType>>>(new Map([[currentRoomId.value, new Map()]])) // 存储所有消息的Map
    const messageOptions = reactive<Map<number, { isLast: boolean; isLoading: boolean; cursor: string }>>(
      new Map([[currentRoomId.value, { isLast: false, isLoading: false, cursor: '' }]])
    ) // 消息加载状态
    const replyMapping = reactive<Map<number, Map<number, number[]>>>(new Map([[currentRoomId.value, new Map()]])) // 回复消息的映射关系
    // 存储撤回的消息内容和时间
    const recalledMessages = reactive<Map<number, { content: string; recallTime: number }>>(new Map())

    // 当前聊天室的消息Map计算属性
    const currentMessageMap = computed({
      get: () => {
        const current = messageMap.get(currentRoomId.value as number)
        if (current === undefined) {
          messageMap.set(currentRoomId.value, new Map())
        }
        return messageMap.get(currentRoomId.value as number)
      },
      set: (val) => {
        messageMap.set(currentRoomId.value, val as Map<number, MessageType>)
      }
    })

    // 当前聊天室的消息加载状态计算属性
    const currentMessageOptions = computed({
      get: () => {
        const current = messageOptions.get(currentRoomId.value as number)
        if (current === undefined) {
          messageOptions.set(currentRoomId.value, { isLast: false, isLoading: true, cursor: '' })
        }
        return messageOptions.get(currentRoomId.value as number)
      },
      set: (val) => {
        messageOptions.set(currentRoomId.value, val as { isLast: boolean; isLoading: boolean; cursor: string })
      }
    })

    // 当前聊天室的回复消息映射计算属性
    const currentReplyMap = computed({
      get: () => {
        const current = replyMapping.get(currentRoomId.value as number)
        if (current === undefined) {
          replyMapping.set(currentRoomId.value, new Map())
        }
        return replyMapping.get(currentRoomId.value as number)
      },
      set: (val) => {
        replyMapping.set(currentRoomId.value, val as Map<number, number[]>)
      }
    })

    // 判断当前是否为群聊
    const isGroup = computed(() => currentRoomType.value === RoomTypeEnum.GROUP)

    // 获取当前会话信息的计算属性
    const currentSessionInfo = computed(() =>
      sessionList.find((session) => session.roomId === globalStore.currentSession.roomId)
    )

    // 消息列表滚动到底部的方法引用
    const chatListToBottomAction = ref<() => void>()

    // 新消息计数相关的响应式数据
    const newMsgCount = reactive<Map<number, { count: number; isStart: boolean }>>(
      new Map([
        [
          currentRoomId.value,
          {
            count: 0, // 新消息计数
            isStart: false // 是否开始计数
          }
        ]
      ])
    )

    // 当前聊天室的新消息计数计算属性
    const currentNewMsgCount = computed({
      get: () => {
        const current = newMsgCount.get(currentRoomId.value as number)
        if (current === undefined) {
          newMsgCount.set(currentRoomId.value, { count: 0, isStart: false })
        }
        return newMsgCount.get(currentRoomId.value as number)
      },
      set: (val) => {
        newMsgCount.set(currentRoomId.value, val as { count: number; isStart: boolean })
      }
    })

    // 监听当前房间ID的变化
    watch(currentRoomId, (val, oldVal) => {
      if (oldVal !== undefined && val !== oldVal) {
        // 切换会话，滚动到底部
        chatListToBottomAction.value?.()
        // 切换的 rooms是空数据的话就请求消息列表
        if (!currentMessageMap.value || currentMessageMap.value.size === 0) {
          if (!currentMessageMap.value) {
            messageMap.set(currentRoomId.value as number, new Map())
          }
          getMsgList()
        }

        // 群组的时候去请求
        if (currentRoomType.value === RoomTypeEnum.GROUP) {
          groupStore.getGroupUserList(true)
          groupStore.getCountStatistic()
          cachedStore.getGroupAtUserBaseInfo()
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

      /** 收集需要请求用户详情的 uid */
      const uidCollectYet: Set<number> = new Set() // 去重用
      computedList.forEach((msg) => {
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
      })
      // 获取用户信息缓存
      await cachedStore.getBatchUserInfo([...uidCollectYet])
      // 为保证获取的历史消息在前面
      const newList = [...computedList, ...chatMessageList.value]
      currentMessageMap.value?.clear() // 清空Map
      newList.forEach((msg) => {
        currentMessageMap.value?.set(msg.message.id, msg)
      })

      if (currentMessageOptions.value) {
        currentMessageOptions.value.cursor = data.cursor
        currentMessageOptions.value.isLast = data.isLast
        currentMessageOptions.value.isLoading = false
      }
    }

    // 获取会话列表
    const getSessionList = async (isFresh = false) => {
      if (!isFresh && (sessionOptions.isLast || sessionOptions.isLoading)) return
      sessionOptions.isLoading = true
      const response = await apis
        .getSessionList({
          pageSize: sessionList.length > pageSize ? sessionList.length : pageSize,
          cursor: isFresh || !sessionOptions.cursor ? '' : sessionOptions.cursor
        })
        .catch(() => {
          sessionOptions.isLoading = false
        })
      if (!response) return
      const data = response
      if (!data) {
        return
      }
      isFresh ? sessionList.splice(0, sessionList.length, ...data.list) : sessionList.push(...data.list)
      sessionOptions.cursor = data.cursor
      sessionOptions.isLast = data.isLast
      sessionOptions.isLoading = false

      sortAndUniqueSessionList()

      sessionList[0].unreadCount = 0
      if (!isFirstInit) {
        isFirstInit = true
        globalStore.currentSession.roomId = data.list[0].roomId
        globalStore.currentSession.type = data.list[0].type
        // 用会话列表第一个去请求消息列表
        await getMsgList()
        // 请求第一个群成员列表
        currentRoomType.value === RoomTypeEnum.GROUP && (await groupStore.getGroupUserList(true))
        // 初始化所有用户基本信息
        userStore.isSign && (await cachedStore.initAllUserBaseInfo())
        // 联系人列表
        await contactStore.getContactList(true)
      }
    }

    /** 会话列表去重并排序 */
    const sortAndUniqueSessionList = () => {
      const temp: Record<string, SessionItem> = {}
      sessionList.forEach((item) => (temp[item.roomId] = item))
      sessionList.splice(0, sessionList.length, ...Object.values(temp))
      sessionList.sort((pre, cur) => cur.activeTime - pre.activeTime)
    }

    // 更新会话
    const updateSession = (roomId: number, roomProps: Partial<SessionItem>) => {
      const session = sessionList.find((item) => item.roomId === roomId)
      session && roomProps && Object.assign(session, roomProps)
      sortAndUniqueSessionList()
    }

    // 更新会话最后活跃时间
    const updateSessionLastActiveTime = (roomId: number, room?: SessionItem) => {
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
    const getSession = (roomId: number): SessionItem => {
      return sessionList.find((item) => item.roomId === roomId) as SessionItem
    }

    // 推送消息
    const pushMsg = async (msg: MessageType) => {
      const current = messageMap.get(msg.message.roomId)
      // TODO 超过五分钟发送信息的时候没有显示时间差的时间戳 (nyh -> 2024-05-21 00:17:15)
      current?.set(msg.message.id, msg)

      // 获取用户信息缓存
      const uid = msg.fromUser.uid
      await cachedStore.getBatchUserInfo([uid])

      // 发完消息就要刷新会话列表
      let detailResponse = undefined
      if (!current) {
        detailResponse = await apis.sessionDetail({ id: msg.message.roomId })
      }

      // 更新会话的文本属性以触发重新计算
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
      }

      updateSessionLastActiveTime(msg.message.roomId, detailResponse)

      // 如果收到的消息里面是艾特自己的就发送系统通知
      // if (msg.message.body.atUidList?.includes(userStore.userInfo.uid) && cacheUser) {
      //   notify({
      //     name: cacheUser.name as string,
      //     text: msg.message.body.content,
      //     icon: cacheUser.avatar as string
      //   })
      // }

      // tab 在后台获得新消息，就开始闪烁！
      // if (document.hidden && !shakeTitle.isShaking) {
      //   shakeTitle.start()
      // }

      if (
        currentNewMsgCount.value &&
        currentNewMsgCount.value?.isStart &&
        typeof currentNewMsgCount.value.count === 'number'
      ) {
        currentNewMsgCount.value.count++
        return
      }

      // 聊天记录计数
      if (currentRoomId.value !== msg.message.roomId) {
        const item = sessionList.find((item) => item.roomId === msg.message.roomId)
        if (item) {
          item.unreadCount += 1
          console.log('unreadCount', item.unreadCount)
        }
        // 如果新消息的 roomId 和 当前显示的 room 的 Id 一致，就更新已读
      } else {
        // 且当前路由在 聊天 内
        if (route?.path && route?.path === '/message') {
          await apis.markMsgRead({ roomId: currentRoomId.value })
        }
      }

      // 如果当前路由不是聊天，就开始计数
      if (route?.path !== '/message') {
        globalStore.unReadMark.newMsgUnreadCount++
      } else if (msg.fromUser.uid !== userStore.userInfo.uid && msg.message.roomId !== currentRoomId.value) {
        globalStore.unReadMark.newMsgUnreadCount++
      }

      // 聊天列表滚动到底部
      setTimeout(() => {
        // 如果超过一屏了，不自动滚动到最新消息。
        chatListToBottomAction.value?.()
      }, 0)
    }

    // 过滤掉小黑子的发言
    const filterUser = (uid: number) => {
      for (const messages of messageMap.values()) {
        messages?.forEach((msg) => {
          if (msg.fromUser.uid === uid) {
            messages.delete(msg.message.id)
          }
        })
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
    const getMsgIndex = (msgId: number) => {
      if (!msgId || isNaN(Number(msgId))) return -1
      const keys = currentMessageMap.value ? Array.from(currentMessageMap.value.keys()) : []
      return keys.findIndex((key) => key === msgId)
    }

    // 更新点赞、举报数
    const updateMarkCount = (markList: MarkItemType[]) => {
      markList.forEach((mark: MarkItemType) => {
        const { msgId, markType, markCount } = mark

        const msgItem = currentMessageMap.value?.get(msgId)
        if (msgItem) {
          if (markType === MarkEnum.LIKE) {
            msgItem.message.messageMark.likeCount = markCount
          } else if (markType === MarkEnum.DISLIKE) {
            msgItem.message.messageMark.dislikeCount = markCount
          }
        }
      })
    }

    // 更新消息撤回状态
    const updateRecallStatus = (data: RevokedMsgType) => {
      const { msgId } = data
      const message = currentMessageMap.value?.get(msgId)
      if (message && typeof data.recallUid === 'number') {
        // 存储撤回的消息内容和时间
        recalledMessages.set(msgId, {
          content: message.message.body.content,
          recallTime: Date.now()
        })

        message.message.type = MsgEnum.RECALL
        const cacheUser = cachedStore.userCachedList[data.recallUid]
        // 如果撤回者的 id 不等于消息发送人的 id, 或者你本人就是管理员，那么显示管理员撤回的。
        if (data.recallUid !== message.fromUser.uid) {
          message.message.body = `管理员"${cacheUser.name}"撤回了一条成员消息` // 后期根据本地用户数据修改
        } else {
          // 如果被撤回的消息是消息发送者撤回，正常显示
          message.message.body = `"${cacheUser.name}"撤回了一条消息` // 后期根据本地用户数据修改
        }
      }
      // 更新与这条撤回消息有关的消息
      const messageList = currentReplyMap.value?.get(msgId)
      messageList?.forEach((id) => {
        const msg = currentMessageMap.value?.get(id)
        if (msg) {
          msg.message.body.reply.body = '原消息已被撤回'
        }
      })
    }

    // 获取撤回的消息内容
    const getRecalledMessage = (msgId: number) => {
      return recalledMessages.get(msgId)
    }

    // 删除消息
    const deleteMsg = (msgId: number) => {
      currentMessageMap.value?.delete(msgId)
    }

    // 更新消息
    const updateMsg = ({
      msgId,
      status,
      newMsgId,
      body
    }: {
      msgId: number
      status: MessageStatusEnum
      newMsgId?: number
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
        }
      }
    }

    // 标记已读数为 0
    const markSessionRead = (roomId: number) => {
      const session = sessionList.find((item) => item.roomId === roomId)
      const unreadCount = session?.unreadCount || 0
      if (session) {
        session.unreadCount = 0
      }
      return unreadCount
    }

    // 根据消息id获取消息体
    const getMessage = (messageId: number) => {
      return currentMessageMap.value?.get(messageId)
    }

    // 删除会话
    const removeContact = (roomId: number) => {
      const index = sessionList.findIndex((session) => session.roomId === roomId)
      sessionList.splice(index, 1)
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
      chatListToBottomAction,
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
      recalledMessages
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
