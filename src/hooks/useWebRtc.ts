import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { error, info } from '@tauri-apps/plugin-log'
import { CallTypeEnum, RTCCallStatus } from '@/enums'
import rustWebSocketClient from '@/services/webSocketRust'
import { useUserStore } from '@/stores/user'
import { WsRequestMsgType, WsResponseMessageType } from '../services/wsType'
import { useMitt } from './useMitt'

interface RtcMsgVO {
  roomId: string
  callType: CallTypeEnum
  callerId: string
  [key: string]: any
}

// 信令类型枚举
export enum SignalTypeEnum {
  JOIN = 'join',
  OFFER = 'offer',
  ANSWER = 'answer',
  CANDIDATE = 'candidate',
  LEAVE = 'leave'
}

export interface WSRtcCallMsg {
  // 房间ID
  roomId: string
  // 通话ID
  callerId: string
  // 信令类型
  signalType: SignalTypeEnum
  // 信令
  signal: string
  // 接收者ID列表
  receiverIds: string[]
  // 发送者ID
  senderId?: string
  // 通话状态
  status: RTCCallStatus
  // 是否是视频通话
  video: boolean
  // 目标uid
  targetUid: string
}

// const TURN_SERVER = import.meta.env.VITE_TURN_SERVER_URL
const MAX_TIME_OUT_SECONDS = 30 // 拨打 超时时间
const configuration: RTCConfiguration = {
  // 默认配置
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: [
        'turn:117.72.67.248:3478?transport=udp', // UDP 协议
        'turn:117.72.67.248:3478?transport=tcp' // TCP 协议
      ],
      username: 'chr', // 你的 TURN 用户名
      credential: '123456' // 你的 TURN 密码
    }
  ]
}
// const isSupportScreenSharing = !!navigator?.mediaDevices?.getDisplayMedia
// TODO 改成动态配置
const rtcCallBellUrl = '/sound/hula_bell.mp3'

/**
 * webrtc 相关
 * @returns rtc 相关的状态和方法
 */
