<template>
  <!-- 通知样式窗口 (接收方且未接听) -->
  <div
    v-if="isReceiver && !isCallAccepted"
    data-tauri-drag-region
    class="notification-container w-360px h-100px bg-white dark:bg-gray-900 rounded-12px shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center p-12px select-none backdrop-blur-md">
    <!-- 用户头像 -->
    <div class="relative mr-12px">
      <n-avatar :size="56" :src="avatarSrc" :fallback-src="''" class="rounded-12px shadow-md" />
      <!-- 通话类型指示器 -->
      <div
        class="absolute -bottom-2px -right-2px w-20px h-20px rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
        <Icon
          :icon="callType === CallTypeEnum.VIDEO ? 'material-symbols:videocam' : 'material-symbols:call'"
          :size="12"
          class="text-white" />
      </div>
    </div>

    <!-- 用户信息和状态 -->
    <div class="flex-1 min-w-0">
      <div class="text-15px font-semibold text-gray-900 dark:text-white mb-2px truncate">
        {{ remoteUserInfo?.name || '未知用户' }}
      </div>
      <div class="text-12px text-gray-500 dark:text-gray-400 flex items-center">
        <div class="w-6px h-6px rounded-full bg-green-500 mr-6px animate-pulse"></div>
        来电 · {{ callType === CallTypeEnum.VIDEO ? '视频通话' : '语音通话' }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-6px mr-7">
      <!-- 拒绝按钮 -->
      <div
        @click="rejectCall"
        class="w-44px h-44px rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95">
        <Icon icon="material-symbols:call-end" :size="20" class="text-white" />
      </div>
      <!-- 接听按钮 -->
      <div
        @click="acceptCall"
        class="w-44px h-44px rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95">
        <Icon icon="material-symbols:call" :size="20" class="text-white" />
      </div>
    </div>
  </div>

  <!-- 正常通话窗口 -->
  <div v-else data-tauri-drag-region class="rtc-call-container h-full bg-gray-800 flex flex-col select-none">
    <!-- 窗口控制栏 -->
    <ActionBar class="absolute right-0 w-full z-999" :shrink="false" :min-w="false" :max-w="false" />

    <!-- 主要内容区域 -->
    <div class="call-content flex-1 flex flex-col items-center justify-center px-32px pt-60px">
      <!-- 视频通话时显示视频 -->
      <div v-if="callType === CallTypeEnum.VIDEO && localStream && isVideoOn" class="video-container mb-32px relative">
        <!-- 主视频 -->
        <video
          ref="mainVideoRef"
          autoplay
          playsinline
          class="w-320px h-240px rounded-8px bg-black object-cover"></video>

        <!-- 画中画视频 -->
        <div class="absolute top-8px right-8px group">
          <video
            ref="pipVideoRef"
            v-if="isPipVideoVisible"
            autoplay
            playsinline
            class="w-120px h-90px rounded-4px bg-black object-cover border-2 border-white cursor-pointer hover:border-blue-400 transition-colors"
            @click="toggleVideoLayout"></video>
          <!-- 切换提示 -->
          <div
            class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-4px pointer-events-none">
            <Icon icon="material-symbols:swap-horiz" class="text-white text-20px" />
          </div>
        </div>
      </div>

      <!-- 语音通话或其他状态时显示头像 -->
      <div v-else class="user-avatar mb-24px relative flex flex-col items-center">
        <n-avatar :size="120" :src="avatarSrc" :fallback-src="''" class="rounded-12px mb-16px" />

        <!-- 用户名 -->
        <div class="text-20px font-medium text-white mb-8px text-center">
          {{ remoteUserInfo?.name }}
        </div>

        <!-- 状态文本 -->
        <div class="text-14px text-gray-300 text-center">
          {{ callStatusText }}
        </div>

        <!-- 通话状态指示器 -->
        <div
          v-if="connectionStatus === RTCCallStatus.CALLING"
          class="absolute -bottom-4px -right-4px w-24px h-24px rounded-full bg-green-500 flex items-center justify-center animate-pulse">
          <div class="w-8px h-8px rounded-full bg-white"></div>
        </div>
      </div>

      <!-- 通话时长 -->
      <div v-if="connectionStatus === RTCCallStatus.ACCEPT" class="text-16px text-gray-300 mb-32px text-center">
        {{ formattedCallDuration }}
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="call-controls flex flex-col items-center pb-40px">
      <!-- 上排按钮：静音、扬声器、摄像头 -->
      <div class="flex items-start justify-center gap-40px mb-32px">
        <!-- 静音按钮 -->
        <div class="flex flex-col items-center">
          <div
            @click="toggleMute"
            class="control-btn w-60px h-60px rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 mb-8px"
            :class="isMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'">
            <Icon :icon="isMuted ? 'material-symbols:mic-off' : 'material-symbols:mic'" :size="24" class="text-white" />
          </div>
          <div class="text-12px text-gray-400 whitespace-nowrap">{{ isMuted ? '无麦克风' : '麦克风' }}</div>
        </div>

        <!-- 扬声器按钮 -->
        <div class="flex flex-col items-center">
          <div
            @click="toggleSpeaker"
            class="control-btn w-60px h-60px rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 mb-8px"
            :class="isSpeakerOn ? 'bg-blue-500 hover:bg-blue-400' : 'bg-gray-600 hover:bg-gray-500'">
            <Icon
              :icon="isSpeakerOn ? 'material-symbols:volume-up' : 'material-symbols:volume-down'"
              :size="24"
              class="text-white" />
          </div>
          <div class="text-12px text-gray-400 whitespace-nowrap">{{ isSpeakerOn ? '扬声器已开' : '扬声器' }}</div>
        </div>

        <!-- 摄像头按钮 -->
        <div class="flex flex-col items-center">
          <div
            @click="toggleVideo"
            class="control-btn w-60px h-60px rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 mb-8px"
            :class="isVideoOn ? 'bg-blue-500 hover:bg-blue-400' : 'bg-red-500 hover:bg-red-400'">
            <Icon
              :icon="isVideoOn ? 'material-symbols:videocam' : 'material-symbols:videocam-off'"
              :size="24"
              class="text-white" />
          </div>
          <div class="text-12px text-gray-400 whitespace-nowrap">{{ isVideoOn ? '关闭摄像头' : '开启摄像头' }}</div>
        </div>
      </div>

      <!-- 下排按钮：挂断 -->
      <div class="flex justify-center">
        <div
          @click="endCall(2)"
          class="control-btn w-70px h-70px rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center cursor-pointer transition-all duration-200">
          <Icon icon="material-symbols:call-end" :size="32" class="text-white" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize, LogicalPosition, PhysicalSize, PhysicalPosition } from '@tauri-apps/api/dpi'
