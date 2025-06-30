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
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { ChangeTypeEnum, MittEnum, ModalEnum, NotificationTypeEnum, OnlineEnum, RoomTypeEnum } from '@/enums'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useGlobalStore } from '@/stores/global.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { LoginSuccessResType, OnStatusChangeType, WsResponseMessageType, WsTokenExpire } from '@/services/wsType.ts'
import type { MarkItemType, MessageType, RevokedMsgType } from '@/services/types.ts'
import { computedToken } from '@/services/request'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { useUserInfo } from '@/hooks/useCached.ts'
import { emitTo } from '@tauri-apps/api/event'
import { useThrottleFn } from '@vueuse/core'
import { useCachedStore } from '@/stores/cached'
import { clearListener, initListener, readCountQueue } from '@/utils/ReadCountQueue'
import { type } from '@tauri-apps/plugin-os'
import { useConfigStore } from '@/stores/config'
import { useCheckUpdate } from '@/hooks/useCheckUpdate'
import { UserAttentionType } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'

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
    loadingPercentage.value = 66
    return comp
  },
  delay: 600,
  timeout: 3000
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
const cachedStore = useCachedStore()
const configStore = useConfigStore()
const { checkUpdate, CHECK_UPDATE_TIME } = useCheckUpdate()
const userUid = computed(() => userStore.userInfo.uid)
// 清空未读消息
// globalStore.unReadMark.newMsgUnreadCount = 0
const shrinkStatus = ref(false)

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
  () => userStore.isSign,
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
  // 更新一下请求里面的 token.
  computedToken.value.clear()
  computedToken.value.get()
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
useMitt.on(WsResponseMessageType.USER_STATE_CHANGE, async (data: { uid: string; userStateId: string }) => {
  console.log('收到用户状态改变', data)
  await cachedStore.updateUserState(data)
})
useMitt.on(WsResponseMessageType.OFFLINE, async () => {
  console.log('收到用户下线通知')
})
useMitt.on(WsResponseMessageType.ONLINE, async (onStatusChangeType: OnStatusChangeType) => {
  console.log('收到用户上线通知')
  if (onStatusChangeType && onStatusChangeType.onlineNum) {
    groupStore.countInfo.onlineNum = onStatusChangeType.onlineNum
  }
  if (onStatusChangeType && onStatusChangeType.member) {
    await groupStore.updateUserStatus(onStatusChangeType.member)
    await groupStore.refreshGroupMembers()
  }
})
useMitt.on(WsResponseMessageType.TOKEN_EXPIRED, async (wsTokenExpire: WsTokenExpire) => {
  if (Number(userUid.value) === Number(wsTokenExpire.uid) && userStore.userInfo.client === wsTokenExpire.client) {
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
  groupStore.filterUser(data.uid)
})
useMitt.on(WsResponseMessageType.MSG_MARK_ITEM, (data: { markList: MarkItemType[] }) => {
  console.log('收到消息标记更新:', data)

  // 确保data.markList是一个数组再传递给updateMarkCount
  if (data && data.markList && Array.isArray(data.markList)) {
    chatStore.updateMarkCount(data.markList)
  } else if (data && !Array.isArray(data)) {
    // 兼容处理：如果直接收到了单个MarkItemType对象
    chatStore.updateMarkCount([data as unknown as MarkItemType])
  }
})
useMitt.on(WsResponseMessageType.MSG_RECALL, (data: RevokedMsgType) => {
  chatStore.updateRecallStatus(data)
})
useMitt.on(WsResponseMessageType.MY_ROOM_INFO_CHANGE, (data: { myName: string; roomId: string; uid: string }) => {
  // 更新用户在群聊中的昵称
  cachedStore.updateUserGroupNickname(data)
  // 如果当前正在查看的是该群聊，则更新群组信息
  if (globalStore.currentSession?.roomId === data.roomId) {
    groupStore.getCountStatistic()
  }
})
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  chatStore.pushMsg(data)
  const username = useUserInfo(data.fromUser.uid).value.name!
  const home = await WebviewWindow.getByLabel('home')
  // 当home窗口不显示并且home窗口不是最小化的时候并且不是聚焦窗口的时候
  const homeShow = await home?.isVisible()
  const isHomeMinimized = await home?.isMinimized()
  const isHomeFocused = await home?.isFocused()
  if (homeShow && !isHomeMinimized && isHomeFocused) return

  // 不是自己发的消息才通知
  if (data.fromUser.uid !== userUid.value) {
    // 获取该消息的会话信息
    const session = chatStore.sessionList.find((s) => s.roomId === data.message.roomId)

    // 只有非免打扰的会话才发送通知和触发图标闪烁
    if (session && session.muteNotification !== NotificationTypeEnum.NOT_DISTURB) {
      // 设置图标闪烁
      useMitt.emit(MittEnum.MESSAGE_ANIMATION, data)
      // 在windows系统下才发送通知
      if (type() === 'windows') {
        await emitTo('tray', 'show_tip')
        // 请求用户注意窗口
        home?.requestUserAttention(UserAttentionType.Critical)
      }

      await emitTo('notify', 'notify_cotent', data)
      const throttleSendNotification = useThrottleFn(() => {
        sendNotification({
          title: username,
          body: data.message.body.content
        })
      }, 3000)
      throttleSendNotification()
    }
  }
})
useMitt.on(WsResponseMessageType.REQUEST_NEW_FRIEND, async (data: { uid: number; unreadCount: number }) => {
  console.log('收到好友申请', data.unreadCount)
  // 更新未读数
  globalStore.unReadMark.newFriendUnreadCount += data.unreadCount
  // 刷新好友申请列表
  await contactStore.getRequestFriendsList(true)

  const throttleSendNotification = useThrottleFn(() => {
    sendNotification({
      title: '新好友',
      body: `您有${data.unreadCount}条好友申请`
    })
  }, 3000)
  throttleSendNotification()
})
useMitt.on(
  WsResponseMessageType.NEW_FRIEND_SESSION,
  (param: {
    roomId: string
    uid: string
    changeType: ChangeTypeEnum
    activeStatus: OnlineEnum
    lastOptTime: number
  }) => {
    // changeType 1 加入群组，2： 移除群组
    if (param.roomId === globalStore.currentSession.roomId && globalStore.currentSession.type === RoomTypeEnum.GROUP) {
      if (param.changeType === ChangeTypeEnum.REMOVE) {
        // 移除群成员
        groupStore.filterUser(param.uid)
        // TODO 添加一条退出群聊的消息
      } else {
        // TODO 添加群成员
        // TODO 添加一条入群的消息
      }
    }
  }
)
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

  // 如果当前正在查看的是该群聊，则需要刷新群组详情
  if (globalStore.currentSession?.roomId === roomId && globalStore.currentSession.type === RoomTypeEnum.GROUP) {
    // 重新获取群组信息统计
    await groupStore.getCountStatistic()
  }
})
useMitt.on(WsResponseMessageType.ROOM_DISSOLUTION, async () => {
  // 刷新群聊列表
  await contactStore.getGroupChatList()
})

