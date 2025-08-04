<template>
  <div data-tauri-drag-region class="rtc-call-container h-full bg-[--bg-color] flex flex-col select-none">
    <!-- 窗口控制栏 -->
    <ActionBar class="absolute right-0 w-full z-999" :shrink="false" :min-w="false" :max-w="false" />

    <!-- 顶部操作栏 -->
    <div class="call-header flex items-center justify-between p-16px pt-32px border-b border-[--border-color]">
      <n-flex align="center" :size="12">
        <n-avatar :size="40" :src="remoteUserInfo?.avatar" :fallback-src="''" class="rounded-8px">
          {{ remoteUserInfo?.name?.charAt(0) || 'U' }}
        </n-avatar>
        <div>
          <div class="text-16px font-medium text-[--text-color]">
            {{ remoteUserInfo?.name || '未知用户' }}
          </div>
          <div class="text-12px text-[--text-color-3]">
            {{ callStatusText }}
          </div>
        </div>
      </n-flex>

      <!-- 通话时长 -->
      <div v-if="callState === 'in_call'" class="text-14px text-[--text-color-2]">
        {{ formatDuration(callDuration) }}
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="call-content flex-1 flex flex-col items-center justify-center p-32px">
      <!-- 视频通话时显示视频 -->
      <div v-if="callType === 'video' && localStream" class="video-container mb-32px relative">
        <!-- 主视频 -->
        <video
          ref="mainVideoRef"
          autoplay
          playsinline
          class="w-320px h-240px rounded-8px bg-black object-cover"
          :muted="isLocalVideoMain"></video>

        <!-- 画中画视频 -->
        <div class="absolute top-8px right-8px group">
          <video
            ref="pipVideoRef"
            autoplay
            playsinline
            :muted="!isLocalVideoMain"
            class="w-120px h-90px rounded-4px bg-black object-cover border-2 border-white cursor-pointer hover:border-blue-400 transition-colors"
            @click="toggleVideoLayout"></video>
          <!-- 切换提示 -->
          <div
            class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-4px pointer-events-none">
            <Icon icon="material-symbols:swap-horiz" class="text-white text-20px" />
          </div>
        </div>
      </div>

      <!-- 调试用：显示本地视频流状态 -->
      <div v-if="callType === 'video'" class="debug-info mb-16px text-center">
        <p class="text-sm text-gray-500">本地视频流状态: {{ localStream ? '已获取' : '未获取' }}</p>
        <p class="text-sm text-gray-500">视频轨道数: {{ localStream?.getVideoTracks().length || 0 }}</p>
      </div>

      <!-- 语音通话或其他状态时显示头像 -->
      <div v-else class="user-avatar mb-32px relative">
        <n-avatar :size="120" :src="remoteUserInfo?.avatar" :fallback-src="''" class="rounded-full">
          <span class="text-48px font-bold">{{ remoteUserInfo?.name?.charAt(0) || 'U' }}</span>
        </n-avatar>

        <!-- 通话状态指示器 -->
        <div
          v-if="callState === 'calling' || callState === 'ringing'"
          class="absolute -bottom-4px -right-4px w-24px h-24px rounded-full bg-[--primary-color] flex items-center justify-center animate-pulse">
          <div class="w-8px h-8px rounded-full bg-white"></div>
        </div>
      </div>

      <!-- 状态文本 -->
      <div class="text-18px text-[--text-color] mb-8px text-center">
        {{ callStatusText }}
      </div>

      <!-- 通话质量指示 -->
      <div v-if="callState === 'in_call'" class="flex items-center gap-8px mb-32px">
        <div class="flex gap-2px">
          <div
            v-for="i in 4"
            :key="i"
            class="w-3px h-12px rounded-full transition-colors duration-300"
            :class="networkQuality >= i ? 'bg-[--success-color]' : 'bg-[--border-color]'"></div>
        </div>
        <span class="text-12px text-[--text-color-3]">网络质量</span>
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="call-controls flex items-center justify-center gap-24px p-32px">
      <!-- 静音按钮 -->
      <n-button
        v-if="callState === 'in_call'"
        circle
        :type="isMuted ? 'error' : 'default'"
        :size="'large'"
        @click="toggleMute"
        class="w-56px h-56px">
        <template #icon>
          <Icon :icon="isMuted ? 'material-symbols:mic-off' : 'material-symbols:mic'" :size="24" />
        </template>
      </n-button>

      <!-- 接听按钮 -->
      <n-button
        v-if="callState === 'ringing'"
        circle
        type="success"
        :size="'large'"
        @click="answerCall"
        class="w-64px h-64px">
        <template #icon>
          <Icon icon="material-symbols:call" :size="28" />
        </template>
      </n-button>

      <!-- 挂断按钮 -->
      <n-button circle type="error" :size="'large'" @click="hangupCall" class="w-64px h-64px">
        <template #icon>
          <Icon icon="material-symbols:call-end" :size="28" />
        </template>
      </n-button>

      <!-- 拒绝按钮 -->
      <n-button
        v-if="callState === 'ringing'"
        circle
        type="default"
        :size="'large'"
        @click="rejectCall"
        class="w-56px h-56px">
        <template #icon>
          <Icon icon="material-symbols:call-end" :size="24" />
        </template>
      </n-button>

      <!-- 扬声器按钮 -->
      <n-button
        v-if="callState === 'in_call'"
        circle
        :type="isSpeakerOn ? 'primary' : 'default'"
        :size="'large'"
        @click="toggleSpeaker"
        class="w-56px h-56px">
        <template #icon>
          <Icon :icon="isSpeakerOn ? 'material-symbols:volume-up' : 'material-symbols:volume-down'" :size="24" />
        </template>
      </n-button>
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