import { primaryMonitor } from '@tauri-apps/api/window'
import { type } from '@tauri-apps/plugin-os'
import { Icon } from '@iconify/vue'
import ActionBar from '@/components/windows/ActionBar.vue'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useWebRtc } from '@/hooks/useWebRtc'
import { useUserInfo } from '@/hooks/useCached'
import { CallTypeEnum, RTCCallStatus } from '@/enums'

const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(remoteUserInfo.value?.avatar as string))
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
  endCall,
  callDuration,
  connectionStatus,
  sendRtcCall2VideoCallResponse,
  toggleMute: toggleMuteWebRtc
} = useWebRtc(roomId, remoteUserId, callType, isReceiver)
const isMuted = ref(false)
const isSpeakerOn = ref(false)
const isVideoOn = ref(false)
// 获取远程用户信息
const remoteUserInfo = useUserInfo(remoteUserId)
// 视频元素引用
const mainVideoRef = ref<HTMLVideoElement>()
const pipVideoRef = ref<HTMLVideoElement>()
// 视频布局状态：false=远程视频主画面，true=本地视频主画面
const isLocalVideoMain = ref(true)
// 通话接听状态
const isCallAccepted = ref(!isReceiver)

// 根据操作系统选择合适的Size类型
// Windows使用LogicalSize，Mac使用PhysicalSize
const currentOS = type()
console.log('当前操作系统:', currentOS)

const createSize = (width: number, height: number) => {
  const size = currentOS === 'windows' ? new LogicalSize(width, height) : new PhysicalSize(width, height)
  console.log(
    `创建窗口大小 ${width}x${height}:`,
    size,
    `类型: ${currentOS === 'windows' ? 'LogicalSize' : 'PhysicalSize'}`
  )
  return size
}

const normalSize = createSize(500, 650)
const notificationSize = createSize(360, 100)

// 计算属性
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

const isPipVideoVisible = computed(() => {
  return isVideoOn.value && !!remoteStream.value
})

const toggleMute = () => {
  isMuted.value = !isMuted.value
  toggleMuteWebRtc()
}

const toggleSpeaker = () => {
  isSpeakerOn.value = !isSpeakerOn.value

  // 控制远程视频的音频输出
  const setVideoMuted = (muted: boolean) => {
    if (mainVideoRef.value && mainVideoRef.value.srcObject === remoteStream.value) {
      mainVideoRef.value.muted = muted
    }
    if (pipVideoRef.value && pipVideoRef.value.srcObject === remoteStream.value) {
      pipVideoRef.value.muted = muted
    }
  }

  // 当扬声器关闭时，静音远程视频；开启时，取消静音
  setVideoMuted(!isSpeakerOn.value)

  console.log('切换扬声器状态:', isSpeakerOn.value, '远程视频静音:', !isSpeakerOn.value)
}

