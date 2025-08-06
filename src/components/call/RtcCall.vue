<template>
  <div data-tauri-drag-region class="rtc-call-container h-full bg-gray-800 flex flex-col select-none">
    <!-- 窗口控制栏 -->
    <ActionBar class="absolute right-0 w-full z-999" :shrink="false" :min-w="false" :max-w="false" />

    <!-- 主要内容区域 -->
    <div class="call-content flex-1 flex flex-col items-center justify-center px-32px pt-60px">
      <!-- 视频通话时显示视频 -->
      <div v-if="callType === 'video' && localStream && isVideoOn" class="video-container mb-32px relative">
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
          v-if="callState === 'calling' || callState === 'ringing'"
          class="absolute -bottom-4px -right-4px w-24px h-24px rounded-full bg-green-500 flex items-center justify-center animate-pulse">
          <div class="w-8px h-8px rounded-full bg-white"></div>
        </div>
      </div>

      <!-- 通话时长 -->
      <div v-if="callState === 'in_call'" class="text-16px text-gray-300 mb-32px text-center">
        {{ formatDuration(callDuration) }}
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
          @click="hangupCall"
          class="control-btn w-70px h-70px rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center cursor-pointer transition-all duration-200">
          <Icon icon="material-symbols:call-end" :size="32" class="text-white" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Icon } from '@iconify/vue'
import { useCachedStore } from '@/stores/cached'
import { useUserStore } from '@/stores/user'
import ActionBar from '@/components/windows/ActionBar.vue'
import type { CacheUserItem } from '@/services/types'
import { WsRequestMsgType, WsResponseMessageType, type CallSignalMessage } from '@/services/wsType'
import ws from '@/services/webSocket'
import { useMitt } from '@/hooks/useMitt'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AvatarUtils } from '@/utils/AvatarUtils'

const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(remoteUserInfo.value?.avatar as string))
// 通过路由参数获取数据
const route = useRoute()
const remoteUserId = route.query.remoteUserId as string
const roomId = route.query.roomId as string
const callType = (route.query.callType as 'voice' | 'video') || 'voice'
// 是否是接受方，true 代表接受方
const isIncoming = route.query.isIncoming === 'true'

// Stores
const cachedStore = useCachedStore()
const userStore = useUserStore()

// 当前用户ID
const currentUserId = userStore.userInfo.uid?.toString() || ''

// 响应式数据
const callState = ref<'idle' | 'calling' | 'ringing' | 'in_call' | 'ended'>('idle')
const callDuration = ref(0)
const isMuted = ref(false)
const isSpeakerOn = ref(false)
const isVideoOn = ref(false)
// const networkQuality = ref(4)
const remoteUserInfo = ref<Partial<CacheUserItem> | null>(null)
const callTimer = ref<ReturnType<typeof setInterval> | null>(null)

// 视频元素引用
const mainVideoRef = ref<HTMLVideoElement | null>(null)
const pipVideoRef = ref<HTMLVideoElement | null>(null)

// 媒体流
const localStream = ref<MediaStream | null>(null)
const remoteStream = ref<MediaStream | null>(null)

// WebRTC连接
const peerConnection = ref<RTCPeerConnection | null>(null)
const iceCandidates = ref<RTCIceCandidate[]>([])

// 视频布局状态：false=远程视频主画面，true=本地视频主画面
const isLocalVideoMain = ref(false)

// 计算属性
const callStatusText = computed(() => {
  switch (callState.value) {
    case 'calling':
      return '正在呼叫...'
    case 'ringing':
      return '来电'
    case 'in_call':
      return '通话中'
    case 'ended':
      return '通话已结束'
    default:
      return '准备中...'
  }
})

const isPipVideoVisible = computed(() => {
  return isVideoOn.value && !!remoteStream.value
})

