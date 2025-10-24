<template>
  <div class="h-100vh w-100vw">
    <NaiveProvider :message-max="3" :notific-max="3" class="h-full">
      <div v-if="!isLock" class="h-full">
        <router-view />
      </div>
      <!-- 锁屏页面 -->
      <LockScreen v-else />
    </NaiveProvider>
  </div>
  <component :is="mobileRtcCallFloatCell" v-if="mobileRtcCallFloatCell" />
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { exit } from '@tauri-apps/plugin-process'
import {
  CallTypeEnum,
  EventEnum,
  StoresEnum,
  ThemeEnum,
  ChangeTypeEnum,
  MittEnum,
  ModalEnum,
  OnlineEnum,
  RoomTypeEnum
} from '@/enums'
import { useFixedScale } from '@/hooks/useFixedScale'
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting.ts'
import { isDesktop, isMobile, isWindows } from '@/utils/PlatformConstants'
import LockScreen from '@/views/LockScreen.vue'

import {
  type LoginSuccessResType,
  type OnStatusChangeType,
  WsResponseMessageType,
  type WsTokenExpire
} from '@/services/wsType.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useAnnouncementStore } from '@/stores/announcement'
import type { MarkItemType, RevokedMsgType, UserItem } from '@/services/types.ts'

const mobileRtcCallFloatCell = isMobile()
  ? defineAsyncComponent(() => import('@/mobile/components/RtcCallFloatCell.vue'))
  : null

const userStore = useUserStore()
const contactStore = useContactStore()
const announcementStore = useAnnouncementStore()
const userUid = computed(() => userStore.userInfo!.uid)
const groupStore = useGroupStore()
const chatStore = useChatStore()
const appWindow = WebviewWindow.getCurrent()
const { createRtcCallWindow } = useWindow()
const globalStore = useGlobalStore()
const router = useRouter()
// 只在桌面端初始化窗口管理功能
const { createWebviewWindow } = isDesktop() ? useWindow() : { createWebviewWindow: () => {} }
const settingStore = useSettingStore()
const { themes, lockScreen, page } = storeToRefs(settingStore)
// 全局快捷键管理
const { initializeGlobalShortcut, cleanupGlobalShortcut } = useGlobalShortcut()

// 创建固定缩放控制器（使用 #app-container 作为目标，避免影响浮层定位）
const fixedScale = useFixedScale({
  target: '#app-container',
  mode: 'transform',
  enableWindowsTextScaleDetection: true
})

/** 不需要锁屏的页面 */
const LockExclusion = new Set(['/login', '/tray', '/qrCode', '/about', '/onlineStatus', '/capture'])
const isLock = computed(() => {
  return !LockExclusion.has(router.currentRoute.value.path) && lockScreen.value.enable
})

/** 禁止图片以及输入框的拖拽 */
const preventDrag = (e: MouseEvent) => {
  const event = e.target as HTMLElement
  // 检查目标元素是否是<img>元素
  if (event.nodeName.toLowerCase() === 'img' || event.nodeName.toLowerCase() === 'input') {
    e.preventDefault()
  }
}

useMitt.on(WsResponseMessageType.VideoCallRequest, (event) => {
  info(`收到通话请求：${JSON.stringify(event)}`)
  const remoteUid = event.callerUid
  const callType = event.isVideo ? CallTypeEnum.VIDEO : CallTypeEnum.AUDIO

  if (isMobile()) {
    useMitt.emit(MittEnum.MOBILE_RTC_CALL_REQUEST, {
      ...event,
      callerUid: remoteUid
    })
    return
  }

  handleVideoCall(remoteUid, callType)
})

useMitt.on(WsResponseMessageType.LOGIN_SUCCESS, async (data: LoginSuccessResType) => {
  const { ...rest } = data
  // 自己更新自己上线
  groupStore.updateOnlineNum({
    uid: rest.uid,
    isAdd: true
  })
  groupStore.updateUserItem(rest.uid, {
    activeStatus: OnlineEnum.ONLINE,
    avatar: rest.avatar,
    account: rest.account,
    lastOptTime: Date.now(),
    name: rest.name,
    uid: rest.uid
  })
})

useMitt.on(WsResponseMessageType.MSG_RECALL, (data: RevokedMsgType) => {
  chatStore.updateRecallMsg(data)
})

