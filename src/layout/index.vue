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
import { ChangeTypeEnum, MittEnum, ModalEnum, OnlineEnum, RoomTypeEnum } from '@/enums'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
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
// 清空未读消息
// globalStore.unReadMark.newMsgUnreadCount = 0
const shrinkStatus = ref(false)

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
  computedToken.clear()
  computedToken.get()
  // 自己更新自己上线
  await groupStore.batchUpdateUserStatus([
    {
      activeStatus: OnlineEnum.ONLINE,
      avatar: rest.avatar,
      lastOptTime: Date.now(),
      name: rest.name,
      uid: rest.uid
    }
  ])
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
  groupStore.countInfo.onlineNum = onStatusChangeType.onlineNum
  // groupStore.countInfo.totalNum = onStatusChangeType.totalNum
  await groupStore.batchUpdateUserStatus(onStatusChangeType.changeList)
  await groupStore.refreshGroupMembers()
})
useMitt.on(WsResponseMessageType.TOKEN_EXPIRED, async (wsTokenExpire: WsTokenExpire) => {
  if (
    Number(userStore.userInfo.uid) === Number(wsTokenExpire.uid) &&
    userStore.userInfo.client === wsTokenExpire.client
  ) {
    // 聚焦主窗口
    const home = await WebviewWindow.getByLabel('home')
    await home?.setFocus()
    console.log('账号在其他设备登录', wsTokenExpire)
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
useMitt.on(WsResponseMessageType.MSG_MARK_ITEM, (markList: MarkItemType[]) => {
  chatStore.updateMarkCount(markList)
})
useMitt.on(WsResponseMessageType.MSG_RECALL, (data: RevokedMsgType) => {
  chatStore.updateRecallStatus(data)
})
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  chatStore.pushMsg(data)
  // 接收到通知就设置图标闪烁
  const username = useUserInfo(data.fromUser.uid).value.name!
  // 不是自己发的消息才通知
  if (data.fromUser.uid !== userStore.userInfo.uid) {
    await emitTo('tray', 'show_tip')
    await emitTo('notify', 'notify_cotent', data)
    const throttleSendNotification = useThrottleFn(() => {
      sendNotification({
        title: username,
        body: data.message.body.content
      })
    }, 3000)
    throttleSendNotification()
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

onBeforeMount(async () => {
  // 默认执行一次
  await contactStore.getContactList(true)
  await contactStore.getRequestFriendsList(true)
  await contactStore.getGroupChatList()
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  let permissionGranted = await isPermissionGranted()

  // 如果没有授权，则请求授权系统通知
  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === 'granted'
  }
})

onBeforeUnmount(() => {
  clearListener()
})
</script>
