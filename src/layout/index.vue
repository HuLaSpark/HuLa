<template>
  <div
    id="layout"
    class="relative flex min-w-310px bg-[--right-bg-color] h-full"
    :class="{ 'is-dragging-files': isDraggingFiles }">
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
    <div v-if="overlayVisible" class="absolute inset-0 z-10 flex items-center justify-center bg-[--right-bg-color]">
      <LoadingSpinner :percentage="loadingPercentage" :loading-text="loadingText" />
    </div>

    <transition name="drag-upload">
      <div
        v-if="isDraggingFiles"
        class="pointer-events-none absolute inset-0 z-999 flex flex-col items-center justify-center bg-black/30 text-center text-#fff">
        <div class="rounded-16px border border-white/60 bg-white/15 px-40px py-20px backdrop-blur-md">
          <p class="text-18px font-semibold tracking-wide">{{ t('home.file_drop.title') }}</p>
          <p class="mt-6px text-13px text-white/80">{{ t('home.file_drop.desc') }}</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useCheckUpdate } from '@/hooks/useCheckUpdate'
import { useLogin } from '@/hooks/useLogin'
import { useMitt } from '@/hooks/useMitt.ts'
import rustWebSocketClient from '@/services/webSocketRust'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { isMobile, isWindows } from '@/utils/PlatformConstants'
import { MittEnum, MsgEnum, NotificationTypeEnum, TauriCommand } from '@/enums'
import { clearListener, initListener, readCountQueue } from '@/utils/ReadCountQueue'
import { emitTo, listen } from '@tauri-apps/api/event'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { UserAttentionType } from '@tauri-apps/api/window'
import type { MessageType } from '@/services/types.ts'
import { WsResponseMessageType } from '@/services/wsType.ts'
import { useChatStore } from '@/stores/chat'
import { useFileStore } from '@/stores/file'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting.ts'
import { useInitialSyncStore } from '@/stores/initialSync.ts'
import { invokeSilently } from '@/utils/TauriInvokeHandler'
import { useRoute } from 'vue-router'
import { audioManager } from '@/utils/AudioManager'
import { useOverlayController } from '@/hooks/useOverlayController'
import { useGroupStore } from '@/stores/group'
import { RoomTypeEnum } from '@/enums'
import { getFilesMeta } from '@/utils/PathUtil'
import FileUtil from '@/utils/FileUtil'
import type { FilesMeta } from '@/services/types'

const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const fileStore = useFileStore()
const settingStore = useSettingStore()
// 负责记录哪些账号已经完成过首次同步的全局 store，避免多账号串数据
const initialSyncStore = useInitialSyncStore()
const userUid = computed(() => userStore.userInfo?.uid ?? '')
const hasCachedSessions = computed(() => chatStore.sessionList.length > 0)
const appWindow = WebviewWindow.getCurrent()
const loadingPercentage = ref(10)
const loadingText = ref('正在加载应用...')
const { resetLoginState, logout, init } = useLogin()
// 是否需要阻塞首屏并做初始化同步
const requiresInitialSync = ref(true)
const shouldBlockInitialRender = computed(() => requiresInitialSync.value && !hasCachedSessions.value)
const { overlayVisible, markAsyncLoaded } = useOverlayController({
  isInitialSync: shouldBlockInitialRender,
  progress: loadingPercentage,
  asyncTotal: 3,
  minDisplayMs: 600
})

let initPromise: Promise<void> | null = null
// 只有首次登录需要延迟异步组件的加载，后续重新登录直接渲染
const maybeDelayForInitialRender = async () => {
  if (!shouldBlockInitialRender.value) {
    return
  }
  await new Promise((resolve) => setTimeout(resolve, 600))
}

// 根据当前 uid 判断是否需要阻塞首屏并重新同步（依赖持久化的初始化完成名单）
const syncInitialSyncState = () => {
  if (!userUid.value || typeof window === 'undefined') {
    requiresInitialSync.value = true
    return
  }
  requiresInitialSync.value = !initialSyncStore.isSynced(userUid.value)
}

watch(
  () => userUid.value,
  () => {
    syncInitialSyncState()
  },
  { immediate: true }
)

// 初始化同步成功后标记当前 uid，后续启动直接走增量
const markInitialSyncCompleted = () => {
  if (!userUid.value || typeof window === 'undefined') {
    requiresInitialSync.value = false
    return
  }
  initialSyncStore.markSynced(userUid.value)
  requiresInitialSync.value = false
}