// WebRTC相关方法
const createPeerConnection = async () => {
  console.log('开始交换SDP')
  // 如果已经存在连接，先关闭
  if (peerConnection.value) {
    peerConnection.value.close()
  }

  // ICE服务器配置
  const configuration: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
    iceCandidatePoolSize: 10
  }

  const pc = new RTCPeerConnection(configuration)
  peerConnection.value = pc

  // 监听ICE候选者
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      iceCandidates.value.push(event.candidate)
      // 通过WebSocket发送ICE candidate给对方
      sendIceCandidate(event.candidate)
    }
  }

  // 监听ICE连接状态变化
  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', pc.iceConnectionState)
    switch (pc.iceConnectionState) {
      case 'connected':
      case 'completed':
        console.log('WebRTC连接已建立')
        if (callState.value !== 'in_call') {
          callState.value = 'in_call'
          startCallTimer()
        }
        break
      case 'disconnected':
      case 'failed':
      case 'closed':
        console.log('WebRTC连接已断开')
        callState.value = 'ended'
        stopCallTimer()
        break
    }
  }

  // 监听远程媒体流
  pc.ontrack = (event) => {
    console.log('Received remote stream:', event.streams[0])
    if (event.streams && event.streams[0]) {
      remoteStream.value = event.streams[0]
    }
  }

  // 监听连接状态变化
  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState)
  }

  // 添加本地媒体流到连接
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => {
      console.log('Adding track to peer connection:', track.kind)
      pc.addTrack(track, localStream.value!)
    })
  }

  // 如果是发起方，创建offer
  if (!isIncoming) {
    await createOffer()
  }

  return pc
}

// 创建offer
const createOffer = async () => {
  if (!peerConnection.value) {
    createPeerConnection()
  }

  try {
    const offer = await peerConnection.value!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video'
    })

    await peerConnection.value!.setLocalDescription(offer)
    console.log('Created offer:', JSON.stringify(offer))
    console.log('Offer SDP:', offer.sdp)

    // 通过WebSocket发送offer给对方
    await sendOffer(offer)
    sendCall()

    return offer
  } catch (error) {
    console.error('Error creating offer:', error)
    throw error
  }
}

// 创建answer
const createAnswer = async (offer: RTCSessionDescriptionInit) => {
  if (!peerConnection.value) {
    createPeerConnection()
  }

  try {
    await peerConnection.value!.setRemoteDescription(offer)

    const answer = await peerConnection.value!.createAnswer()
    await peerConnection.value!.setLocalDescription(answer)

    console.log('Created answer:', answer)

    // 通过WebSocket发送answer给对方
    await sendAnswer(answer)

    return answer
  } catch (error) {
    console.error('Error creating answer:', error)
    throw error
  }
}

// 处理接收到的answer
const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
  try {
    console.log('设置 answer')
    await peerConnection.value!.setRemoteDescription(answer)
  } catch (error) {
    console.error('Error handling answer:', error)
  }
}

// 添加ICE候选者
const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
  try {
    if (peerConnection.value && peerConnection.value.remoteDescription) {
      await peerConnection.value.addIceCandidate(candidate)
      console.log('Added ICE candidate')
    } else {
      // 如果还没有设置远程描述，先缓存候选者
      iceCandidates.value.push(candidate as RTCIceCandidate)
    }
  } catch (error) {
    console.error('Error adding ICE candidate:', error)
  }
}

// 发送ICE候选者
const sendIceCandidate = (candidate: RTCIceCandidate) => {
  try {
    const signalData = {
      roomId: roomId,
      signal: JSON.stringify({
        type: 'candidate',
        candidate: candidate.toJSON()
      }),
      signalType: 'candidate',
      targetUid: remoteUserId,
      mediaType: callType === 'video' ? 'VideoSignal' : 'AudioSignal'
    }

    ws.send({
      type: WsRequestMsgType.WEBRTC_SIGNAL,
      data: signalData
    })
  } catch (error) {
    console.error('Failed to send ICE candidate:', error)
  }
}

// 发送SDP offer
const sendOffer = async (offer: RTCSessionDescriptionInit) => {
  try {
    const signalData = {
      callerUid: currentUserId,
      roomId: roomId,
      signal: JSON.stringify({
        type: offer.type,
        sdp: offer.sdp
      }),
      signalType: 'offer',
      targetUid: remoteUserId,
      video: callType === 'video'
    }

    console.log('ws发送 offer')
    ws.send({
      type: WsRequestMsgType.WEBRTC_SIGNAL,
      data: signalData
    })

    console.log('SDP offer sent via WebSocket:', offer)
  } catch (error) {
    console.error('Failed to send SDP offer:', error)
  }
}

