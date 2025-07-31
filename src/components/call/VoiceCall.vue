<template>
  <div class="voice-call-container">
    <!-- 通话状态显示 -->
    <div class="call-status">
      <p v-if="callState === 'calling'">呼叫 {{ remoteUserName }}...</p>
      <p v-if="callState === 'ringing'">来自 {{ remoteUserName }} 的来电</p>
      <p v-if="callState === 'in_call'">与 {{ remoteUserName }} 通话中</p>
      <p v-if="callState === 'ended'">通话已结束</p>
    </div>

    <!-- 控制按钮 -->
    <div class="call-controls">
      <!-- 接听按钮 -->
      <button v-if="callState === 'ringing'" class="accept-btn" @click="answerCall">
        <svg class="size-24px color-white">
          <use href="#phone-telephone"></use>
        </svg>
      </button>

      <!-- 挂断按钮 -->
      <button class="hangup-btn" @click="hangup">
        <svg class="size-24px color-white">
          <use href="#phone-hang-up"></use>
        </svg>
      </button>

      <!-- 拒绝按钮 -->
      <button v-if="callState === 'ringing'" class="reject-btn" @click="rejectCall">
        <svg class="size-24px color-white">
          <use href="#phone-off"></use>
        </svg>
      </button>
    </div>

    <!-- 通话时长 -->
    <div v-if="callState === 'in_call'" class="call-duration">
      {{ formatDuration(callDuration) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ws from '@/services/webSocket'
import { WsRequestMsgType, WsResponseMessageType } from '@/services/wsType'
import { useMitt } from '@/hooks/useMitt.ts'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  remoteUserId: {
    type: String,
    required: true
  },
  remoteUserName: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    required: true
  }
})

const emit = defineEmits<{
  'call-ended': [value: boolean]
}>()

const userStore = useUserStore()?.userInfo
// 通话状态：idle, calling, ringing, in_call, ended
const callState = ref<'idle' | 'calling' | 'ringing' | 'in_call' | 'ended' | 'destroyed'>('idle')
const localStream = ref<MediaStream | null>(null)
const peerConnection = ref<RTCPeerConnection | null>(null)
const callTimer = ref<ReturnType<typeof setInterval> | null>(null)
const callDuration = ref(0) // 通话时长（秒）

// const createDummyAudioStream = () => {
//   const audioContext = new AudioContext()
//   const oscillator = audioContext.createOscillator()
//   const destination = oscillator.connect(audioContext.createMediaStreamDestination())
//   oscillator.start()
//   return destination.stream
// }

// 初始化语音通话
const initCall = async () => {
  try {
    // 获取麦克风权限
    // localStream.value = createDummyAudioStream()
    localStream.value = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    })

    // 创建RTCPeerConnection
    peerConnection.value = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    // 添加音频轨道
    localStream.value.getTracks().forEach((track) => {
      peerConnection.value!.addTrack(track, localStream.value!)
    })

    // 设置事件监听
    peerConnection.value.onicecandidate = handleICECandidate
    peerConnection.value.ontrack = handleRemoteStream

    // 创建并发送Offer
    const offer = await peerConnection.value.createOffer()
    await peerConnection.value.setLocalDescription(offer)

    sendSignal(offer)

    callState.value = 'calling'

    // 启动通话超时计时器
    setTimeout(() => {
      if (callState.value === 'calling') {
        hangup()
        useMitt.emit(WsResponseMessageType.CallTimeout, {
          targetUid: props.remoteUserId,
          roomId: props.roomId
        })
      }
    }, 30000) // 30秒超时
  } catch (error) {
    console.error('初始化语音通话失败:', error)
    endCall()
  }
}

const sendWebRtcSignal = (signal: any, signalType: 'offer' | 'answer' | 'candidate') => {
  ws.send({
    type: WsRequestMsgType.WEBRTC_SIGNAL,
    data: {
      targetUid: props.remoteUserId,
      roomId: props.roomId,
      signal,
      signalType
    }
  })
}

