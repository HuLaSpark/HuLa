<template>
  <div id="layout" class="flex size-full min-w-310px">
    <Left />
    <Center />
    <Right v-if="!shrinkStatus" />
  </div>

  <AddFriendsModal />
</template>

<script setup lang="ts">
import Center from './center/index.vue'
import Left from './left/index.vue'
import Right from './right/index.vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { ChangeTypeEnum, MittEnum, OnlineEnum, RoomTypeEnum } from '@/enums'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useGlobalStore } from '@/stores/global.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { OnStatusChangeType, WsResponseMessageType, WsTokenExpire } from '@/services/wsType.ts'
import { LoginStatus, useWsLoginStore } from '@/stores/ws.ts'
import type { MarkItemType, RevokedMsgType } from '@/services/types.ts'
import { useLogin } from '@/hooks/useLogin.ts'

const globalStore = useGlobalStore()
const contactStore = useContactStore()
const groupStore = useGroupStore()
const userStore = useUserStore()
const loginStore = useWsLoginStore()
const chatStore = useChatStore()
const { logout } = useLogin()
// 清空未读消息
globalStore.unReadMark.newMsgUnreadCount = 0
const shrinkStatus = ref(false)
/**
 * event默认如果没有传递值就为true，所以shrinkStatus的值为false就会发生值的变化
 * 因为shrinkStatus的值为false，所以v-if="!shrinkStatus" 否则right组件刚开始渲染的时候不会显示
 * */
useMitt.on(MittEnum.SHRINK_WINDOW, (event: boolean) => {
  shrinkStatus.value = event
})

onBeforeMount(() => {
  // 默认执行一次
  contactStore.getContactList(true)
  contactStore.getRequestFriendsList(true)
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
useMitt.on(WsResponseMessageType.OFFLINE, async () => {
  console.log('收到用户下线通知')
})
useMitt.on(WsResponseMessageType.ONLINE, async (onStatusChangeType: OnStatusChangeType) => {
  groupStore.countInfo.onlineNum = onStatusChangeType.onlineNum
  // groupStore.countInfo.totalNum = data.totalNum
  // groupStore.batchUpdateUserStatus(data.changeList)
  // groupStore.getGroupUserList(true)
  console.log('收到用户上线通知')
})
useMitt.on(WsResponseMessageType.TOKEN_EXPIRED, async (wsTokenExpire: WsTokenExpire) => {
  console.log('token过期')
  if (userStore.userInfo.uid === wsTokenExpire.uid) {
    await confirm('新设备已在' + (wsTokenExpire.ip ? wsTokenExpire.ip : '未知IP') + '登录')
    // token已在后端清空，只需要返回登录页
    await logout()
    userStore.isSign = false
    userStore.userInfo = {}
    localStorage.removeItem('USER_INFO')
    localStorage.removeItem('TOKEN')
    loginStore.loginStatus = LoginStatus.Init
  }
})
useMitt.on(WsResponseMessageType.INVALID_USER, (param: { uid: number }) => {
  console.log('无效用户')
  const data = param
  // 消息列表删掉小黑子发言
  chatStore.filterUser(data.uid)
  // 群成员列表删掉小黑子
  groupStore.filterUser(data.uid)
})
useMitt.on(WsResponseMessageType.MSG_MARK_ITEM, (param: { markList: MarkItemType[] }) => {
  chatStore.updateMarkCount(param.markList)
})
useMitt.on(WsResponseMessageType.MSG_RECALL, (param: { data: RevokedMsgType }) => {
  const { data } = param
  chatStore.updateRecallStatus(data)
})
useMitt.on(WsResponseMessageType.REQUEST_NEW_FRIEND, (param: { uid: number; unreadCount: number }) => {
  globalStore.unReadMark.newFriendUnreadCount += param.unreadCount
  // notify({
  //   name: '新好友',
  //   text: '您有一个新好友, 快来看看~',
  //   onClick: () => {
  //     Router.push('/contact')
  //   }
  // })
})
useMitt.on(
  WsResponseMessageType.NEW_FRIEND_SESSION,
  (param: {
    roomId: number
    uid: number
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
</script>