// 发送SDP answer
const sendAnswer = async (answer: RTCSessionDescriptionInit) => {
  try {
    const signalData = {
      callerUid: currentUserId,
      roomId: roomId,
      signal: JSON.stringify({
        type: answer.type,
        sdp: answer.sdp
      }),
      signalType: 'answer',
      targetUid: remoteUserId,
      video: callType === 'video'
    }

    ws.send({
      type: WsRequestMsgType.WEBRTC_SIGNAL,
      data: signalData
    })

    console.log('SDP answer sent via WebSocket:', answer)
  } catch (error) {
    console.error('Failed to send SDP answer:', error)
  }
}

// 发送通话请求
const sendCall = () => {
  ws.send({
    type: WsRequestMsgType.VIDEO_CALL_REQUEST,
    data: {
      roomId: roomId,
      targetUid: remoteUserId,
      isVideo: true
    }
  })
}

// 处理接收到的信令消息
const handleSignalMessage = async (data: CallSignalMessage) => {
  try {
    console.log('Received signal message:', data)
    const signal = JSON.parse(data.signal)

    switch (data.signalType) {
      case 'offer':
        console.log('Received SDP offer:', signal)
        // 接收到offer，创建answer
        await createAnswer(signal)
        break

      case 'answer':
        console.log('收到 Answer', signal)
        // 接收到answer，设置远程描述
        await handleAnswer(signal)
        break

      case 'candidate':
        console.log('Received ICE candidate:', signal)
        // 接收到ICE candidate，添加到连接中
        if (signal.candidate) {
          await addIceCandidate(signal.candidate)
        }
        break

      default:
        console.log('Unknown signal type:', data.signalType)
    }
  } catch (error) {
    console.error('Error handling signal message:', error)
  }
}

// 关闭WebRTC连接
const closePeerConnection = () => {
  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
    iceCandidates.value = []
    console.log('Peer connection closed')
  }
}

// 方法
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // TODO: 实现实际的静音逻辑
  console.log('切换静音状态:', isMuted.value)
}

const toggleSpeaker = () => {
  isSpeakerOn.value = !isSpeakerOn.value
  // TODO: 实现实际的扬声器切换逻辑
  console.log('切换扬声器状态:', isSpeakerOn.value)
}