onBeforeMount(async () => {
  // 默认执行一次
  await contactStore.getContactList(true)
  await contactStore.getRequestFriendsList(true)
  await contactStore.getGroupChatList()
})

onMounted(async () => {
  // 初始化配置
  if (!localStorage.getItem('config')) {
    await configStore.initConfig()
  }
  let permissionGranted = await isPermissionGranted()

  // 如果没有授权，则请求授权系统通知
  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === 'granted'
  }
  timerWorker.postMessage({
    type: 'startTimer',
    msgId: 'checkUpdate',
    duration: CHECK_UPDATE_TIME
  })

  // 监听home窗口被聚焦的事件，当窗口被聚焦时自动关闭状态栏通知
  const homeWindow = await WebviewWindow.getByLabel('home')
  if (homeWindow) {
    // 恢复大小
    if (globalStore.homeWindowState.width && globalStore.homeWindowState.height) {
      await homeWindow.setSize(new LogicalSize(globalStore.homeWindowState.width, globalStore.homeWindowState.height))
    }
    // 居中
    await homeWindow.center()
    await homeWindow.show()
    await homeWindow.onFocusChanged(({ payload: focused }) => {
      // 当窗口获得焦点时，关闭通知提示
      if (focused) {
        globalStore.setTipVisible(false)
        // 同时通知通知窗口隐藏
        emitTo('notify', 'hide_notify')
      }
    })
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