// 通过路由参数获取数据
const route = useRoute()
const remoteUserId = route.query.remoteUserId as string
const roomId = route.query.roomId as string
const callType = (route.query.callType as 'voice' | 'video') || 'voice'
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
const networkQuality = ref(4)
const remoteUserInfo = ref<Partial<CacheUserItem> | null>(null)
const callTimer = ref<ReturnType<typeof setInterval> | null>(null)

// 视频元素引用
const localVideoRef = ref<HTMLVideoElement | null>(null)
const remoteVideoRef = ref<HTMLVideoElement | null>(null)
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

// WebRTC相关方法
const createPeerConnection = () => {
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
      setRemoteStream(event.streams[0])
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

const answerCall = () => {
  callState.value = 'in_call'
  startCallTimer()
  // TODO: 实现实际的接听逻辑
  console.log('接听通话')
}

const rejectCall = () => {
  callState.value = 'ended'
  // TODO: 实现实际的拒绝逻辑
  console.log('拒绝通话')
}

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
  // TODO: 实现实际的挂断逻辑
  console.log('挂断通话')
}

const initCall = async () => {
  // 获取远程用户信息
  if (remoteUserId) {
    await cachedStore.getBatchUserInfo([remoteUserId])
    remoteUserInfo.value = cachedStore.userCachedList[remoteUserId] || null
  }

  // 设置初始状态
  if (isIncoming) {
    callState.value = 'ringing'
  } else {
    callState.value = 'calling'
  }
}

const initMediaStream = async () => {
  try {
    const constraints = {
      video: callType === 'video',
      audio: true
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStream.value = stream

    // 等待 DOM 更新后设置本地视频流
    await nextTick()
    console.log('callType:', callType, 'localVideoRef:', localVideoRef.value)
    if (localVideoRef.value && callType === 'video') {
      localVideoRef.value.srcObject = stream
      console.log('Local video stream set successfully')
    } else {
      console.log('Failed to set local video stream - localVideoRef:', localVideoRef.value, 'callType:', callType)
    }

    // 设置到画中画视频（默认本地视频在画中画位置）
    if (pipVideoRef.value && callType === 'video') {
      pipVideoRef.value.srcObject = stream
      console.log('PiP video stream set successfully')
    }

    // 创建WebRTC连接
    createPeerConnection()

    // 如果是发起方，创建offer
    if (!isIncoming) {
      await createOffer()
    }

    console.log('Got MediaStream:', stream)
  } catch (error: any) {
    console.error('Error accessing media devices.', error)
  }
}

// 设置远程视频流
const setRemoteStream = async (stream: MediaStream) => {
  remoteStream.value = stream
  await nextTick()
  if (remoteVideoRef.value && callType === 'video') {
    remoteVideoRef.value.srcObject = stream
    console.log('Remote video stream set successfully')
  }

  // 设置到主视频位置（默认远程视频在主视频位置）
  if (mainVideoRef.value && callType === 'video') {
    mainVideoRef.value.srcObject = stream
    console.log('Main video stream set successfully')
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
  initCall()
  // 监听 WebRTC 信令消息
  useMitt.on(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalMessage)
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