useMitt.on(WsResponseMessageType.MY_ROOM_INFO_CHANGE, (data: { myName: string; roomId: string; uid: string }) => {
  // 更新用户在群聊中的昵称
  groupStore.updateUserItem(data.uid, { myName: data.myName }, data.roomId)
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

// 处理其他成员加入群聊
const handleOtherMemberAdd = async (user: UserItem, roomId: string) => {
  info('群成员加入群聊，添加群成员数据')
  groupStore.addUserItem(user, roomId)
}

// 检查是否为当前用户
const isSelfUser = (uid: string): boolean => {
  return uid === userStore.userInfo!.uid
}

// 处理自己加入群聊
const handleSelfAdd = async (roomId: string) => {
  info('本人加入群聊，加载该群聊的会话数据')
  await chatStore.addSession(roomId)
}

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

useMitt.on(WsResponseMessageType.TOKEN_EXPIRED, async (wsTokenExpire: WsTokenExpire) => {
  if (Number(userUid.value) === Number(wsTokenExpire.uid) && userStore.userInfo!.client === wsTokenExpire.client) {
    console.log('收到用户token过期通知', wsTokenExpire)
    // 聚焦主窗口
    if (!isMobile()) {
      const home = await WebviewWindow.getByLabel('home')
      await home?.setFocus()
    }
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

useMitt.on(WsResponseMessageType.ONLINE, async (onStatusChangeType: OnStatusChangeType) => {
  console.log('收到用户上线通知')
  // 群聊
  if (onStatusChangeType.type === 1) {
    groupStore.updateOnlineNum({
      roomId: onStatusChangeType.roomId,
      onlineNum: onStatusChangeType.onlineNum,
      isAdd: true
    })
    if (onStatusChangeType) {
      groupStore.updateUserItem(
        onStatusChangeType.uid,
        {
          activeStatus: OnlineEnum.ONLINE,
          lastOptTime: onStatusChangeType.lastOptTime
        },
        onStatusChangeType.roomId
      )
    }
  }
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
  groupStore.updateUserItem(data.uid, {
    userStateId: data.userStateId
  })
})

useMitt.on(WsResponseMessageType.GROUP_SET_ADMIN_SUCCESS, (event) => {
  console.log('设置群管理员---> ', event)
  groupStore.updateAdminStatus(event.roomId, event.uids, event.status)
})

useMitt.on(WsResponseMessageType.OFFLINE, async (onStatusChangeType: OnStatusChangeType) => {
  console.log('收到用户下线通知', onStatusChangeType)
  // 群聊
  if (onStatusChangeType.type === 1) {
    groupStore.updateOnlineNum({
      roomId: onStatusChangeType.roomId,
      onlineNum: onStatusChangeType.onlineNum,
      isAdd: false
    })
    if (onStatusChangeType) {
      groupStore.updateUserItem(
        onStatusChangeType.uid,
        {
          activeStatus: OnlineEnum.OFFLINE,
          lastOptTime: onStatusChangeType.lastOptTime
        },
        onStatusChangeType.roomId
      )
    }
  }
})

const handleVideoCall = async (remotedUid: string, callType: CallTypeEnum) => {
  info(`监听到视频通话调用，remotedUid: ${remotedUid}, callType: ${callType}`)
  if (isMobile()) {
    router.push({
      path: '/mobile/rtcCall',
      query: {
        remoteUserId: globalStore.currentSession.detailId,
        roomId: globalStore.currentSession.roomId,
        callType: callType,
        // 接受方
        isIncoming: 'true'
      }
    })
  } else {
    await createRtcCallWindow(true, remotedUid, globalStore.currentSession.roomId, callType)
  }
}

const listenMobileReLogin = async () => {
  if (isMobile()) {
    // 动态导入
    const { listen } = await import('@tauri-apps/api/event')
    const { useLogin } = await import('@/hooks/useLogin')

    const { resetLoginState, logout } = useLogin()
    listen('relogin', async () => {
      info('收到重新登录事件')
      await resetLoginState()
      await logout()
    })
  }
}

onMounted(() => {
  // 仅在windows上使用
  if (isWindows()) {
    fixedScale.enable()
  }
  // 判断是否是桌面端，桌面端需要调整样式
  isDesktop() && import('@/styles/scss/global/desktop.scss')
  // 判断是否是移动端，移动端需要加载安全区域适配样式
  isMobile() && import('@/styles/scss/global/mobile.scss')
  import(`@/styles/scss/theme/${themes.value.versatile}.scss`)
  // 判断localStorage中是否有设置主题
  if (!localStorage.getItem(StoresEnum.SETTING)) {
    settingStore.initTheme(ThemeEnum.OS)
  }
  document.documentElement.dataset.theme = themes.value.content
  window.addEventListener('dragstart', preventDrag)

  // 只在桌面端的主窗口中初始化全局快捷键
  if (isDesktop() && appWindow.label === 'home') {
    initializeGlobalShortcut()
  }
  /** 开发环境不禁止 */
  if (process.env.NODE_ENV !== 'development') {
    /** 禁用浏览器默认的快捷键 */
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 'f' || e.key === 'r' || e.key === 'g' || e.key === 'j')) {
        e.preventDefault()
      }
    })
    /** 禁止右键菜单 */
    window.addEventListener('contextmenu', (e) => e.preventDefault(), false)
  }
  // 只在桌面端处理窗口相关事件
  if (isDesktop()) {
    useMitt.on(MittEnum.CHECK_UPDATE, async () => {
      const checkUpdateWindow = await WebviewWindow.getByLabel('checkupdate')
      await checkUpdateWindow?.show()
    })
    useMitt.on(MittEnum.DO_UPDATE, async (event) => {
      await createWebviewWindow('更新', 'update', 490, 335, '', false, 490, 335, false, true)
      const closeWindow = await WebviewWindow.getByLabel(event.close)
      closeWindow?.close()
    })
    appWindow.listen(EventEnum.EXIT, async () => {
      await exit(0)
    })
  }
  listenMobileReLogin()
})

onUnmounted(async () => {
  // 关闭固定缩放，恢复样式与监听
  fixedScale.disable()

  window.removeEventListener('contextmenu', (e) => e.preventDefault(), false)
  window.removeEventListener('dragstart', preventDrag)

  // 只在桌面端的主窗口中清理全局快捷键
  if (isDesktop() && appWindow.label === 'home') {
    await cleanupGlobalShortcut()
  }
})

/** 控制阴影 */
watch(
  () => page.value.shadow,
  (val) => {
    // 移动端始终禁用阴影
    if (isMobile()) {
      document.documentElement.style.setProperty('--shadow-enabled', '1')
    } else {
      document.documentElement.style.setProperty('--shadow-enabled', val ? '0' : '1')
    }
  },
  { immediate: true }
)

/** 控制高斯模糊 */
watch(
  () => page.value.blur,
  (val) => {
    document.documentElement.setAttribute('data-blur', val ? '1' : '0')
  },
  { immediate: true }
)

/** 控制字体样式 */
watch(
  () => page.value.fonts,
  (val) => {
    document.documentElement.style.setProperty('--font-family', val)
  },
  { immediate: true }
)

/** 控制变化主题 */
watch(
  () => themes.value.versatile,
  async (val, oldVal) => {
    await import(`@/styles/scss/theme/${val}.scss`)
    // 然后给最顶层的div设置val的类样式
    const app = document.querySelector('#app')?.classList as DOMTokenList
    app.remove(oldVal as string)
    await nextTick(() => {
      app.add(val)
    })
  },
  { immediate: true }
)

/** 监听会话变化 */
watch(
  () => globalStore.currentSession,
  async (newSession, oldSession) => {
    if (newSession?.type === RoomTypeEnum.GROUP) {
      try {
        const result = await groupStore.switchSession(newSession, oldSession)

        if (result?.success) {
          // 切换会话的时候应该去公告的状态找到第一个公告展示
          await announcementStore.loadGroupAnnouncements()
        }
      } catch (error) {
        console.error('会话切换处理失败:', error)
      }
    }
  },
  { immediate: true }
)
</script>
<style lang="scss">
/* 修改naive-ui select 组件的样式 */
.n-base-selection,
.n-base-select-menu,
.n-base-select-menu .n-base-select-option .n-base-select-option__content,
.n-base-select-menu .n-base-select-option::before {
  border-radius: 8px;
  font-size: 12px;
}

img {
  user-select: none;
  -webkit-user-select: none;
}

input,
button,
a {
  user-select: auto;
  cursor: auto;
}
</style>