// 处理收到的Offer（被呼叫方）
const handleOffer = async (offer: RTCSessionDescriptionInit) => {
  console.log('收到通信：offer、 对方id', offer, props.remoteUserId)

  await peerConnection.value!.setRemoteDescription(offer)

  // 创建Answer
  const answer = await peerConnection.value!.createAnswer()
  await peerConnection.value!.setLocalDescription(answer)

  // 发送Answer
  // sendSignal(answer, 'answer')
  sendWebRtcSignal(answer, 'answer')

  startCall()
}

const sendSignal = (signal: RTCSessionDescriptionInit) => {
  console.log('发送呼叫请求（含Offer）：对方id', props.remoteUserId)
  ws.send({
    type: WsRequestMsgType.VIDEO_CALL_REQUEST,
    data: {
      targetUid: props.remoteUserId,
      roomId: props.roomId,
      isVideo: false,
      signal,
      signalType: 'offer'
    }
  })
}

// 处理ICE候选
const handleICECandidate = (event: RTCPeerConnectionIceEvent) => {
  if (event.candidate) {
    sendWebRtcSignal(event.candidate, 'candidate')
  } else {
    console.log('ICE收集完成')
    sendWebRtcSignal(null, 'candidate')
  }
}

// 处理远程音轨
const handleRemoteStream = (event: RTCTrackEvent) => {
  if (event.streams && event.streams[0]) {
    // 这里可以播放远程音频流
    const audio = new Audio()
    audio.srcObject = event.streams[0]
    audio.play().catch((e) => console.error('播放音频失败:', e))
  }
}

// 开始通话
const startCall = () => {
  console.log('开始通话')
  callState.value = 'in_call'
  // 启动通话计时器
  callTimer.value = setInterval(() => {
    callDuration.value++
  }, 1000)
}

// 接听电话
const answerCall = async () => {
  if (!pendingOffer.value) {
    console.error('无待处理的Offer')
    return
  }

  try {
    await peerConnection.value!.setRemoteDescription(pendingOffer.value)
    const answer = await peerConnection.value!.createAnswer()
    await peerConnection.value!.setLocalDescription(answer)
    sendWebRtcSignal(answer, 'answer') // 使用专用信道发送Answer
    startCall()

    // 发送接听响应
    ws.send({
      type: WsRequestMsgType.VIDEO_CALL_RESPONSE,
      data: {
        callerUid: props.remoteUserId,
        targetUid: userStore.uid,
        roomId: props.roomId,
        accepted: 1
      }
    })
  } catch (error) {
    console.error('接听失败:', error)
    endCall()
  }
}

// 拒绝电话
const rejectCall = () => {
  console.log('前端已经拒绝')
  ws.send({
    type: WsRequestMsgType.VIDEO_CALL_RESPONSE,
    data: {
      callerUid: props.remoteUserId,
      targetUid: userStore.uid,
      roomId: props.roomId,
      accepted: 0
    }
  })
  endCall()
}

const destroyCall = () => {
  console.log('销毁通话资源')
  callState.value = 'destroyed'

  // 清理计时器
  if (callTimer.value) clearInterval(callTimer.value)

  // 关闭PeerConnection
  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
  }

  // 停止媒体流
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => track.stop())
    localStream.value = null
  }

  // 移除所有事件监听
  useMitt.off(WsResponseMessageType.VideoCallRequest, handleIncomingCall)
  useMitt.off(WsResponseMessageType.CallAccepted, handleCallAccepted)
  useMitt.off(WsResponseMessageType.CallRejected, handleCallRejected)
  useMitt.off(WsResponseMessageType.RoomClosed, handleRoomClosed)
  useMitt.off(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalingMessage)

  // 通知父组件关闭弹窗
  emit('call-ended', true)
}

// 挂断电话
const hangup = () => {
  console.log('前端已经挂断')
  ws.send({
    type: WsRequestMsgType.VIDEO_CALL_RESPONSE,
    data: {
      roomId: props.roomId,
      accepted: 2
    }
  })
  destroyCall()
}

// 结束通话
const endCall = () => {
  callState.value = 'ended'
  // 清理资源
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }

  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
  }

  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => track.stop())
    localStream.value = null
  }

  // 3秒后关闭组件
  setTimeout(() => {
    callState.value = 'idle'
  }, 3000)
}

