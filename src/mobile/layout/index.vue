<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <!-- <SafeAreaPlaceholder direction="top" /> -->

    <!-- 页面全部内容 -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      <div class="flex flex-1 overflow-y-auto">
        <RouterView v-slot="{ Component }">
          <Transition name="slide" appear mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
      <div class="flex">
        <TabBar ref="tabBarElement" />
      </div>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { type } from '@tauri-apps/plugin-os'
import { useRoute } from 'vue-router'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'
import type { default as TabBarType } from '#/layout/tabBar/index.vue'
import TabBar from '#/layout/tabBar/index.vue'
import { ChangeTypeEnum, MittEnum, ModalEnum, NotificationTypeEnum, OnlineEnum, TauriCommand } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import type { MarkItemType, MessageType, RevokedMsgType, UserItem } from '@/services/types'
import { type OnStatusChangeType, WsResponseMessageType, type WsTokenExpire } from '@/services/wsType'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { audioManager } from '@/utils/AudioManager'
import { invokeSilently } from '@/utils/TauriInvokeHandler'
import { useContactStore } from '~/src/stores/contacts'

const route = useRoute()
const tabBarElement = ref<InstanceType<typeof TabBarType>>()
const chatStore = useChatStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const contactStore = useContactStore()
const settingStore = useSettingStore()
const userUid = computed(() => userStore.userInfo!.uid)
const playMessageSound = async () => {
  // 检查是否开启了消息提示音
  if (!settingStore.notification?.messageSound) {
    return
  }

  try {
    const audio = new Audio('/sound/message.mp3')
    await audioManager.play(audio, 'message-notification')
  } catch (error) {
    console.warn('播放消息音效失败:', error)
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

useMitt.on(WsResponseMessageType.USER_STATE_CHANGE, async (data: { uid: string; userStateId: string }) => {
  groupStore.updateUserItem(data.uid, {
    userStateId: data.userStateId
  })
})

/** 测试 */
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  console.log('[mobile/layout] 收到的消息：', data)
  chatStore.pushMsg(data)
  data.message.sendTime = new Date(data.message.sendTime).getTime()
  await invokeSilently(TauriCommand.SAVE_MSG, {
    data
  })
  if (data.fromUser.uid !== userUid.value) {
    // 获取该消息的会话信息
    const session = chatStore.sessionList.find((s) => s.roomId === data.message.roomId)

    // 只有非免打扰的会话才发送通知和触发图标闪烁
    if (session && session.muteNotification !== NotificationTypeEnum.NOT_DISTURB) {
      // 检查 home 窗口状态
      const home = await WebviewWindow.getByLabel('mobile-home')
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
      // session.unreadCount++
      // 在windows系统下才发送通知
      if (type() === 'windows') {
        globalStore.setTipVisible(true)
      }

      if (WebviewWindow.getCurrent().label === 'mobile-home') {
        await emitTo('notify', 'notify_content', data)
      }
    }
  }

  await globalStore.updateGlobalUnreadCount()
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

console.log('首页布局已启动')
</script>

<style lang="scss">
/* 侧滑切换动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.1s ease;
}

.slide-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
