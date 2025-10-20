<template>
  <n-config-provider
    :theme="lightTheme"
    class="h-full flex flex-col box-border"
    :class="{
      'bg-cover bg-center bg-no-repeat': props.backgroundImage
    }"
    :style="backgroundImageStyle">
    <!-- 顶部安全区域 -->
    <div :class="[{ 'safe-area-top': safeAreaTop }, props.topSafeAreaClass]" />

    <!-- 内容区域 -->
    <div class="flex-1 min-h-0">
      <slot></slot>
    </div>

    <!-- 底部安全区域 -->
    <div :class="[{ 'safe-area-bottom': safeAreaBottom }, props.bottomSafeAreaClass]" />
  </n-config-provider>
</template>

<script setup lang="ts">
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { NotificationTypeEnum, TauriCommand, RoleEnum, RoomTypeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import type { MessageType } from '@/services/types'
import { WsResponseMessageType } from '@/services/wsType'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { useCachedStore } from '@/stores/cached.ts'
import { useGroupStore } from '@/stores/group.ts'
import { audioManager } from '@/utils/AudioManager'
import { isMobile, isWindows } from '@/utils/PlatformConstants'
import { invokeSilently } from '@/utils/TauriInvokeHandler'
import { useRoute } from 'vue-router'
import { lightTheme } from 'naive-ui'
interface MobileLayoutProps {
  /** 是否应用顶部安全区域 */
  safeAreaTop?: boolean
  /** 是否应用底部安全区域 */
  safeAreaBottom?: boolean
  /** 背景图片URL */
  backgroundImage?: string
  /** 顶部安全区域的自定义 CSS class */
  topSafeAreaClass?: string
  /** 底部安全区域的自定义 CSS class */
  bottomSafeAreaClass?: string
}

/** 群公告相关 */
const announList = ref<any[]>([])
const announNum = ref(0)
const memberCache = ref<Map<string, any[]>>(new Map())
const isAddAnnoun = ref(false)
const announError = ref(false)
const searchRef = ref('')
const route = useRoute()
const cachedStore = useCachedStore()
const chatStore = useChatStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const settingStore = useSettingStore()
const currentLoadingRoomId = ref('')
const displayedUserList = ref<any[]>([])
const userUid = computed(() => userStore.userInfo!.uid)
const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)
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

const isLord = computed(() => {
  const currentUser = groupStore.userList.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.LORD
})
const isAdmin = computed(() => {
  const currentUser = groupStore.userList.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.ADMIN
})

/** 判断当前用户是否拥有id为6的徽章 并且是频道 */
const hasBadge6 = computed(() => {
  // 只有当 roomId 为 "1" 时才进行徽章判断（频道）
  if (globalStore.currentSession?.roomId !== '1') return false

  const currentUser = groupStore.getUserInfo(userStore.userInfo!.uid!)!
  return currentUser?.itemIds?.includes('6')
})

const props = withDefaults(defineProps<MobileLayoutProps>(), {
  safeAreaTop: true,
  safeAreaBottom: true,
  backgroundImage: '',
  topSafeAreaClass: '',
  bottomSafeAreaClass: ''
})

const filteredUserList = computed(() => {
  let userList = groupStore.userList
  if (searchRef.value) {
    userList = userList.filter((user) => {
      const flag1 = user.name.toLowerCase().includes(searchRef.value.toLowerCase())
      const flag2 = user.myName?.toLowerCase().includes(searchRef.value.toLowerCase())
      return flag1 || flag2
    })
  }
  return userList.sort((a, b) => {
    if (a.roleId && b.roleId && a.roleId !== b.roleId) {
      return a.roleId - b.roleId
    }

    if (a.activeStatus !== b.activeStatus) {
      return a.activeStatus - b.activeStatus
    }

    return a.name.localeCompare(b.name)
  })
})

// 计算背景图样式
const backgroundImageStyle = computed(() => {
  const styles: Record<string, string> = {}

  // 设置背景图片
  if (props.backgroundImage) {
    // 处理路径别名 @/ 转换为 /src/
    let imagePath = props.backgroundImage
    if (imagePath.startsWith('@/')) {
      imagePath = imagePath.replace('@/', '/src/')
    }
    styles.backgroundImage = `url(${imagePath})`
  }
  return styles
})

/**
 * 加载群公告
 */
