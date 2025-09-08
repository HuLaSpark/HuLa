<template>
  <div id="layout" class="flex size-full min-w-310px bg-[--right-bg-color]">
    <Suspense>
      <template #default>
        <div class="flex size-full">
          <!-- 使用keep-alive包裹异步组件 -->
          <keep-alive>
            <AsyncLeft />
          </keep-alive>
          <keep-alive>
            <AsyncCenter />
          </keep-alive>
          <keep-alive>
            <AsyncRight v-if="!shrinkStatus" />
          </keep-alive>
        </div>
      </template>
      <template #fallback>
        <div class="flex items-center justify-center size-full">
          <LoadingSpinner :percentage="loadingPercentage" :loading-text="loadingText" />
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import { LogicalSize } from '@tauri-apps/api/dpi'
import { emitTo, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { ChangeTypeEnum, MittEnum, ModalEnum, NotificationTypeEnum, OnlineEnum, TauriCommand } from '@/enums'
import { useCheckUpdate } from '@/hooks/useCheckUpdate'
import { useMitt } from '@/hooks/useMitt.ts'
import type { MarkItemType, MessageType, RevokedMsgType, UserItem } from '@/services/types.ts'
import rustWebSocketClient from '@/services/webSocketRust'
import {
  type LoginSuccessResType,
  type OnStatusChangeType,
  WsResponseMessageType,
  type WsTokenExpire
} from '@/services/wsType.ts'
import { useChatStore } from '@/stores/chat'
import { useConfigStore } from '@/stores/config'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { audioManager } from '@/utils/AudioManager'
import { isWindows } from '@/utils/PlatformConstants'
import { clearListener, initListener, readCountQueue } from '@/utils/ReadCountQueue'
import { invokeSilently } from '@/utils/TauriInvokeHandler'
import { useLogin } from '../hooks/useLogin'

const appWindow = WebviewWindow.getCurrent()
const loadingPercentage = ref(10)
const loadingText = ref('正在加载应用...')

// 修改异步组件的加载配置
const AsyncLeft = defineAsyncComponent({
  loader: async () => {
    loadingText.value = '正在加载左侧面板...'
    const comp = await import('./left/index.vue')
    loadingPercentage.value = 33
    return comp
  },
  delay: 600,
  timeout: 3000
})

const AsyncCenter = defineAsyncComponent({
  loader: async () => {
    await import('./left/index.vue')
    loadingText.value = '正在加载中间面板...'
    const comp = await import('./center/index.vue')

    // 加载所有会话
    await chatStore.getSessionList(true)
    // 设置全局会话为第一个
    globalStore.currentSessionRoomId = chatStore.sessionList[0].roomId

    // 加载所有群的成员数据
    const groupSessions = chatStore.getGroupSessions()
    await Promise.all([
      ...groupSessions.map((session) => groupStore.getGroupUserList(session.roomId, true)),
      groupStore.setGroupDetails(),
      chatStore.setAllSessionMsgList(1)
    ])

    loadingPercentage.value = 66
    return comp
  }
})

const AsyncRight = defineAsyncComponent({
  loader: async () => {
    await import('./center/index.vue')
    loadingText.value = '正在加载右侧面板...'
    const comp = await import('./right/index.vue')
    loadingPercentage.value = 100

    // 在组件加载完成后，使用nextTick等待DOM更新
    nextTick(() => {
      // 发送事件通知聊天框组件滚动到底部
      useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
    })

    return comp
  },
  delay: 600,
  timeout: 3000
})

const globalStore = useGlobalStore()
const contactStore = useContactStore()
const groupStore = useGroupStore()
const userStore = useUserStore()
const chatStore = useChatStore()
const configStore = useConfigStore()
const { checkUpdate, CHECK_UPDATE_TIME } = useCheckUpdate()
const userUid = computed(() => userStore.userInfo!.uid)
const shrinkStatus = ref(false)

// 播放消息音效
const playMessageSound = async () => {
  try {
    const audio = new Audio('/sound/message.mp3')
    await audioManager.play(audio, 'message-notification')
  } catch (error) {
    console.warn('播放消息音效失败:', error)
  }
}

// 导入Web Worker
const timerWorker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url))