// 格式化通话时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  // 监听信令消息
  useMitt.on(WsResponseMessageType.VideoCallRequest, handleIncomingCall)
  useMitt.on(WsResponseMessageType.CallAccepted, handleCallAccepted)
  useMitt.on(WsResponseMessageType.CallRejected, handleCallRejected)
  useMitt.on(WsResponseMessageType.RoomClosed, handleRoomClosed)
  useMitt.on(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalingMessage)

  // 如果是从主动呼叫进入，初始化呼叫流程
  if (callState.value === 'idle') {
    initCall()
  }
})

onBeforeUnmount(() => {
  // 清理事件监听
  useMitt.off(WsResponseMessageType.VideoCallRequest, handleIncomingCall)
  useMitt.off(WsResponseMessageType.CallAccepted, handleCallAccepted)
  useMitt.off(WsResponseMessageType.CallRejected, handleCallRejected)
  useMitt.off(WsResponseMessageType.RoomClosed, handleRoomClosed)
  useMitt.off(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalingMessage)

  // 确保清理资源
  endCall()
})

// 收到对方的来电后
const createPeerConnectionAsCallee = async () => {
  peerConnection.value = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

  peerConnection.value.onicecandidate = handleICECandidate
  peerConnection.value.ontrack = handleRemoteStream

  // 获取本地媒体流
  localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
  localStream.value.getTracks().forEach((track) => peerConnection.value!.addTrack(track))
}
const pendingOffer = ref<RTCSessionDescriptionInit | null>(null)

// 处理来电
const handleIncomingCall = (data: any) => {
  if (data.signalType === 'offer') {
    pendingOffer.value = data.signal
    createPeerConnectionAsCallee()
    callState.value = 'ringing'
  }

  // console.log("处理来电", userStore.uid, "来电数据包", data)
  // if (callState.value === 'destroyed') return
  // // 这里 targetUid 是被叫方id，如果群聊的话判断roomId即可，这里用&&，如果人数很多的话后端需要生成很多对象，有点耗费带宽
  // if (data.targetUid !== userStore.uid && data.roomId !== props.roomId) return;
  // createPeerConnectionAsCallee();
  // callState.value = 'ringing'; // 进入响铃状态
}

// 处理对方接受通话
const handleCallAccepted = (data: any) => {
  if (callState.value === 'destroyed') return
  if (data.targetUid === userStore.uid && data.roomId === props.roomId) {
    startCall()
  }
}

// 处理对方拒绝通话
const handleCallRejected = (data: any) => {
  if (callState.value === 'destroyed') return
  if (data.targetUid === userStore.uid && data.roomId === props.roomId) {
    endCall()
  }
}

// 处理房间关闭
const handleRoomClosed = (data: any) => {
  if (callState.value === 'destroyed') return
  if (data.roomId === props.roomId) {
    endCall()
  }
}

// 处理信令消息
const handleSignalingMessage = (data: any) => {
  if (callState.value === 'destroyed') return

  // 校验信令是否针对当前用户和房间
  if (data.to !== userStore.uid && data.roomId !== props.roomId) return

  switch (data.signalType) {
    case 'offer':
      // 被叫方仅在接听后处理offer
      if (callState.value === 'in_call') handleOffer(data.signal)
      break
    case 'answer':
      peerConnection.value?.setRemoteDescription(data.signal)
      break
    case 'candidate':
      peerConnection.value?.addIceCandidate(data.signal)
      break
  }
}
</script>

<style scoped>
.voice-call-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 10px;
  color: white;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.call-status {
  text-align: center;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 500;
}

.call-duration {
  text-align: center;
  margin-top: 10px;
  font-size: 24px;
  font-weight: bold;
}

.call-controls {
  display: flex;
  justify-content: space-around;
}

button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

button:hover {
  transform: scale(1.1);
}

.hangup-btn {
  background-color: #ff4d4f;
}

.accept-btn {
  background-color: #52c41a;
}

.reject-btn {
  background-color: #faad14;
}
</style>