const runInitWithMode = (block: boolean) => {
  // 共同的初始化流程
  const p = init({ isInitialSync: block }).then(() => {
    markInitialSyncCompleted()
  })

  if (block) {
    // 首次完整同步：阻塞并抛出错误
    return p.catch((error) => {
      console.error('[layout] 首次同步数据失败:', error)
      throw error
    })
  } else {
    // 增量同步：后台执行，错误只打日志
    p.catch((error) => {
      console.error('[layout] 增量数据同步失败:', error)
    })
    return p
  }
}

// 确保初始化流程只触发一次
const ensureInitStarted = (blockInit: boolean) => {
  if (!initPromise) {
    initPromise = runInitWithMode(blockInit)
  }
  return initPromise
}

// 修改异步组件的加载配置
const AsyncLeft = defineAsyncComponent({
  loader: async () => {
    const blockInit = shouldBlockInitialRender.value
    const initTask = ensureInitStarted(blockInit)
    await maybeDelayForInitialRender()
    loadingText.value = '正在加载左侧面板...'
    const comp = await import('./left/index.vue')
    loadingPercentage.value = 33
    if (blockInit) {
      await initTask
    }
    markAsyncLoaded()
    return comp
  }
})

const AsyncCenter = defineAsyncComponent({
  loader: async () => {
    const blockInit = shouldBlockInitialRender.value
    const initTask = ensureInitStarted(blockInit)
    await import('./left/index.vue')
    loadingText.value = '正在加载数据中...'
    const comp = await import('./center/index.vue')
    loadingPercentage.value = 66
    if (blockInit) {
      await initTask
    }
    markAsyncLoaded()
    return comp
  }
})

const AsyncRight = defineAsyncComponent({
  loader: async () => {
    const blockInit = shouldBlockInitialRender.value
    const initTask = ensureInitStarted(blockInit)
    await maybeDelayForInitialRender()
    await import('./center/index.vue')
    loadingText.value = '正在加载右侧面板...'
    const comp = await import('./right/index.vue')
    loadingPercentage.value = 100
    if (blockInit) {
      await initTask
    }
    markAsyncLoaded()

    // 在组件加载完成后，使用nextTick等待DOM更新
    nextTick(() => {
      // 发送事件通知聊天框组件滚动到底部
      useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
    })

    return comp
  }
})

const globalStore = useGlobalStore()
const contactStore = useContactStore()
const { checkUpdate, CHECK_UPDATE_TIME } = useCheckUpdate()
const shrinkStatus = ref(false)
const isDraggingFiles = ref(false)
const tauriFileDropUnlisteners: UnlistenFn[] = []

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

/**
 * 从消息中提取文件信息并添加到 file store
 */
const addFileToStore = (data: MessageType) => {
  const { message } = data
  const { type, body, roomId, id } = message

  // 只处理图片和视频类型
  if (type !== MsgEnum.IMAGE && type !== MsgEnum.VIDEO) {
    return
  }

  // 提取文件信息
  const fileUrl = body.url
  if (!fileUrl) {
    return
  }

  // 从 URL 中提取文件名
  let fileName = ''
  try {
    const urlObj = new URL(fileUrl)
    const pathname = urlObj.pathname
    fileName = pathname.substring(pathname.lastIndexOf('/') + 1)
  } catch (e) {
    // 如果不是有效的 URL，直接使用消息 ID 作为文件名
    fileName = `${id}.${type === MsgEnum.IMAGE ? 'jpg' : 'mp4'}`
  }

  // 从文件名中提取后缀
  const suffix = fileName.includes('.')
    ? fileName.substring(fileName.lastIndexOf('.') + 1)
    : type === MsgEnum.IMAGE
      ? 'jpg'
      : 'mp4'

  // 确定 MIME 类型
  let mimeType = ''
  if (type === MsgEnum.IMAGE) {
    mimeType = `image/${suffix === 'jpg' ? 'jpeg' : suffix}`
  } else if (type === MsgEnum.VIDEO) {
    mimeType = `video/${suffix}`
  }

  // 添加到 file store
  fileStore.addFile({
    id,
    roomId,
    fileName,
    type: type === MsgEnum.IMAGE ? 'image' : 'video',
    url: fileUrl,
    suffix,
    mimeType
  })
}

useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  if (chatStore.checkMsgExist(data.message.roomId, data.message.id)) {
    return
  }

  chatStore.pushMsg(data, {
    // 只有当用户在消息页面且正在查看这个会话时才算 isActiveChatView
    isActiveChatView: route.path === '/message' && globalStore.currentSessionRoomId === data.message.roomId,
    activeRoomId: globalStore.currentSessionRoomId || ''
  })

  data.message.sendTime = new Date(data.message.sendTime).getTime()
  await invokeSilently(TauriCommand.SAVE_MSG, {
    data
  })

  // 如果是图片或视频消息，添加到 file store（仅移动端需要）
  if (isMobile()) {
    addFileToStore(data)
  }

  const currentUid = userUid.value
  // 不是自己发的消息才通知
  if (!currentUid || data.fromUser.uid !== currentUid) {
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

  globalStore.updateGlobalUnreadCount()
})

const cleanupNativeFileDropListeners = () => {
  while (tauriFileDropUnlisteners.length > 0) {
    const unlisten = tauriFileDropUnlisteners.pop()
    unlisten?.()
  }
}

const buildPathUploadFiles = async (paths: string[]) => {
  if (!paths?.length) return []
  try {
    const filesMeta = (await getFilesMeta<FilesMeta>(paths)) ?? []
    return await FileUtil.map2PathUploadFile(paths, filesMeta)
  } catch (error) {
    console.error('[layout] 解析拖拽文件元数据失败:', error)
    window.$message?.error?.('解析拖拽文件失败')
    return []
  }
}

const handleNativeFileDrop = async (paths: string[]) => {
  if (!paths?.length) return
  try {
    const pathFiles = await buildPathUploadFiles(paths)
    if (pathFiles.length > 0) {
      useMitt.emit(MittEnum.GLOBAL_FILES_DROP, pathFiles)
    } else {
      window.$message?.error?.('无法识别拖拽的文件')
    }
  } catch (error) {
    console.error('[layout] 处理原生拖拽文件失败:', error)
  } finally {
    isDraggingFiles.value = false
  }
}

const setupNativeFileDropListeners = async () => {
  try {
    const unlisten = await appWindow.onDragDropEvent((event) => {
      // 只有选中会话时才响应拖拽事件
      if (!globalStore.currentSessionRoomId) return

      if (event.payload.type === 'enter') {
        const paths = event.payload.paths || []
        if (paths.length > 0) {
          isDraggingFiles.value = true
        }
      } else if (event.payload.type === 'over') {
        isDraggingFiles.value = true
      } else if (event.payload.type === 'drop') {
        const paths = event.payload.paths || []
        handleNativeFileDrop(paths)
      } else if (event.payload.type === 'leave') {
        isDraggingFiles.value = false
      }
    })
    tauriFileDropUnlisteners.push(unlisten)
  } catch (error) {
    console.error('[layout] 注册原生文件拖拽监听失败:', error)
  }
}

listen('relogin', async () => {
  info('收到重新登录事件')
  await resetLoginState()
  await logout()
})

onBeforeMount(async () => {
  // 获取最新的未读数
  await contactStore.getApplyUnReadCount()
  // 刷新好友申请列表
  await contactStore.getApplyPage('friend', true)
  // 刷新好友列表
  await contactStore.getContactList(true)

  // 页面刷新时，如果用户已登录且有当前会话，刷新群成员列表以获取最新的在线状态
  if (userStore.userInfo?.uid && globalStore.currentSessionRoomId) {
    const currentSession = globalStore.currentSession
    if (currentSession?.type === RoomTypeEnum.GROUP) {
      try {
        await groupStore.getGroupUserList(globalStore.currentSessionRoomId, true)
      } catch (error) {
        console.error('[layout] 页面初始化：刷新群成员列表失败', error)
      }
    }
  }
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
    // 居中
    await homeWindow.center()
    await homeWindow.show()
  }

  await setupNativeFileDropListeners()
})

onUnmounted(() => {
  cleanupNativeFileDropListeners()
  clearListener()
  // 清除Web Worker计时器
  timerWorker.postMessage({
    type: 'clearTimer',
    msgId: 'checkUpdate'
  })
  timerWorker.terminate()
})
</script>

<style scoped>
.drag-upload-enter-active,
.drag-upload-leave-active {
  transition: opacity 0.3s ease;
}

.drag-upload-enter-from,
.drag-upload-leave-to {
  opacity: 0;
  transform: none;
}
</style>