// 添加错误处理
timerWorker.onerror = (error) => {
  console.error('[Worker Error]', error)
}

// 监听 Worker 消息
timerWorker.onmessage = (e) => {
  const { type } = e.data
  if (type === 'timeout') {
    checkUpdate('home')
  }
}

watch(
  () => appWindow.label === 'home',
  (newValue) => {
    if (newValue) {
      // 初始化监听器
      initListener()
      // 读取消息队列
      readCountQueue()
    }
  },
  { immediate: true }
)

// 监听shrinkStatus的变化
watch(shrinkStatus, (newValue) => {
  if (!newValue) {
    // 当shrinkStatus为false时，等待组件渲染完成后滚动到底部
    nextTick(() => {
      useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
    })
  }
})

/**
 * event默认如果没有传递值就为true，所以shrinkStatus的值为false就会发生值的变化
 * 因为shrinkStatus的值为false，所以v-if="!shrinkStatus" 否则right组件刚开始渲染的时候不会显示
 * */
useMitt.on(MittEnum.SHRINK_WINDOW, (event: boolean) => {
  shrinkStatus.value = event
})

useMitt.on(WsResponseMessageType.LOGIN_SUCCESS, async (data: LoginSuccessResType) => {
  const { ...rest } = data
  // 自己更新自己上线
  await groupStore.updateUserStatus({
    activeStatus: OnlineEnum.ONLINE,
    avatar: rest.avatar,
    account: rest.account,
    lastOptTime: Date.now(),
    name: rest.name,
    uid: rest.uid
  })
})

useMitt.on(WsResponseMessageType.ROOM_DISSOLUTION, async (roomId: string) => {
  console.log('收到群解散通知', roomId)
  // 移除群聊的会话
  chatStore.removeSession(roomId)
  // 移除群聊的详情
  groupStore.removeGroupDetail(roomId)
  // 如果当前会话为解散的群聊，切换到第一个会话
  if (globalStore.currentSession?.roomId === roomId) {
    globalStore.currentSessionRoomId = chatStore.sessionList[0].roomId
  }
})