const toggleVideo = async () => {
  isVideoOn.value = !isVideoOn.value

  if (isVideoOn.value) {
    // 开启摄像头，重新获取视频流
    try {
      // 等待下一个事件循环，确保视频元素已加载
      await nextTick()
      if (isLocalVideoMain.value) {
        mainVideoRef.value!.srcObject = localStream.value
        if (pipVideoRef.value) {
          pipVideoRef.value.srcObject = remoteStream.value
        }
      } else {
        if (pipVideoRef.value) {
          pipVideoRef.value.srcObject = remoteStream.value
        }
        mainVideoRef.value!.srcObject = remoteStream.value
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

// const answerCall = () => {
//   callState.value = 'in_call'
//   startCallTimer()
//   // TODO: 实现实际的接听逻辑
//   console.log('接听通话')
// }

// const rejectCall = () => {
//   callState.value = 'ended'
//   // TODO: 实现实际的拒绝逻辑
//   console.log('拒绝通话')
// }

const startCallTimer = () => {
  callTimer.value = setInterval(() => {
    callDuration.value++
  }, 1000)
}

const stopCallTimer = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
}

const hangupCall = () => {
  callState.value = 'ended'
  stopCallTimer()
  closePeerConnection()
  // 发送挂断请求
  sendRtcCall2VideoCallResponse(2)
  // 关闭窗口
  getCurrentWindow().close()
}

// 发送 ws 请求，通知双方通话状态
// -1 = 超时 0 = 拒绝 1 = 接通 2 = 挂断
const sendRtcCall2VideoCallResponse = (status: number) => {
  ws.send({
    type: WsRequestMsgType.VIDEO_CALL_RESPONSE,
    data: {
      callerUid: remoteUserId,
      roomId: roomId,
      accepted: status
    }
  })
}

const initCall = async () => {
  // 获取远程用户信息
  if (remoteUserId) {
    await cachedStore.getBatchUserInfo([remoteUserId])
    remoteUserInfo.value = cachedStore.userCachedList[remoteUserId] || null
    avatarSrc.value
  }

  // 设置初始状态
  if (isIncoming) {
    callState.value = 'ringing'
  } else {
    callState.value = 'calling'
  }

  // 初始化isLocalVideoMain
  if (!remoteStream.value) {
    isLocalVideoMain.value = callType === 'video'
  }
}

// 检查设备媒体能力
const checkMediaCapabilities = async () => {
  const capabilities = {
    hasCamera: false,
    hasMicrophone: false,
    hasSpeaker: false,
    supportedConstraints: navigator.mediaDevices.getSupportedConstraints()
  }

  try {
    // 检查是否有可用的媒体设备
    const devices = await navigator.mediaDevices.enumerateDevices()
    capabilities.hasCamera = devices.some((device) => device.kind === 'videoinput')
    capabilities.hasMicrophone = devices.some((device) => device.kind === 'audioinput')
    capabilities.hasSpeaker = devices.some((device) => device.kind === 'audiooutput')
  } catch (error) {
    console.warn('无法枚举媒体设备:', error)
  }

  return capabilities
}

const initMediaStream = async () => {
  try {
    // 先检查设备能力
    const capabilities = await checkMediaCapabilities()

    // 根据设备能力和通话类型动态设置约束
    const constraints: MediaStreamConstraints = {}

    // 检查音频能力（需要同时有麦克风和音响）
    if (capabilities.hasMicrophone && capabilities.hasSpeaker) {
      constraints.audio = true
    } else {
      if (!capabilities.hasMicrophone) {
        window.$message.warning('未检测到声音输入设备')
      }
      if (!capabilities.hasSpeaker) {
        window.$message.warning('未检测到声音输出设备')
      }
      constraints.audio = false
    }

    // 检查视频能力（仅在视频通话时需要）
    if (callType === 'video') {
      if (capabilities.hasCamera) {
        constraints.video = true
      } else {
        window.$message.warning('未检测到摄像头设备，将切换为语音通话')
        constraints.video = false
        // 可以在这里触发切换到语音通话的逻辑
      }
    } else {
      constraints.video = false
    }

    // 如果没有任何可用的媒体设备，显示错误
    if (!constraints.audio && !constraints.video) {
      throw new Error('没有可用的媒体设备')
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStream.value = stream
  } catch (error: any) {
    console.error('Error accessing media devices.', error)
    window.$message.error('媒体设备访问失败，请检查设备连接')
  }
}

// 切换视频布局
const toggleVideoLayout = async () => {
  isLocalVideoMain.value = !isLocalVideoMain.value

  // 重新分配视频流
  await nextTick()
  if (isLocalVideoMain.value) {
    // 本地视频作为主视频
    if (mainVideoRef.value && localStream.value) {
      mainVideoRef.value.srcObject = localStream.value
    }
    if (pipVideoRef.value && remoteStream.value) {
      pipVideoRef.value.srcObject = remoteStream.value
    }
  } else {
    // 远程视频作为主视频
    if (mainVideoRef.value && remoteStream.value) {
      mainVideoRef.value.srcObject = remoteStream.value
    }
    if (pipVideoRef.value && localStream.value) {
      pipVideoRef.value.srcObject = localStream.value
    }
  }
}

// 清理媒体流
const cleanupMediaStream = () => {
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => track.stop())
    localStream.value = null
  }
  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach((track) => track.stop())
    remoteStream.value = null
  }
}

// 生命周期
onMounted(async () => {
  await WebviewWindow.getCurrent().show()
  await initMediaStream()
  await initCall()
  // 监听 WebRTC 信令消息
  useMitt.on(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalMessage)
  if (isIncoming) {
    // 接受方，发送是否接受
    sendRtcCall2VideoCallResponse(1)
  } else {
    console.log('调用方发送视频通话请求')
    ws.send({
      type: WsRequestMsgType.VIDEO_CALL_REQUEST,
      data: {
        targetUid: remoteUserId,
        roomId: roomId,
        isVideo: true
      }
    })
  }
  // 调用方监听，接收方是否接受
  useMitt.on(WsResponseMessageType.CallAccepted, createPeerConnection)
  useMitt.on(WsResponseMessageType.DROPPED, hangupCall)
  useMitt.on(WsResponseMessageType.CallRejected, hangupCall)
})

onUnmounted(() => {
  // 清理资源
  cleanupMediaStream()
  closePeerConnection()
  stopCallTimer()
  // 移除 WebRTC 信令消息监听器
  useMitt.off(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalMessage)
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
