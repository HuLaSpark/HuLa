<template>
  <!-- 通知样式窗口 (接收方且未接听) -->
  <div
    v-if="isReceiver && !isCallAccepted"
    class="w-360px h-full bg-white dark:bg-gray-800 flex-y-center px-12px select-none">
    <!-- 用户头像 -->
    <div class="relative mr-12px">
      <n-avatar
        :size="56"
        :src="avatarSrc"
        :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
        :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
        class="rounded-12px shadow-md" />
      <!-- 通话类型指示器 -->
      <div class="absolute -bottom-2px -right-2px w-20px h-20px rounded-full bg-blue-500 flex-center shadow-lg">
        <svg class="size-14px color-#fff">
          <use :href="callType === CallTypeEnum.VIDEO ? '#video-one' : '#phone-telephone'"></use>
        </svg>
      </div>
    </div>

    <!-- 用户信息和状态 -->
    <div class="flex-1 min-w-0">
      <div class="text-15px font-semibold text-gray-900 dark:text-white mb-12px truncate">
        {{ remoteUserInfo?.name || '未知用户' }}
      </div>
      <div class="text-12px text-gray-500 dark:text-gray-400 flex items-center">
        <div class="w-6px h-6px rounded-full bg-#13987f mr-6px animate-pulse"></div>
        来电 · {{ callType === CallTypeEnum.VIDEO ? '视频通话' : '语音通话' }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-16px mr-8">
      <!-- 拒绝按钮 -->
      <div
        @click="hangUp(CallResponseStatus.REJECTED)"
        class="size-40px rounded-full bg-#d5304f hover:bg-#d5304f flex-center cursor-pointer shadow-lg">
        <svg class="color-#fff size-20px">
          <use href="#PhoneHangup"></use>
        </svg>
      </div>
      <!-- 接听按钮 -->
      <div
        @click="acceptCall"
        class="size-40px rounded-full bg-#13987f hover:bg-#13987f flex-center cursor-pointer shadow-lg">
        <svg class="color-#fff size-20px">
          <use href="#phone-telephone-entity"></use>
        </svg>
      </div>
    </div>
  </div>

  <!-- 正常通话窗口 -->
  <div v-else data-tauri-drag-region class="h-full flex flex-col select-none relative bg-#161616">
    <!-- 背景羽化模糊层 -->
    <div
      :style="{
        backgroundImage: `url(${avatarSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }"
      class="absolute inset-0 blur-xl opacity-40"></div>
    <!-- 深色遮罩 -->
    <div class="absolute inset-0 bg-black/20"></div>

    <!-- 窗口控制栏 -->
    <ActionBar
      ref="actionBarRef"
      class="relative z-10"
      :top-win-label="WebviewWindow.getCurrent().label"
      :shrink="false" />

    <!-- 主要内容区域 -->
    <div class="flex-1 flex-col-center px-8px pt-6px relative z-10 min-h-0">
      <!-- 视频通话时显示视频 (只有在双方都开启视频时才显示) -->
      <div
        v-if="callType === CallTypeEnum.VIDEO && localStream && (isVideoEnabled || hasRemoteVideo)"
        class="w-full flex-1 pb-22px relative min-h-0">
        <!-- 主视频 -->
        <video
          ref="mainVideoRef"
          autoplay
          playsinline
          class="w-full h-full scale-x-[-1] rounded-8px bg-black object-cover"></video>

        <!-- 画中画视频 -->
        <div class="absolute top-8px right-8px group">
          <video
            ref="pipVideoRef"
            v-if="isPipVideoVisible"
            autoplay
            playsinline
            :class="isWindowMaximized ? 'w-320px h-190px' : 'w-120px h-90px'"
            class="scale-x-[-1] rounded-8px bg-black object-cover border-2 border-white cursor-pointer"
            @click="toggleVideoLayout"></video>
          <!-- 切换提示 -->
          <div
            class="absolute inset-0 flex-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-8px pointer-events-none">
            <svg class="text-#fff size-20px">
              <use href="#switch"></use>
            </svg>
          </div>
        </div>
      </div>

      <!-- 语音通话或其他状态时显示头像 -->
      <div v-else class="user-avatar mb-24px relative flex flex-col items-center">
        <n-avatar
          :size="140"
          :src="avatarSrc"
          :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
          :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
          class="rounded-22px mb-16px" />

        <!-- 用户名 -->
        <div class="text-20px font-medium text-white mb-8px text-center">
          {{ remoteUserInfo?.name }}
        </div>

        <!-- 状态文本 -->
        <div class="text-14px text-gray-300 text-center">
          {{ callStatusText }}
        </div>
      </div>

      <!-- 通话时长 -->
      <div v-if="connectionStatus === RTCCallStatus.ACCEPT" class="text-16px text-gray-300 mb-32px text-center">
        {{ formattedCallDuration }}
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="relative z-10">
      <!-- 视频接通后布局 -->
      <div v-if="callType === CallTypeEnum.VIDEO" class="pb-10px flex-center gap-32px">
        <!-- 静音按钮 -->
        <div class="flex-col-x-center gap-8px w-80px">
          <div
            @click="toggleMute"
            class="size-44px rounded-full flex-center cursor-pointer"
            :class="!isMuted ? 'bg-gray-600 hover:bg-gray-500' : 'bg-#d5304f60 hover:bg-#d5304f80'">
            <svg class="size-16px color-#fff">
              <use :href="!isMuted ? '#voice' : '#voice-off'"></use>
            </svg>
          </div>
          <div class="text-12px text-gray-400 text-center">{{ !isMuted ? '麦克风已开' : '麦克风已关' }}</div>
        </div>

        <!-- 扬声器按钮 -->
        <div class="flex-col-x-center gap-8px w-80px">
          <div
            @click="toggleSpeaker"
            class="size-44px rounded-full flex-center cursor-pointer"
            :class="isSpeakerOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-#d5304f60 hover:bg-#d5304f80'">
            <svg class="size-16px color-#fff">
              <use :href="isSpeakerOn ? '#volume-notice' : '#volume-mute'"></use>
            </svg>
          </div>
          <div class="text-12px text-gray-400 text-center">{{ isSpeakerOn ? '扬声器已开' : '扬声器已关' }}</div>
        </div>

        <!-- 摄像头按钮 -->
        <div class="flex-col-x-center gap-8px w-80px">
          <div
            @click="toggleVideo"
            class="size-44px rounded-full flex-center cursor-pointer"
            :class="isVideoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-#d5304f60 hover:bg-#d5304f80'">
            <svg class="size-16px color-#fff">
              <use :href="isVideoEnabled ? '#video-one' : '#monitor-off'"></use>
            </svg>
          </div>
          <div class="text-12px text-gray-400 text-center">
            {{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}
          </div>
        </div>

        <!-- 挂断按钮 -->
        <div class="flex-col-x-center gap-8px w-80px">
          <div
            @click="hangUp()"
            class="size-44px rounded-full bg-#d5304f60 hover:bg-#d5304f80 flex-center cursor-pointer">
            <svg class="size-16px color-#fff">
              <use href="#PhoneHangup"></use>
            </svg>
          </div>
          <div class="text-12px text-gray-400 text-center">挂断</div>
        </div>
      </div>

      <!-- 语音接通后布局 -->
      <div v-else class="pb-30px flex-col-x-center">
        <!-- 上排按钮：静音、扬声器、摄像头 -->
        <div class="flex-center gap-40px mb-32px">
          <!-- 静音按钮 -->
          <div class="flex-col-x-center gap-8px w-80px">
            <div
              @click="toggleMute"
              class="size-44px rounded-full flex-center cursor-pointer"
              :class="!isMuted ? 'bg-gray-600 hover:bg-gray-500' : 'bg-#d5304f60 hover:bg-#d5304f80'">
              <svg class="size-16px color-#fff">
                <use :href="!isMuted ? '#voice' : '#voice-off'"></use>
              </svg>
            </div>
            <div class="text-12px text-gray-400 text-center">{{ !isMuted ? '麦克风已开' : '麦克风已关' }}</div>
          </div>

          <!-- 扬声器按钮 -->
          <div class="flex-col-x-center gap-8px w-80px">
            <div
              @click="toggleSpeaker"
              class="size-44px rounded-full flex-center cursor-pointer"
              :class="isSpeakerOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-#d5304f60 hover:bg-#d5304f80'">
              <svg class="size-16px color-#fff">
                <use :href="isSpeakerOn ? '#volume-notice' : '#volume-mute'"></use>
              </svg>
            </div>
            <div class="text-12px text-gray-400 text-center">{{ isSpeakerOn ? '扬声器已开' : '扬声器已关' }}</div>
          </div>
        </div>

        <!-- 下排按钮：挂断 -->
        <div class="flex-x-center">
          <div
            @click="hangUp()"
            class="size-66px rounded-full bg-#d5304f60 hover:bg-#d5304f80 flex-center cursor-pointer">
            <svg class="size-24px color-#fff">
              <use href="#PhoneHangup"></use>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>

  <audio ref="remoteAudioRef" autoplay playsinline style="display: none"></audio>
</template>

<script setup lang="ts">
import { LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { primaryMonitor } from '@tauri-apps/api/window'
import { info } from '@tauri-apps/plugin-log'
import { useRoute } from 'vue-router'
import type ActionBar from '@/components/windows/ActionBar.vue'
import { CallTypeEnum, RTCCallStatus, ThemeEnum } from '@/enums'
import { useWebRtc } from '@/hooks/useWebRtc'
import { useSettingStore } from '@/stores/setting'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { isDesktop, isMac, isMobile, isWindows } from '@/utils/PlatformConstants'
import { invokeSilently } from '@/utils/TauriInvokeHandler'
import router from '~/src/router'
import { useGroupStore } from '~/src/stores/group'
import { CallResponseStatus } from '../../services/wsType'

const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
// 通过路由参数获取数据
const route = useRoute()
const remoteUserId = route.query.remoteUserId as string
const roomId = route.query.roomId as string
const callType = (route.query.callType as string) === '1' ? CallTypeEnum.AUDIO : CallTypeEnum.VIDEO
// 是否是接受方，true 代表接受方
const isReceiver = route.query.isIncoming === 'true'
const {
  localStream,
  remoteStream,
  handleCallResponse,
  callDuration,
  connectionStatus,
  sendRtcCall2VideoCallResponse,
  toggleMute: toggleMuteWebRtc,
  toggleVideo: toggleVideoWebRtc,
  isVideoEnabled,
  pauseBell,
  playBell,
  stopBell,
  startBell
} = useWebRtc(roomId, remoteUserId, callType, isReceiver)
const remoteAudioRef = ref<HTMLAudioElement>()
const isMuted = ref(false)
const isSpeakerOn = ref(true)
// 视频通话时默认开启视频，语音通话时默认关闭
const isVideoOn = ref(callType === CallTypeEnum.VIDEO)
const groupStore = useGroupStore()
// 获取远程用户信息
const remoteUserInfo = groupStore.getUserInfo(remoteUserId)!
// 视频元素引用
const mainVideoRef = ref<HTMLVideoElement>()
const pipVideoRef = ref<HTMLVideoElement>()
// ActionBar 组件引用
const actionBarRef = useTemplateRef<typeof ActionBar>('actionBarRef')
// 视频布局状态：false=远程视频主画面，true=本地视频主画面
const isLocalVideoMain = ref(true)
// 通话接听状态
const isCallAccepted = ref(!isReceiver)

const createSize = (width: number, height: number) => {
  const size = isWindows() ? new LogicalSize(width, height) : new PhysicalSize(width, height)
  return size
}

const hangUp = (status: CallResponseStatus = CallResponseStatus.DROPPED) => {
  // 立即停止铃声
  stopBell()
  if (isMobile()) {
    router.back()
  }
  handleCallResponse(status)
}

const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(remoteUserInfo.avatar as string))

const callStatusText = computed(() => {
  switch (connectionStatus.value) {
    case RTCCallStatus.CALLING:
      return '正在呼叫...'
    case RTCCallStatus.ACCEPT:
      return '通话中'
    case RTCCallStatus.END:
      return '通话已结束'
    default:
      return '准备中...'
  }
})

// 格式化通话时长
const formattedCallDuration = computed(() => {
  const duration = callDuration.value
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
})

// 检测远程流是否有视频轨道且启用
const hasRemoteVideo = computed(() => {
  if (!remoteStream.value) return false
  const videoTracks = remoteStream.value.getVideoTracks()
  return videoTracks.length > 0 && videoTracks.some((track) => track.enabled)
})

// 检测本地视频是否启用
const hasLocalVideo = computed(() => {
  return isVideoEnabled.value && !!localStream.value
})

const isPipVideoVisible = computed(() => {
  return (hasLocalVideo.value || hasRemoteVideo.value) && !!remoteStream.value
})

// 获取窗口最大化状态
const isWindowMaximized = computed(() => {
  return actionBarRef.value?.windowMaximized
})

// 视频流分配工具函数
const assignVideoStreams = async () => {
  await nextTick()

  if (!hasLocalVideo.value && !hasRemoteVideo.value) {
    // 双方都没有视频，清空所有视频元素
    clearVideoElements()
    return
  }

  if (hasLocalVideo.value && hasRemoteVideo.value) {
    // 双方都有视频，按布局分配
    assignDualVideoStreams()
  } else if (hasLocalVideo.value) {
    // 只有本地视频
    assignSingleVideoStream(localStream.value, true)
  } else if (hasRemoteVideo.value) {
    // 只有远程视频
    assignSingleVideoStream(remoteStream.value, false)
  }
}

// 清空视频元素
const clearVideoElements = () => {
  if (mainVideoRef.value) mainVideoRef.value.srcObject = null
  if (pipVideoRef.value) pipVideoRef.value.srcObject = null
}

// 分配双视频流
const assignDualVideoStreams = () => {
  if (isLocalVideoMain.value) {
    // 本地视频作为主视频
    setVideoElement(mainVideoRef.value, localStream.value, true)
    setVideoElement(pipVideoRef.value, remoteStream.value)
  } else {
    // 远程视频作为主视频
    setVideoElement(mainVideoRef.value, remoteStream.value)
    setVideoElement(pipVideoRef.value, localStream.value, true)
  }
}

// 分配单视频流
const assignSingleVideoStream = (stream: MediaStream | null, isMuted: boolean) => {
  setVideoElement(mainVideoRef.value, stream, isMuted)
  setVideoElement(pipVideoRef.value, null, isMuted)
}

// 设置视频元素
const setVideoElement = (
  videoElement: HTMLVideoElement | undefined,
  stream: MediaStream | null,
  isMuted: boolean = false
) => {
  if (!videoElement) return

  videoElement.srcObject = stream
  videoElement.muted = isMuted

  // 设置完成后统一更新音频状态
  if (stream) {
    nextTick(() => updateRemoteVideoAudio())
  }
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  toggleMuteWebRtc()
}

// 更新所有远程视频元素的音频状态
const updateRemoteVideoAudio = () => {
  const shouldMute = !isSpeakerOn.value
  info(`updateRemoteVideoAudio, shouldMute: ${shouldMute}`)

  // 更新专用的音频元素
  if (remoteAudioRef.value && remoteStream.value) {
    remoteAudioRef.value.srcObject = remoteStream.value
    remoteAudioRef.value.muted = shouldMute
  }

  // 检查主视频是否是远程流
  if (mainVideoRef.value && mainVideoRef.value.srcObject === remoteStream.value) {
    mainVideoRef.value.muted = shouldMute
  }

  // 检查画中画视频是否是远程流
  if (pipVideoRef.value && pipVideoRef.value.srcObject === remoteStream.value) {
    pipVideoRef.value.muted = shouldMute
  }
}

const toggleSpeaker = () => {
  isSpeakerOn.value = !isSpeakerOn.value
  updateRemoteVideoAudio()
  console.log('切换扬声器状态:', isSpeakerOn.value, '远程视频静音:', !isSpeakerOn.value)

  if (connectionStatus.value === RTCCallStatus.CALLING && !isSpeakerOn.value) {
    pauseBell()
  } else if (connectionStatus.value === RTCCallStatus.CALLING && isSpeakerOn.value) {
    playBell()
  }
}

const toggleVideo = async () => {
  try {
    // 调用WebRTC层面的视频开关
    await toggleVideoWebRtc()

    // 同步UI状态
    isVideoOn.value = isVideoEnabled.value

    // 重新分配视频流
    await assignVideoStreams()
  } catch (error) {
    console.error('切换视频失败:', error)
  }
}

// 切换视频布局
const toggleVideoLayout = async () => {
  isLocalVideoMain.value = !isLocalVideoMain.value
  // 重新分配视频流
  await assignVideoStreams()
}

// 接听通话
const acceptCall = async () => {
  // 立即停止铃声
  stopBell()
  isCallAccepted.value = true
  // 调用接听响应函数
  sendRtcCall2VideoCallResponse(1)

  // 调整窗口大小为正常通话大小
  try {
    const currentWindow = WebviewWindow.getCurrent()
    const isVideo = callType === CallTypeEnum.VIDEO
    await currentWindow.setSize(createSize(isVideo ? 850 : 500, isVideo ? 580 : 650))
    await currentWindow.center()

    // 取消窗口置顶
    await currentWindow.setAlwaysOnTop(false)

    // 恢复标题栏按钮显示
    if (isMac()) {
      await invokeSilently('show_title_bar_buttons', { windowLabel: currentWindow.label })
    }

    // 确保窗口获得焦点
    try {
      await currentWindow.setFocus()
    } catch (error) {
      console.warn('Failed to set window focus after accepting call:', error)
    }
  } catch (error) {
    console.error('Failed to resize window after accepting call:', error)
  }
}

// 监听视频状态变化，自动更新视频显示
watch([hasLocalVideo, hasRemoteVideo, localStream, remoteStream], assignVideoStreams, { deep: true })

// 监听远程流变化，自动设置音频
watch(
  remoteStream,
  (newStream) => {
    if (remoteAudioRef.value && newStream) {
      remoteAudioRef.value.srcObject = newStream
      remoteAudioRef.value.muted = !isSpeakerOn.value
    }
  },
  { immediate: true }
)

// 同步初始视频状态
watch(
  isVideoEnabled,
  (newVal) => {
    isVideoOn.value = newVal
  },
  { immediate: true }
)

// 生命周期
onMounted(async () => {
  const currentWindow = WebviewWindow.getCurrent()

  // 监听窗口关闭事件，确保关闭窗口时挂断通话
  const unlistenCloseRequested = await currentWindow.onCloseRequested(async (_event) => {
    try {
      // 如果是通话状态，先发送挂断消息
      if (connectionStatus.value === RTCCallStatus.CALLING || connectionStatus.value === RTCCallStatus.ACCEPT) {
        await sendRtcCall2VideoCallResponse(CallResponseStatus.DROPPED)
        unlistenCloseRequested()
      }
    } catch (error) {
      console.error('发送挂断消息失败:', error)
    }
  })

  if (isDesktop()) {
    if (isReceiver && !isCallAccepted.value) {
      // 接收方立即开始播放铃声
      startBell()

      // 设置来电通知窗口的正确大小和位置
      await currentWindow.setSize(createSize(360, 90))

      // 隐藏标题栏和设置窗口不可移动
      if (isMac()) {
        await invokeSilently('hide_title_bar_buttons', { windowLabel: currentWindow.label, hideCloseButton: true })
      }

      // 获取屏幕尺寸并定位
      const monitor = await primaryMonitor()
      if (monitor) {
        const margin = 20
        const taskbarHeight = 40

        let screenWidth: number
        let screenHeight: number
        let x: number
        let y: number

        if (isWindows()) {
          // Windows使用逻辑像素进行计算，窗口在右下角
          screenWidth = monitor.size.width / (monitor.scaleFactor || 1)
          screenHeight = monitor.size.height / (monitor.scaleFactor || 1)
          x = Math.max(0, screenWidth - 360 - margin)
          y = Math.max(0, screenHeight - 90 - margin - taskbarHeight)
          await currentWindow.setPosition(new LogicalPosition(x, y))
        } else {
          // Mac使用物理像素进行计算，窗口在右上角
          screenWidth = monitor.size.width
          screenHeight = monitor.size.height
          x = Math.max(0, screenWidth - 360 - margin)
          y = margin
          await currentWindow.setPosition(new PhysicalPosition(x, y))
        }
      } else {
        // 如果无法获取主显示器信息，使用屏幕右下角的估算位置
        await currentWindow.setPosition(new LogicalPosition(800, 600))
      }
      await currentWindow.setAlwaysOnTop(true)
    } else {
      // 正常通话窗口设置
      await currentWindow.center()
      await currentWindow.setAlwaysOnTop(false)

      // 确保标题栏按钮显示（非来电通知状态）
      if (isMac()) {
        await invokeSilently('show_title_bar_buttons', { windowLabel: currentWindow.label })
      }
    }

    // 确保窗口显示
    await currentWindow.show()
    await currentWindow.setFocus()
  }
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>