useMitt.on(WsResponseMessageType.USER_STATE_CHANGE, async (data: { uid: string; userStateId: string }) => {
  console.log('收到用户状态改变', data)
  // await cachedStore.updateUserState(data)
})
useMitt.on(WsResponseMessageType.OFFLINE, async () => {
  console.log('收到用户下线通知')
})
useMitt.on(WsResponseMessageType.ONLINE, async (onStatusChangeType: OnStatusChangeType) => {
  console.log('收到用户上线通知')
  if (onStatusChangeType && onStatusChangeType.onlineNum) {
    groupStore.countInfo!.onlineNum = onStatusChangeType.onlineNum
  }
  if (onStatusChangeType && onStatusChangeType.member) {
    await groupStore.updateUserStatus(onStatusChangeType.member)
    await groupStore.refreshGroupMembers()
  }
})
useMitt.on(WsResponseMessageType.TOKEN_EXPIRED, async (wsTokenExpire: WsTokenExpire) => {
  if (Number(userUid.value) === Number(wsTokenExpire.uid) && userStore.userInfo!.client === wsTokenExpire.client) {
    console.log('收到用户token过期通知', wsTokenExpire)
    // 聚焦主窗口
    const home = await WebviewWindow.getByLabel('home')
    await home?.setFocus()
    useMitt.emit(MittEnum.LEFT_MODAL_SHOW, {
      type: ModalEnum.REMOTE_LOGIN,
      props: {
        ip: wsTokenExpire.ip
      }
    })
  }
})
useMitt.on(WsResponseMessageType.INVALID_USER, (param: { uid: string }) => {
  console.log('无效用户')
  const data = param
  // 消息列表删掉拉黑的发言
  chatStore.filterUser(data.uid)
  // 群成员列表删掉拉黑的用户
  groupStore.removeUserItem(data.uid)
})
useMitt.on(WsResponseMessageType.MSG_MARK_ITEM, async (data: { markList: MarkItemType[] }) => {
  console.log('收到消息标记更新:', data)

  // 确保data.markList是一个数组再传递给updateMarkCount
  if (data && data.markList && Array.isArray(data.markList)) {
    await chatStore.updateMarkCount(data.markList)
  } else if (data && !Array.isArray(data)) {
    // 兼容处理：如果直接收到了单个MarkItemType对象
    await chatStore.updateMarkCount([data as unknown as MarkItemType])
  }
})
useMitt.on(WsResponseMessageType.MSG_RECALL, (data: RevokedMsgType) => {
  chatStore.updateRecallMsg(data)
})
useMitt.on(WsResponseMessageType.MY_ROOM_INFO_CHANGE, (data: { myName: string; roomId: string; uid: string }) => {
  // 更新用户在群聊中的昵称
  groupStore.updateUserItem(data.uid, { myName: data.myName }, data.roomId)
})
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  chatStore.pushMsg(data)
  data.message.sendTime = new Date(data.message.sendTime).getTime()
  await invokeSilently(TauriCommand.SAVE_MSG, {
    data
  })

  // 不是自己发的消息才通知
  if (data.fromUser.uid !== userUid.value) {
    // 获取该消息的会话信息
    const session = chatStore.sessionList.find((s) => s.roomId === data.message.roomId)

    // 只有非免打扰的会话才发送通知和触发图标闪烁
    if (session && session.muteNotification !== NotificationTypeEnum.NOT_DISTURB) {
      // 检查 home 窗口状态
      const home = await WebviewWindow.getByLabel('home')
      let shouldPlaySound = false

      if (home) {
        try {
          const isVisible = await home.isVisible()
          const isMinimized = await home.isMinimized()
          const isFocused = await home.isFocused()

          // 如果窗口不可见、被最小化或未聚焦，则播放音效
          shouldPlaySound = !isVisible || isMinimized || !isFocused
        } catch (error) {
          console.warn('检查窗口状态失败:', error)
          // 如果检查失败，默认播放音效
          shouldPlaySound = true
        }
      } else {
        // 如果找不到 home 窗口，播放音效
        shouldPlaySound = true
      }

      // 播放消息音效
      if (shouldPlaySound) {
        await playMessageSound()
      }

      // 设置图标闪烁
      useMitt.emit(MittEnum.MESSAGE_ANIMATION, data)
      // session.unreadCount++
      // 在windows系统下才发送通知
      if (isWindows()) {
        globalStore.setTipVisible(true)
      }

      if (WebviewWindow.getCurrent().label === 'home') {
        await emitTo('notify', 'notify_content', data)
      }
    }
  }

  await globalStore.updateGlobalUnreadCount()
})
useMitt.on(
  WsResponseMessageType.REQUEST_NEW_FRIEND,
  async (data: { uid: number; unReadCount4Friend: number; unReadCount4Group: number }) => {
    console.log('收到好友申请')
    // 更新未读数
    globalStore.unReadMark.newFriendUnreadCount = data.unReadCount4Friend || 0
    globalStore.unReadMark.newGroupUnreadCount = data.unReadCount4Group || 0

    // 刷新好友申请列表
    await contactStore.getApplyPage(true)
  }
)
useMitt.on(
  WsResponseMessageType.WS_MEMBER_CHANGE,
  async (param: {
    roomId: string
    changeType: ChangeTypeEnum
    userList: UserItem[]
    totalNum: number
    onlineNum: number
  }) => {
    info('监听到群成员变更消息')
    const isRemoveAction = param.changeType === ChangeTypeEnum.REMOVE || param.changeType === ChangeTypeEnum.EXIT_GROUP
    if (isRemoveAction) {
      await handleMemberRemove(param.userList, param.roomId)
    } else {
      await handleMemberAdd(param.userList, param.roomId)
    }

    groupStore.addGroupDetail(param.roomId)
    // 更新群内的总人数
    groupStore.updateGroupNumber(param.roomId, param.totalNum, param.onlineNum)
  }
)