const handleLoadGroupAnnoun = async (roomId: string) => {
  try {
    // 设置是否可以添加公告
    isAddAnnoun.value = isLord.value || isAdmin.value || hasBadge6.value!
    // 获取群公告列表
    const data = await cachedStore.getGroupAnnouncementList(roomId, 1, 10)
    if (data) {
      announList.value = data.records
      // 处理置顶公告
      if (announList.value && announList.value.length > 0) {
        const topAnnouncement = announList.value.find((item: any) => item.top)
        if (topAnnouncement) {
          announList.value = [topAnnouncement, ...announList.value.filter((item: any) => !item.top)]
        }
      }
      announNum.value = parseInt(data.total, 10)
      announError.value = false
    } else {
      announError.value = false
    }
  } catch (error) {
    console.error('加载群公告失败:', error)
    announError.value = true
  }
}

/**
 * 初始化群公告所需要的信息
 */
const handleInitAnnoun = async () => {
  // 初始化时获取群公告
  if (isGroup.value) {
    const roomId = globalStore.currentSession?.roomId
    if (roomId) {
      await handleLoadGroupAnnoun(roomId)
    }
  }
}

/** 处理收到的消息 */
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  if (chatStore.checkMsgExist(data.message.roomId, data.message.id)) {
    return
  }
  console.log('[mobile/layout] 收到的消息：', data)
  chatStore.pushMsg(data, {
    isActiveChatView: route.path.startsWith('/mobile/chatRoom'),
    activeRoomId: globalStore.currentSessionRoomId || ''
  })
  data.message.sendTime = new Date(data.message.sendTime).getTime()
  await invokeSilently(TauriCommand.SAVE_MSG, {
    data
  })
  if (data.fromUser.uid !== userUid.value) {
    // 获取该消息的会话信息
    const session = chatStore.sessionList.find((s) => s.roomId === data.message.roomId)

    // 只有非免打扰的会话才发送通知和触发图标闪烁
    if (session && session.muteNotification !== NotificationTypeEnum.NOT_DISTURB) {
      let shouldPlaySound = isMobile()

      if (!isMobile()) {
        try {
          const home = await WebviewWindow.getByLabel('mobile-home')

          if (home) {
            const isVisible = await home.isVisible()
            const isMinimized = await home.isMinimized()
            const isFocused = await home.isFocused()

            // 如果窗口不可见、被最小化或未聚焦，则播放音效
            shouldPlaySound = !isVisible || isMinimized || !isFocused
          } else {
            // 如果找不到home 窗口，播放音效
            shouldPlaySound = true
          }
        } catch (error) {
          console.warn('检查窗口状态失败:', error)
          // 如果检查失败，默认播放音效
          shouldPlaySound = true
        }
      }

      // 播放消息音效
      if (shouldPlaySound) {
        await playMessageSound()
      }

      // 设置图标闪烁
      // useMitt.emit(MittEnum.MESSAGE_ANIMATION, data)
      // session.unreadCount++
      // 在windows系统下才发送通知
      if (!isMobile() && isWindows()) {
        globalStore.setTipVisible(true)
      }

      if (!isMobile()) {
        const currentWindow = WebviewWindow.getCurrent()

        if (currentWindow.label === 'mobile-home') {
          await emitTo('notify', 'notify_content', data)
        }
      }
    }
  }

  await globalStore.updateGlobalUnreadCount()
})

watch(
  () => globalStore.currentSession,
  async (newSession, oldSession) => {
    const currentSession = { ...newSession }
    if (newSession?.type === RoomTypeEnum.GROUP) {
      if (newSession?.roomId !== oldSession?.roomId) {
        currentLoadingRoomId.value = newSession.roomId
        // 切换时优先显示缓存，无缓存则保留旧内容，避免空白
        const cached = memberCache.value.get(newSession.roomId)
        if (cached && Array.isArray(cached)) {
          displayedUserList.value = cached
        }

        // 重置群组数据后再加载新的群成员数据（不清空UI）
        groupStore.resetGroupData()
        try {
          await groupStore.getGroupUserList(currentSession.roomId!)
          // 初始化群公告
          await handleInitAnnoun()
          // 在数据完成后替换展示列表
          displayedUserList.value = filteredUserList.value
          // 更新缓存
          memberCache.value.set(currentSession.roomId!, displayedUserList.value)
        } catch (error) {
          console.error('加载群组信息失败:', error)
        }
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.safe-area-top {
  padding-top: var(--safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: var(--safe-area-inset-bottom);
}
</style>