const toggleVideo = async () => {
  isVideoOn.value = !isVideoOn.value

  if (isVideoOn.value) {
    // 开启摄像头，重新获取视频流
    try {
      // 等待下一个事件循环，确保视频元素已加载
      await nextTick()
      console.log('远程流：', remoteStream.value)
      console.log('本地流：', localStream.value)
      console.log('mainVideoRef.value：', mainVideoRef.value)
      console.log('pipVideoRef.value：', pipVideoRef.value)
      if (isLocalVideoMain.value) {
        mainVideoRef.value!.srcObject = localStream.value
        if (pipVideoRef.value && remoteStream.value) {
          console.log('设置远程流')
          pipVideoRef.value.srcObject = remoteStream.value
          // 应用扬声器状态到远程视频
          pipVideoRef.value.muted = !isSpeakerOn.value
        }
      } else {
        if (pipVideoRef.value) {
          pipVideoRef.value.srcObject = localStream.value
        }
        mainVideoRef.value!.srcObject = remoteStream.value
        // 应用扬声器状态到远程视频
        if (mainVideoRef.value) {
          mainVideoRef.value.muted = !isSpeakerOn.value
        }
      }
    } catch (error) {
      console.error('开启摄像头失败:', error)
      isVideoOn.value = false
    }
  } else {
    mainVideoRef.value!.srcObject = null
    pipVideoRef.value!.srcObject = null
  }
}

// 切换视频布局
const toggleVideoLayout = async () => {
  isLocalVideoMain.value = !isLocalVideoMain.value

  // 重新分配视频流
  await nextTick()
  if (isLocalVideoMain.value) {
    // 本地视频作为主视频
    mainVideoRef.value!.srcObject = localStream.value
    pipVideoRef.value!.srcObject = remoteStream.value
    // 应用扬声器状态到远程视频
    if (pipVideoRef.value) {
      pipVideoRef.value.muted = !isSpeakerOn.value
    }
  } else {
    // 远程视频作为主视频
    mainVideoRef.value!.srcObject = remoteStream.value
    pipVideoRef.value!.srcObject = localStream.value
    // 应用扬声器状态到远程视频
    if (mainVideoRef.value) {
      mainVideoRef.value.muted = !isSpeakerOn.value
    }
  }
}

// 接听通话
const acceptCall = async () => {
  isCallAccepted.value = true
  // 调用接听响应函数
  sendRtcCall2VideoCallResponse(1)

  // 调整窗口大小为正常大小
  try {
    const currentWindow = WebviewWindow.getCurrent()
    await currentWindow.setSize(normalSize)
    await currentWindow.center()

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

// 拒绝通话
const rejectCall = async () => {
  // 调用拒绝响应函数
  endCall(0)
}

// 生命周期
onMounted(async () => {
  const currentWindow = WebviewWindow.getCurrent()

  try {
    if (isReceiver && !isCallAccepted.value) {
      // 设置通知窗口大小
      await currentWindow.setSize(notificationSize)

      // 获取屏幕尺寸并定位到右下角
      try {
        const monitor = await primaryMonitor()
        if (monitor) {
          const margin = 20
          const taskbarHeight = 80 // Windows任务栏高度

          let screenWidth: number
          let screenHeight: number
          let x: number
          let y: number

          if (currentOS === 'windows') {
            // Windows使用逻辑像素进行计算
            screenWidth = monitor.size.width / (monitor.scaleFactor || 1)
            screenHeight = monitor.size.height / (monitor.scaleFactor || 1)
            x = Math.max(0, screenWidth - notificationSize.width - margin)
            y = Math.max(0, screenHeight - notificationSize.height - margin - taskbarHeight)
            await currentWindow.setPosition(new LogicalPosition(x, y))
          } else {
            // Mac使用物理像素进行计算
            screenWidth = monitor.size.width
            screenHeight = monitor.size.height
            x = Math.max(0, screenWidth - notificationSize.width - margin)
            y = Math.max(0, screenHeight - notificationSize.height - margin - taskbarHeight)
            await currentWindow.setPosition(new PhysicalPosition(x, y))
          }
        } else {
          // 如果无法获取主显示器信息，使用屏幕右下角的估算位置
          await currentWindow.setPosition(new LogicalPosition(800, 600))
        }
      } catch (error) {
        console.error('Failed to get monitor info:', error)
        // 如果获取屏幕信息失败，使用更安全的默认位置
        await currentWindow.setPosition(new LogicalPosition(800, 600))
      }
    } else {
      // 正常大小窗口
      await currentWindow.setSize(normalSize)
      await currentWindow.center()
    }

    // 确保窗口显示
    await currentWindow.show()

    // 在Windows上，有时需要额外的焦点设置
    try {
      await currentWindow.setFocus()
    } catch (error) {
      console.warn('Failed to set window focus:', error)
    }
  } catch (error) {
    console.error('Failed to setup window:', error)
    // 最后的fallback：至少尝试显示窗口
    try {
      await currentWindow.show()
    } catch (showError) {
      console.error('Failed to show window:', showError)
    }
  }
})
</script>

<style scoped>
.rtc-call-container {
  user-select: none;
}

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