// 处理群成员添加
const handleMemberAdd = async (userList: UserItem[], roomId: string) => {
  for (const user of userList) {
    if (isSelfUser(user.uid)) {
      await handleSelfAdd(roomId)
    } else {
      await handleOtherMemberAdd(user, roomId)
    }
  }
}

// 处理自己加入群聊
const handleSelfAdd = async (roomId: string) => {
  info('本人加入群聊，加载该群聊的会话数据')
  await chatStore.addSession(roomId)
}

// 处理其他成员加入群聊
const handleOtherMemberAdd = async (user: UserItem, roomId: string) => {
  info('群成员加入群聊，添加群成员数据')
  groupStore.addUserItem(user, roomId)
}

// 处理群成员移除
const handleMemberRemove = async (userList: UserItem[], roomId: string) => {
  for (const user of userList) {
    if (isSelfUser(user.uid)) {
      await handleSelfRemove(roomId)
    } else {
      await handleOtherMemberRemove(user.uid, roomId)
    }
  }
}

// 检查是否为当前用户
const isSelfUser = (uid: string): boolean => {
  return uid === userStore.userInfo!.uid
}

// 处理自己被移除
const handleSelfRemove = async (roomId: string) => {
  info('本人退出群聊，移除会话数据')

  // 移除会话和群成员数据
  chatStore.removeSession(roomId)
  groupStore.removeAllUsers(roomId)

  // 如果当前会话就是被移除的群聊，切换到其他会话
  if (globalStore.currentSession?.roomId === roomId) {
    globalStore.updateCurrentSessionRoomId(chatStore.sessionList[0].roomId)
  }
}

// 处理其他成员被移除
const handleOtherMemberRemove = async (uid: string, roomId: string) => {
  info('群成员退出群聊，移除群内的成员数据')
  groupStore.removeUserItem(uid, roomId)
}

useMitt.on(WsResponseMessageType.REQUEST_APPROVAL_FRIEND, async () => {
  // 刷新好友列表以获取最新状态
  await contactStore.getContactList(true)
})
useMitt.on(WsResponseMessageType.ROOM_INFO_CHANGE, async (data: { roomId: string; name: string; avatar: string }) => {
  // 根据roomId修改对应房间中的群名称和群头像
  const { roomId, name, avatar } = data

  // 更新chatStore中的会话信息
  chatStore.updateSession(roomId, {
    name,
    avatar
  })
})

const { resetLoginState, logout } = useLogin()
listen('relogin', async () => {
  info('收到重新登录事件')
  await resetLoginState()
  await logout()
})

onBeforeMount(async () => {
  // 默认执行一次
  await contactStore.getContactList(true)
  // 获取最新的未读数
  await contactStore.getApplyUnReadCount()
})

onMounted(async () => {
  // 初始化配置
  if (!localStorage.getItem('config')) {
    await configStore.initConfig()
  }
  timerWorker.postMessage({
    type: 'startTimer',
    msgId: 'checkUpdate',
    duration: CHECK_UPDATE_TIME
  })

  // 监听home窗口被聚焦的事件，当窗口被聚焦时自动关闭状态栏通知
  const homeWindow = await WebviewWindow.getByLabel('home')
  if (homeWindow) {
    // 设置业务消息监听器
    await rustWebSocketClient.setupBusinessMessageListeners()
    // 恢复大小
    if (globalStore.homeWindowState.width && globalStore.homeWindowState.height) {
      await homeWindow.setSize(new LogicalSize(globalStore.homeWindowState.width, globalStore.homeWindowState.height))
    }
    // 居中
    await homeWindow.center()
    await homeWindow.show()
  }
})

onUnmounted(() => {
  clearListener()
  // 清除Web Worker计时器
  timerWorker.postMessage({
    type: 'clearTimer',
    msgId: 'checkUpdate'
  })
  timerWorker.terminate()
})
</script>
