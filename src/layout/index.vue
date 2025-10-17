<template>
  <div id="layout" class="flex min-w-310px bg-[--right-bg-color] h-full">
    <Suspense>
      <template #default>
        <div class="flex flex-1 min-h-0">
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
        <div class="flex flex-1 items-center justify-center">
          <LoadingSpinner :percentage="loadingPercentage" :loading-text="loadingText" />
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import { LogicalSize } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'

import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useCheckUpdate } from '@/hooks/useCheckUpdate'
import { useLogin } from '@/hooks/useLogin'
import { useMitt } from '@/hooks/useMitt.ts'
import rustWebSocketClient from '@/services/webSocketRust'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { isWindows } from '@/utils/PlatformConstants'
import { MittEnum, NotificationTypeEnum, TauriCommand } from '@/enums'
import { clearListener, initListener, readCountQueue } from '@/utils/ReadCountQueue'
import { emitTo, listen } from '@tauri-apps/api/event'
import { UserAttentionType } from '@tauri-apps/api/window'
import type { MessageType } from '@/services/types.ts'
import { WsResponseMessageType } from '@/services/wsType.ts'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting.ts'
import { invokeSilently } from '@/utils/TauriInvokeHandler'
import { useRoute } from 'vue-router'
import { audioManager } from '@/utils/AudioManager'

const route = useRoute()
const userStore = useUserStore()
const chatStore = useChatStore()
const settingStore = useSettingStore()
const userUid = computed(() => userStore.userInfo!.uid)
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
    loadingText.value = '正在加载数据中...'
    const comp = await import('./center/index.vue')
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
const { checkUpdate, CHECK_UPDATE_TIME } = useCheckUpdate()
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

// 播放消息音效
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

useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  if (chatStore.checkMsgExist(data.message.roomId, data.message.id)) {
    return
  }

  chatStore.pushMsg(data, {
    isActiveChatView: route.path === '/message',
    activeRoomId: globalStore.currentSessionRoomId || ''
  })

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

          // 在Windows系统下，如果窗口最小化或未聚焦时请求用户注意
          if (isWindows() && (isMinimized || !isFocused)) {
            await home.requestUserAttention(UserAttentionType.Critical)
          }
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

const { resetLoginState, logout } = useLogin()
listen('relogin', async () => {
  info('收到重新登录事件')
  await resetLoginState()
  await logout()
})

onBeforeMount(async () => {
  // 获取最新的未读数
  await contactStore.getApplyUnReadCount()
  // 刷新好友申请列表
  await contactStore.getApplyPage(true)
  // 刷新好友列表
  await contactStore.getContactList(true)
})

onMounted(async () => {
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

    // 监听窗口聚焦事件，聚焦时停止tray闪烁
    if (isWindows()) {
      homeWindow.listen('tauri://focus', async () => {
        globalStore.setTipVisible(false)
        try {
          await emitTo('tray', 'home_focus', {})
          await emitTo('notify', 'home_focus', {})
        } catch (error) {
          console.warn('[layout] 向其他窗口广播聚焦事件失败:', error)
        }
      })

      homeWindow.listen('tauri://blur', async () => {
        try {
          await emitTo('tray', 'home_blur', {})
          await emitTo('notify', 'home_blur', {})
        } catch (error) {
          console.warn('[layout] 向其他窗口广播失焦事件失败:', error)
        }
      })
    }

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