export const useWebRtc = (roomId: string, remoteUserId: string, callType: CallTypeEnum, isReceiver: boolean) => {
  info(`useWebRtc, roomId: ${roomId}, remoteUserId: ${remoteUserId}, callType: ${callType}, isReceiver: ${isReceiver}`)
  const rtcMsg = ref<Partial<RtcMsgVO>>({
    roomId: undefined,
    callType: undefined,
    callerId: undefined
  })
  const userStore = useUserStore()

  // 设备相关状态
  const audioDevices = ref<MediaDeviceInfo[]>([])
  const videoDevices = ref<MediaDeviceInfo[]>([])
  const selectedAudioDevice = ref<string | null | undefined>(null)
  const selectedVideoDevice = ref<string | null | undefined>(null)

  // 状态
  const connectionStatus = ref<RTCCallStatus | undefined>(undefined)
  const isDeviceLoad = ref(false)
  const isLinker = ref(false) // 判断是否是 webrtc 连接的参与者

  // rtc状态
  const rtcStatus = ref<RTCPeerConnectionState | undefined>(undefined)
  // const isRtcConnecting = computed(() => rtcStatus.value === 'connecting')
  // 流相关状态
  const localStream = ref<MediaStream | null>(null)
  const remoteStream = ref<MediaStream | null>(null)
  // WebRTC 连接对象
  const peerConnection = ref<RTCPeerConnection | null>(null)
  const channel = ref<RTCDataChannel | null>(null)
  const channelStatus = ref<RTCDataChannelState | undefined>(undefined)
  // 待发送ice列表
  const pendingCandidates = ref<RTCIceCandidate[]>([])
  // 添加铃声相关状态
  const bellAudio = ref<HTMLAudioElement | null>(null)

  // 添加计时器引用
  const callTimer = ref<NodeJS.Timeout | null>(null)

  // 添加计时相关的变量
  const callDuration = ref(0)
  const animationFrameId = ref<number | null>(null)
  const startTime = ref<number>(0)

  // 添加桌面共享相关状态
  const isScreenSharing = ref(false)
  const offer = ref<RTCSessionDescriptionInit>()

  // 开始计时
  const startCallTimer = () => {
    // 获取高精度时间戳
    startTime.value = performance.now()
    const animate = (currentTime: number) => {
      // 计算已经过去的秒数
      const elapsed = Math.floor((currentTime - startTime.value) / 1000)
      callDuration.value = elapsed
      // 递归调用，形成动画循环
      animationFrameId.value = requestAnimationFrame(animate)
    }
    animationFrameId.value = requestAnimationFrame(animate) // 启动动画循环
  }

  // 停止计时
  const stopCallTimer = () => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
    callDuration.value = 0
    startTime.value = 0
  }

  /**
   * 打开铃声
   */
  const startBell = () => {
    if (!rtcCallBellUrl) {
      console.log('rtc通话已经静音')
      bellAudio.value = null
      return
    }
    bellAudio.value = new Audio(rtcCallBellUrl)
    bellAudio.value!.loop = true
    bellAudio.value?.play?.()
  }

  /**
   * 发送通话请求
   */
  const sendCall = async () => {
    try {
      await rustWebSocketClient.sendMessage({
        type: WsRequestMsgType.VIDEO_CALL_REQUEST,
        data: {
          roomId: roomId,
          targetUid: remoteUserId,
          isVideo: callType === CallTypeEnum.VIDEO
        }
      })
    } catch (error) {
      console.error('发送通话请求失败:', error)
    }
  }

  /**
   * 关闭铃声
   */
  const stopBell = () => {
    bellAudio.value?.pause?.()
    bellAudio.value = null
  }

  const pauseBell = () => {
    bellAudio.value?.pause?.()
  }

  const playBell = () => {
    bellAudio.value?.play?.()
  }

  /**
   * 接听电话响应事件
   */
  const handleCallResponse = async (status: number) => {
    try {
      info('[收到通知] 接听电话响应事件')
      // 发送挂断消息
      sendRtcCall2VideoCallResponse(status)
      await endCall()
    } finally {
      clear()
    }
  }

  /**
   * 结束通话
   */
  const endCall = async () => {
    try {
      info('[收到通知] 结束通话')
      await getCurrentWebviewWindow().close()
    } finally {
      clear()
    }
  }

  // 发送 ws 请求，通知双方通话状态
  // -1 = 超时 0 = 拒绝 1 = 接通 2 = 挂断
  const sendRtcCall2VideoCallResponse = async (status: number) => {
    try {
      info(`发送 ws 请求，通知双方通话状态 ${status}`)
      await rustWebSocketClient.sendMessage({
        type: WsRequestMsgType.VIDEO_CALL_RESPONSE,
        data: {
          callerUid: remoteUserId,
          roomId: roomId,
          accepted: status
        }
      })
    } catch (error) {
      console.error('发送通话响应失败:', error)
    }
  }

  // 获取设备列表
  const getDevices = async () => {
    try {
      info('start getDevices')
      isDeviceLoad.value = true

      // 先请求权限以获取完整的设备信息
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        stream.getTracks().forEach((track) => track.stop()) // 立即停止流
      } catch (_permissionError) {
        error('Permission denied, will get limited device info')
      }

      const devices = (await navigator.mediaDevices.enumerateDevices()) || []
      info(`getDevices, devices: ${JSON.stringify(devices)}`)
      if (devices.length === 0) {
        return false
      }
      audioDevices.value = devices.filter((device) => device.kind === 'audioinput')
      videoDevices.value = devices.filter((device) => device.kind === 'videoinput')
      // 默认选择 “default” | "第一个" 设备
      selectedAudioDevice.value =
        audioDevices.value.find((device) => device.deviceId === 'default')?.deviceId ||
        audioDevices.value?.[0]?.deviceId
      selectedVideoDevice.value =
        videoDevices.value.find((device) => device.deviceId === 'default')?.deviceId ||
        videoDevices.value?.[0]?.deviceId
      isDeviceLoad.value = false
      return true
    } catch (err) {
      window.$message.error('获取设备失败!')
      error(`获取设备失败: ${err}`)
      // 默认没有设备
      selectedAudioDevice.value = selectedAudioDevice.value || null
      selectedVideoDevice.value = selectedVideoDevice.value || null
      isDeviceLoad.value = false
      return false
    }
  }

  // 获取本地媒体流
  const getLocalStream = async (type: CallTypeEnum) => {
    try {
      info('获取本地媒体流')
      const constraints = {
        audio: audioDevices.value.length > 0 ? { deviceId: selectedAudioDevice.value || undefined } : false,
        video:
          type === CallTypeEnum.VIDEO && videoDevices.value.length > 0
            ? { deviceId: selectedVideoDevice.value || undefined }
            : false
      }
      if (!constraints.audio && !constraints.video) {
        window.$message.error('没有可用的设备!')
        // 没有可用设备时自动挂断并关闭窗口
        setTimeout(async () => {
          if (isReceiver) {
            // 接听方：发送拒绝响应
            await handleCallResponse(0)
          } else {
            // 发起方：直接结束通话
            await handleCallResponse(2)
          }
        }, 1000)
        return false
      }
      localStream.value = await navigator.mediaDevices.getUserMedia(constraints)
      // 打印 localStream 的信息（不能直接序列号 stream，不然会返回null）
      info(`get localStream success`)
      info(`localStream.id: ${localStream.value?.id}`)
      info(`localStream.active: ${localStream.value?.active}`)
      info(`localStream.getTracks().length: ${localStream.value?.getTracks()?.length}`)
      // 打印每个轨道的信息
      localStream.value?.getTracks()?.forEach((track, index) => {
        info(`Track ${index}: kind=${track.kind}, label=${track.label}, enabled=${track.enabled}`)
      })

      const audioTrack = localStream.value.getAudioTracks()[0]
      if (audioTrack) {
        // 检查音频轨道是否真的在工作
        info(`Audio track enabled: ${audioTrack.enabled}`)
        info(`Audio track muted: ${audioTrack.muted}`)
        info(`Audio track readyState: ${audioTrack.readyState}`)

        // 强制启用音频轨道
        audioTrack.enabled = true
      }

      return true
    } catch (err) {
      console.error('获取本地流失败:', err)
      window.$message.error('获取本地媒体流失败，请检查设备!')
      error(`获取本地媒体流失败，请检查设备! ${err}`)
      await sendRtcCall2VideoCallResponse(2)
      return false
    }
  }

  // 创建 RTCPeerConnection
  const createPeerConnection = (roomId: string) => {
    try {
      const pc = new RTCPeerConnection(configuration)

      // 监听远程流
      pc.ontrack = (event) => {
        info('pc 监听到 ontrack 事件')
        if (event.streams[0]) {
          console.log('收到远程流:', event.streams[0])
          remoteStream.value = event.streams[0]
        } else {
          remoteStream.value = null
        }
      }

      // 添加本地流
      info('添加本地流到 PC')
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => {
          localStream.value && pc.addTrack(track, localStream.value)
        })
      } else {
        console.warn('localStream 为 null，无法添加本地流到 PeerConnection')
      }

      // 连接状态变化 "closed" | "connected" | "connecting" | "disconnected" | "failed" | "new";
      pc.onconnectionstatechange = (e) => {
        info(`RTC 连接状态变化: ${pc.connectionState}`)
        switch (pc.connectionState) {
          case 'new':
            info('RTC 连接新建')
            break
          case 'connecting':
            info('RTC 连接中')
            connectionStatus.value = RTCCallStatus.CALLING
            break
          case 'connected':
            info('RTC 连接成功')
            connectionStatus.value = RTCCallStatus.ACCEPT
            startCallTimer() // 开始计时
            break
          case 'disconnected':
            info('RTC 连接断开')
            connectionStatus.value = RTCCallStatus.END
            window.$message.error('RTC通讯连接失败!')
            setTimeout(async () => {
              await endCall()
            }, 500)
            break
          case 'closed':
            info('RTC 连接关闭')
            connectionStatus.value = RTCCallStatus.END
            setTimeout(async () => {
              await endCall()
            }, 500)
            break
          case 'failed':
            connectionStatus.value = RTCCallStatus.ERROR
            info('RTC 连接失败')
            window.$message.error('RTC通讯连接失败!')
            setTimeout(async () => {
              await endCall()
            }, 500)
            break
          default:
            info('RTC 连接状态变化: ', pc.connectionState)
            break
        }
        // @ts-expect-error
        rtcStatus.value = (e?.currentTarget?.connectionState || pc.connectionState) as RTCPeerConnectionState
      }
      // 创建信道
      channel.value = pc.createDataChannel('chat')
      channel.value.onopen = () => {
        // console.log("信道已打开");
      }
      channel.value.onmessage = (_event) => {
        // console.log("收到消息:", event.data);
      }
      channel.value.onerror = (event) => {
        console.warn('信道出错:', event)
      }
      channel.value.onclose = () => {
        // console.log("信道已关闭");
      }
      pc.onicecandidate = async (event) => {
        info('pc 监听到 onicecandidate 事件')
        if (event.candidate && roomId) {
          try {
            pendingCandidates.value.push(event.candidate)
          } catch (err) {
            console.error('发送ICE候选者出错:', err)
          }
        }
      }
      peerConnection.value = pc
    } catch (err) {
      console.error('创建 PeerConnection 失败:', err)
      connectionStatus.value = RTCCallStatus.ERROR
      throw err
    }
  }

  // 发起通话
  const startCall = async (roomId: string, type: CallTypeEnum, uidList?: string[]) => {
    try {
      if (!roomId) {
        return false
      }
      clear() // 清理资源
      if (!(await getDevices())) {
        window.$message.error('获取设备失败!')
        // 获取设备失败时自动关闭窗口
        setTimeout(async () => {
          await handleCallResponse(0)
        }, 1000)
        return
      }
      // 保存通话信息
      rtcMsg.value = {
        roomId,
        callType: type,
        callerId: userStore.userInfo.uid,
        uidList: uidList || []
      }
      isLinker.value = true // 标记是会话人
      // 设置30秒超时定时器
      callTimer.value = setTimeout(() => {
        if (connectionStatus.value === RTCCallStatus.CALLING) {
          window.$message.warning('通话无人接听，自动挂断')
          endCall()
        }
      }, MAX_TIME_OUT_SECONDS * 1000)

      if (!(await getLocalStream(type))) {
        clear()
        // 获取本地媒体流失败时自动关闭窗口
        setTimeout(async () => {
          await endCall()
        }, 1000)
        return false
      }

      // 1. 创建 RTCPeerConnection
      createPeerConnection(roomId)
      // 创建并发送 offer
      const rtcOffer = await peerConnection.value!.createOffer()
      offer.value = rtcOffer
      await peerConnection.value!.setLocalDescription(rtcOffer)
      // 发起通话请求
      await sendCall()
      // 播放铃声
      startBell()

      // 开始通话
      connectionStatus.value = RTCCallStatus.CALLING
      rtcStatus.value = 'new'
    } catch (err) {
      console.error('开始通话失败:', err)
      window.$message.error('RTC通讯连接失败!')
      clear()
      return false
    }
  }

  // 发送SDP offer
  const sendOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      const signalData = {
        callerUid: userStore.userInfo.uid,
        roomId: roomId,
        signal: JSON.stringify(offer),
        signalType: 'offer',
        targetUid: remoteUserId,
        video: callType === CallTypeEnum.VIDEO
      }

      info('ws发送 offer')
      await rustWebSocketClient.sendMessage({
        type: WsRequestMsgType.WEBRTC_SIGNAL,
        data: signalData
      })
    } catch (error) {
      console.error('Failed to send SDP offer:', error)
    }
  }

  const clear = () => {
    try {
      // 停止铃声并重置
      stopBell()
      // 清除超时定时器
      if (callTimer.value) {
        clearTimeout(callTimer.value)
        callTimer.value = null
      }
      // 停止计时器
      stopCallTimer()
      // 关闭信道
      channel.value?.close?.()
      // 关闭连接
      peerConnection.value?.close?.()
      // 关闭媒体流
      localStream.value?.getTracks().forEach((track) => track.stop())
      remoteStream.value?.getTracks().forEach((track) => track.stop())
    } catch (error) {
      window.$message.error('部分资源清理失败!')
      console.error('清理资源失败:', error)
    } finally {
      // 重置状态
      rtcMsg.value = {
        roomId: undefined,
        callType: undefined,
        senderId: undefined
      }
      pendingCandidates.value = []
      audioDevices.value = []
      videoDevices.value = []
      selectedAudioDevice.value = null
      selectedVideoDevice.value = null
      localStream.value = null
      remoteStream.value = null
      connectionStatus.value = undefined
      rtcStatus.value = undefined
      isScreenSharing.value = false
      isLinker.value = false
      // 关闭连接
      peerConnection.value = null
      channel.value = null
      channelStatus.value = undefined
    }
  }

  // 发送ICE候选者
  const sendIceCandidate = async (candidate: RTCIceCandidate) => {
    try {
      info('发送ICE候选者')
      const signalData = {
        roomId: roomId,
        signal: JSON.stringify(candidate),
        signalType: 'candidate',
        targetUid: remoteUserId,
        mediaType: callType === CallTypeEnum.VIDEO ? 'VideoSignal' : 'AudioSignal'
      }

      await rustWebSocketClient.sendMessage({
        type: WsRequestMsgType.WEBRTC_SIGNAL,
        data: signalData
      })
    } catch (error) {
      console.error('Failed to send ICE candidate:', error)
    }
  }

  // 处理收到的 offer - 接听者
  const handleOffer = async (signal: RTCSessionDescriptionInit, video: boolean, roomId: string) => {
    try {
      info('收到 offer')
      connectionStatus.value = RTCCallStatus.CALLING
      await nextTick()

      await getDevices()
      const hasLocalStream = await getLocalStream(video ? CallTypeEnum.VIDEO : CallTypeEnum.AUDIO)

      // 停止铃声
      stopBell()

      // 检查本地媒体流是否获取成功
      if (!hasLocalStream || !localStream.value) {
        // 睡眠 3s
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await handleCallResponse(0)
        return false
      }

      // 2. 创建 RTCPeerConnection
      await nextTick() // 等待一帧
      createPeerConnection(roomId)
      rtcStatus.value = 'new'

      // 3. 设置远程描述
      info('设置远程描述')
      await peerConnection.value!.setRemoteDescription(signal)

      // 4. 创建并发送 answer
      const answer = await peerConnection.value!.createAnswer()
      await peerConnection.value!.setLocalDescription(answer)

      if (!roomId) {
        window.$message.error('房间号不存在，请重新连接！')
        return false
      }

      isLinker.value = true // 标记是会话人
      // 6. 发送 answer 信令到远端
      await sendAnswer(answer)
      connectionStatus.value = RTCCallStatus.ACCEPT
      info('处理 offer 结束')
    } catch (e) {
      error(`处理 offer 失败: ${e}`)
      await endCall()
    }
  }

  // 发送SDP answer
  const sendAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      const signalData = {
        callerUid: userStore.userInfo.uid,
        roomId: roomId,
        signal: JSON.stringify(answer),
        signalType: SignalTypeEnum.ANSWER,
        targetUid: remoteUserId,
        video: callType === CallTypeEnum.VIDEO
      }

      info('发送SDP answer')
      await rustWebSocketClient.sendMessage({
        type: WsRequestMsgType.WEBRTC_SIGNAL,
        data: signalData
      })

      console.log('SDP answer sent via WebSocket:', answer)
    } catch (error) {
      console.error('Failed to send SDP answer:', error)
    }
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit, roomId: string) => {
    try {
      info('处理 answer 消息')
      if (peerConnection.value) {
        // 清除超时定时器
        if (callTimer.value) {
          clearTimeout(callTimer.value)
          callTimer.value = null
        }

        // 2. 停止铃声
        stopBell()

        // 3. 通知服务器通话已建立
        if (!isReceiver) {
          if (!roomId) {
            window.$message.error('房间号不存在，请重新连接！')
            await endCall()
            return
          }
          // 4. 发起者 - 设置远程描述
          console.log('发起者 - 设置远程描述', answer)
          await peerConnection.value.setRemoteDescription(answer)
        }
      }
    } catch (error) {
      console.error('处理 answer 失败:', error)
      connectionStatus.value = RTCCallStatus.ERROR
      await endCall()
    }
  }

  // 处理 ICE candidate
  const handleCandidate = async (signal: RTCIceCandidateInit) => {
    try {
      if (peerConnection.value && peerConnection.value.remoteDescription) {
        info('添加 candidate')
        await peerConnection.value!.addIceCandidate(signal)
      }
    } catch (error) {
      console.error('处理 candidate 失败:', error)
    }
  }

  // 视频轨道状态
  const isVideoEnabled = ref(callType === CallTypeEnum.VIDEO)

  // 切换静音
  const toggleMute = () => {
    if (localStream.value) {
      const audioTrack = localStream.value.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }

  // 切换视频
  const toggleVideo = async () => {
    if (localStream.value) {
      const videoTrack = localStream.value.getVideoTracks()[0]
      if (videoTrack) {
        // 切换视频轨道的启用状态
        videoTrack.enabled = !videoTrack.enabled
        isVideoEnabled.value = videoTrack.enabled

        console.log(`视频轨道${videoTrack.enabled ? '开启' : '关闭'}`)

        // 如果是关闭视频，通知对方
        if (!videoTrack.enabled) {
          console.log('本地视频已关闭，对方将看不到视频')
        } else {
          console.log('本地视频已开启，对方可以看到视频')
        }
      } else if (callType === CallTypeEnum.VIDEO) {
        // 如果没有视频轨道但是视频通话，尝试重新获取
        try {
          const constraints = {
            audio: false,
            video: videoDevices.value.length > 0 ? { deviceId: selectedVideoDevice.value || undefined } : true
          }

          const newStream = await navigator.mediaDevices.getUserMedia(constraints)
          const newVideoTrack = newStream.getVideoTracks()[0]

          if (newVideoTrack && peerConnection.value) {
            // 添加新的视频轨道
            peerConnection.value.addTrack(newVideoTrack, localStream.value!)
            localStream.value!.addTrack(newVideoTrack)
            isVideoEnabled.value = true

            console.log('重新获取视频轨道成功')
          }
        } catch (error) {
          console.error('重新获取视频轨道失败:', error)
          window.$message.error('无法开启摄像头')
        }
      }
    }
  }

  // 切换音频设备
  const switchAudioDevice = async (deviceId: string) => {
    try {
      selectedAudioDevice.value = deviceId
      if (localStream.value) {
        const newStream = await navigator?.mediaDevices?.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video:
            rtcMsg.value.callType === CallTypeEnum.VIDEO
              ? selectedVideoDevice.value
                ? { deviceId: { exact: selectedVideoDevice.value || undefined } }
                : false
              : false
        })
        // 替换现有轨道
        const newAudioTrack = newStream.getAudioTracks()[0]
        const oldAudioTrack = localStream.value.getAudioTracks()[0]

        if (newAudioTrack) {
          if (!oldAudioTrack) {
            localStream.value.addTrack(newAudioTrack)
            peerConnection.value?.addTrack(newAudioTrack, localStream.value)
            return
          }
          peerConnection.value?.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === 'audio') {
              sender?.replaceTrack?.(newAudioTrack)
            }
          })
          oldAudioTrack && localStream.value.removeTrack(oldAudioTrack)
          localStream.value.addTrack(newAudioTrack)
        } else {
          window.$message.error('切换设备不存在或不支持，请重新选择！')
        }
      }
    } catch (error) {
      window.$message.error('切换音频设备失败！')
      console.error('切换音频设备失败:', error)
    }
  }

  // 切换视频设备
  const switchVideoDevice = async (deviceId: string) => {
    try {
      // 前置校验
      selectedVideoDevice.value = deviceId
      if (localStream.value && localStream.value.getVideoTracks().length > 0) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioDevice.value ? { deviceId: { exact: selectedAudioDevice.value || undefined } } : false,
          video: { deviceId: { exact: deviceId } }
        })

        // 替换现有轨道
        const newVideoTrack = newStream.getVideoTracks()[0]
        const oldVideoTrack = localStream.value.getVideoTracks()[0]
        // console.log(oldVideoTrack, newVideoTrack);

        if (newVideoTrack) {
          if (!oldVideoTrack) {
            localStream.value.addTrack(newVideoTrack)
            peerConnection.value?.addTrack(newVideoTrack, localStream.value)
            return
          }
          peerConnection.value?.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === 'video') {
              sender.replaceTrack(newVideoTrack)
            }
          })
          oldVideoTrack && localStream.value.removeTrack(oldVideoTrack)
          localStream.value.addTrack(newVideoTrack)
        } else {
          window.$message.error('切换设备不存在或不支持，请重新选择！')
        }
      }
    } catch (error) {
      window.$message.error('切换视频设备失败！')
      console.error('切换视频设备失败:', error)
    }
  }

  // 停止桌面共享
  const stopScreenShare = () => {
    if (isScreenSharing.value) {
      isScreenSharing.value = false
      // 停止当前的本地流
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop())
      }
      if (!selectedVideoDevice.value || !rtcMsg.value.callType) {
        return false
      }
      // 切换到默认设备
      getLocalStream(rtcMsg.value.callType)
      // 切换原来的视频轨道
      selectedVideoDevice.value && switchVideoDevice(selectedVideoDevice.value)
      return true
    }
    return false
  }

  // 开始桌面共享
  const startScreenShare = async () => {
    try {
      if (!navigator?.mediaDevices?.getDisplayMedia) {
        window.$message.warning('当前设备不支持桌面共享功能！')
        return
      }
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true // 如果需要共享音频
      })
      if (!screenStream) {
        return
      }

      // 停止当前的本地流
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop())
      }

      // 替换本地流为桌面共享流
      localStream.value = screenStream
      // 添加新的视频轨道到连接
      screenStream.getTracks().forEach((track) => {
        if (localStream.value) {
          peerConnection.value?.addTrack(track, localStream.value)
        }
      })
      // 远程替换为桌面共享流
      const newVideoTrack = screenStream.getVideoTracks()[0]
      const oldVideoTrack = localStream.value.getVideoTracks()[0]
      if (!newVideoTrack) {
        window.$message.error('桌面共享失败，请检查权限设置!')
        return
      }
      newVideoTrack.onended = () => {
        window.$message.warning('屏幕共享已结束 ~')
        stopScreenShare()
      }
      peerConnection.value?.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.replaceTrack(newVideoTrack)
        }
      })
      oldVideoTrack && localStream.value.removeTrack(oldVideoTrack)
      localStream.value.addTrack(newVideoTrack)
      isScreenSharing.value = true // 开始桌面共享
    } catch (error: any) {
      console.error('开始桌面共享失败:', error)
      isScreenSharing.value = false
      stopScreenShare()
      if (error?.name === 'NotAllowedError') {
        window.$message.warning('已取消屏幕共享...')
        return
      }
      window.$message.error('桌面共享失败，请检查权限设置!')
    }
  }

  const lisendCandidate = async () => {
    if (!peerConnection.value) {
      return
    }

    info('第一次交换 ICE candidates...')
    if (pendingCandidates.value.length > 0) {
      pendingCandidates.value.forEach(async (candidate) => {
        await sendIceCandidate(candidate)
      })
    }

    pendingCandidates.value = []

    peerConnection.value.onicecandidate = async (event) => {
      if (event.candidate) {
        info('第二次交换 ICE candidates...')
        await sendIceCandidate(event.candidate)
      }
    }
  }

  // 处理接收到的信令消息
  const handleSignalMessage = async (data: WSRtcCallMsg) => {
    try {
      info('处理信令消息')
      const signal = JSON.parse(data.signal)

      switch (data.signalType) {
        case SignalTypeEnum.OFFER:
          await handleOffer(signal, true, roomId)
          await lisendCandidate()
          break

        case SignalTypeEnum.ANSWER:
          await handleAnswer(signal, roomId)
          // offer 发送 candidate
          await lisendCandidate()
          break

        case SignalTypeEnum.CANDIDATE:
          if (signal.candidate) {
            info('收到 candidate 信令')
            await handleCandidate(signal)
          }
          break

        default:
          console.log('未知信令类型:', data.signalType)
      }
    } catch (error) {
      console.error('处理信令消息错误:', error)
    }
  }

  // 监听 WebRTC 信令消息
  // useMitt.on(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalMessage)
  listen('ws-webrtc-signal', (event: any) => {
    info(`收到信令消息: ${JSON.stringify(event.payload)}`)
    handleSignalMessage(event.payload)
  })
  listen('ws-call-accepted', (event: any) => {
    info(`通话被接受: ${JSON.stringify(event.payload)}`)
    // // 接受方，发送是否接受
    // info(`收到 CallAccepted'消息 ${isReceiver}`)
    if (!isReceiver) {
      sendOffer(offer.value!)
    }
  })
  listen('ws-room-closed', (event: any) => {
    info(`房间已关闭: ${JSON.stringify(event.payload)}`)
    endCall()
  })
  listen('ws-dropped', (_: any) => {
    endCall()
  })
  listen('ws-call-rejected', (event: any) => {
    info(`通话被拒绝: ${JSON.stringify(event.payload)}`)
    endCall()
  })
  listen('ws-cancel', (event: any) => {
    info(`已取消通话: ${JSON.stringify(event.payload)}`)
    endCall()
  })
  listen('ws-timeout', (event: any) => {
    info(`已取消通话: ${JSON.stringify(event.payload)}`)
    endCall()
  })
  // useMitt.on(WsResponseMessageType.RoomClosed, () => endCall())
  // useMitt.on(WsResponseMessageType.DROPPED, () => endCall())
  // useMitt.on(WsResponseMessageType.TIMEOUT, () => endCall())
  // useMitt.on(WsResponseMessageType.CallRejected, () => endCall())
  // useMitt.on(WsResponseMessageType.CANCEL, () => endCall())

  onMounted(async () => {
    if (!isReceiver) {
      console.log(`调用方发送${callType === CallTypeEnum.VIDEO ? '视频' : '语音'}通话请求`)
      await startCall(roomId, callType, [remoteUserId])
      try {
        await rustWebSocketClient.sendMessage({
          type: WsRequestMsgType.VIDEO_CALL_REQUEST,
          data: {
            targetUid: remoteUserId,
            roomId: roomId,
            isVideo: callType === CallTypeEnum.VIDEO
          }
        })
      } catch (error) {
        console.error('发送通话请求失败:', error)
      }
    }
  })

  onUnmounted(() => {
    // 移除 WebRTC 信令消息监听器
    useMitt.off(WsResponseMessageType.WEBRTC_SIGNAL, handleSignalMessage)
    // 移除 CallAccepted 监听器
    useMitt.off(WsResponseMessageType.CallAccepted, createPeerConnection)
  })

  return {
    startCallTimer,
    stopScreenShare,
    startScreenShare,
    toggleVideo,
    switchVideoDevice,
    switchAudioDevice,
    isScreenSharing,
    selectedVideoDevice,
    selectedAudioDevice,
    localStream,
    remoteStream,
    peerConnection,
    getLocalStream,
    startCall,
    handleCallResponse,
    callDuration,
    connectionStatus,
    toggleMute,
    sendRtcCall2VideoCallResponse,
    isVideoEnabled,
    stopBell,
    startBell,
    pauseBell,
    playBell
  }
}
