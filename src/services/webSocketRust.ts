import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { info } from '@tauri-apps/plugin-log'
import { WorkerMsgEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import { getEnhancedFingerprint } from '@/services/fingerprint'
import { WsResponseMessageType } from '@/services/wsType'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

/// WebSocket 连接状态
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/// 连接健康状态
export interface ConnectionHealth {
  isHealthy: boolean
  lastPongTime?: number
  consecutiveFailures: number
  roundTripTime?: number
}

/// WebSocket 事件
export interface WebSocketEvent {
  type: 'ConnectionStateChanged' | 'MessageReceived' | 'HeartbeatStatusChanged' | 'Error'
  state?: ConnectionState
  isReconnection?: boolean
  message?: any
  health?: ConnectionHealth
  details?: Record<string, any>
}

/// API 响应结构
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

/**
 * Rust WebSocket 客户端封装
 * 提供与原始 WebSocket Worker 兼容的接口
 */
class RustWebSocketClient {
  private eventListener: UnlistenFn | null = null
  private isInitialized = false

  constructor() {
    info('[RustWS] Rust WebSocket 客户端初始化')
    this.setupEventListener()
  }

  /**
   * 初始化 WebSocket 连接
   */
  async initConnect(): Promise<void> {
    try {
      const token = localStorage.getItem('TOKEN')
      const clientId = await getEnhancedFingerprint()
      const savedProxy = localStorage.getItem('proxySettings')

      let serverUrl = import.meta.env.VITE_WEBSOCKET_URL

      // 处理代理设置
      if (savedProxy) {
        const settings = JSON.parse(savedProxy)
        const suffix = settings.wsIp + ':' + settings.wsPort + '/websocket/' + settings.wsSuffix
        if (settings.wsType === 'ws' || settings.wsType === 'wss') {
          serverUrl = settings.wsType + '://' + suffix
        }
      }

      const params = {
        serverUrl,
        token,
        clientId: clientId || ''
      }

      info(`[RustWS] 初始化连接参数: ${JSON.stringify(params)}`)

      const response = await invoke<ApiResponse>('ws_init_connection', { params })

      if (!response.success) {
        throw new Error(response.message || '连接初始化失败')
      }

      this.isInitialized = true
      info('[RustWS] WebSocket 连接初始化成功')
    } catch (error) {
      console.error('[RustWS] 连接初始化失败:', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      await invoke<ApiResponse>('ws_disconnect')
      this.isInitialized = false
      info('[RustWS] WebSocket 连接已断开')
    } catch (error) {
      console.error('[RustWS] 断开连接失败:', error)
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(data: any): Promise<void> {
    try {
      const response = await invoke<ApiResponse>('ws_send_message', {
        params: { data }
      })

      if (!response.success) {
        throw new Error(response.message || '消息发送失败')
      }
    } catch (error) {
      console.error('[RustWS] 发送消息失败:', error)
      throw error
    }
  }

  /**
   * 获取连接状态
   */
  async getState(): Promise<ConnectionState> {
    try {
      const response = await invoke<ApiResponse<ConnectionState>>('ws_get_state')
      return response.data || ConnectionState.DISCONNECTED
    } catch (error) {
      console.error('[RustWS] 获取连接状态失败:', error)
      return ConnectionState.ERROR
    }
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<ConnectionHealth | null> {
    try {
      const response = await invoke<ApiResponse<ConnectionHealth>>('ws_get_health')
      return response.data || null
    } catch (error) {
      console.error('[RustWS] 获取健康状态失败:', error)
      return null
    }
  }

  /**
   * 强制重连
   */
  async forceReconnect(): Promise<void> {
    try {
      const response = await invoke<ApiResponse>('ws_force_reconnect')

      if (!response.success) {
        throw new Error(response.message || '重连失败')
      }

      info('[RustWS] 强制重连成功')
    } catch (error) {
      console.error('[RustWS] 强制重连失败:', error)
      throw error
    }
  }

  /**
   * 检查是否已连接
   */
  async isConnected(): Promise<boolean> {
    try {
      const response = await invoke<ApiResponse<boolean>>('ws_is_connected')
      return response.data || false
    } catch (error) {
      console.error('[RustWS] 检查连接状态失败:', error)
      return false
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: {
    heartbeatInterval?: number
    heartbeatTimeout?: number
    maxReconnectAttempts?: number
    reconnectDelayMs?: number
  }): Promise<void> {
    try {
      const response = await invoke<ApiResponse>('ws_update_config', {
        params: config
      })

      if (!response.success) {
        throw new Error(response.message || '配置更新失败')
      }

      info('[RustWS] 配置更新成功')
    } catch (error) {
      console.error('[RustWS] 配置更新失败:', error)
      throw error
    }
  }

  /**
   * 设置事件监听器
   */
  private async setupEventListener(): Promise<void> {
    try {
      // 清理旧的监听器
      if (this.eventListener) {
        this.eventListener()
      }

      // 监听 WebSocket 事件
      this.eventListener = await listen<WebSocketEvent>('websocket-event', (event) => {
        this.handleWebSocketEvent(event.payload)
      })

      // 设置业务消息监听器
      await this.setupBusinessMessageListeners()

      info('[RustWS] 事件监听器设置完成')
    } catch (error) {
      console.error('[RustWS] 设置事件监听器失败:', error)
    }
  }

  /**
   * 处理 WebSocket 事件
   */
  private handleWebSocketEvent(event: WebSocketEvent): void {
    switch (event.type) {
      case 'ConnectionStateChanged':
        this.handleConnectionStateChange(event.state!, event.isReconnection!)
        break

      case 'MessageReceived':
        this.handleMessageReceived(event.message!)
        break

      case 'HeartbeatStatusChanged':
        this.handleHeartbeatStatusChange(event.health!)
        break

      case 'Error':
        this.handleError(event.message!, event.details)
        break
    }
  }

  /**
   * 处理连接状态变化
   */
  private handleConnectionStateChange(state: ConnectionState, isReconnection: boolean): void {
    info(`[RustWS] 连接状态变化: ${state}, 是否重连: ${isReconnection}`)

    // 发送兼容的事件给原有的处理逻辑
    switch (state) {
      case ConnectionState.CONNECTED:
        useMitt.emit(WorkerMsgEnum.OPEN)

        if (isReconnection) {
          // 重连成功，刷新数据
          useMitt.emit('connectionStateChange', {
            state: 'CONNECTED',
            isReconnection: true
          })
        }
        break

      case ConnectionState.DISCONNECTED:
      case ConnectionState.ERROR:
        useMitt.emit(WorkerMsgEnum.CLOSE)
        break

      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        // 连接中状态，暂不处理
        break
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessageReceived(message: any): void {
    // 转发消息给现有的处理逻辑
    useMitt.emit(WorkerMsgEnum.MESSAGE, message)
  }

  /**
   * 设置业务消息监听器
   * 监听 Rust 端发送的具体业务消息事件
   */
  private async setupBusinessMessageListeners(): Promise<void> {
    // 登录相关事件
    await listen('ws-login-qr-code', (event: any) => {
      console.log('获取二维码')
      useMitt.emit(WsResponseMessageType.LOGIN_QR_CODE, event.payload)
    })

    await listen('ws-waiting-authorize', () => {
      console.log('等待授权')
      useMitt.emit(WsResponseMessageType.WAITING_AUTHORIZE)
    })

    await listen('ws-login-success', (event: any) => {
      console.log('登录成功')
      useMitt.emit(WsResponseMessageType.LOGIN_SUCCESS, event.payload)
    })

    // 消息相关事件
    await listen('ws-receive-message', (event: any) => {
      console.log(`[ws]收到消息: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.RECEIVE_MESSAGE, event.payload)
    })

    await listen('ws-msg-recall', (event: any) => {
      console.log('撤回')
      useMitt.emit(WsResponseMessageType.MSG_RECALL, event.payload)
    })

    await listen('ws-msg-mark-item', (event: any) => {
      useMitt.emit(WsResponseMessageType.MSG_MARK_ITEM, event.payload)
    })

    // 用户状态相关事件
    await listen('ws-online', (event: any) => {
      console.log('上线', event.payload)
      useMitt.emit(WsResponseMessageType.ONLINE, event.payload)
    })

    await listen('ws-offline', () => {
      console.log('下线')
      useMitt.emit(WsResponseMessageType.OFFLINE)
    })

    await listen('ws-user-state-change', (event: any) => {
      console.log('用户状态改变', event.payload)
      useMitt.emit(WsResponseMessageType.USER_STATE_CHANGE, event.payload)
    })

    // 好友相关事件
    await listen('ws-request-new-friend', (event: any) => {
      console.log('好友申请')
      useMitt.emit(WsResponseMessageType.REQUEST_NEW_FRIEND, event.payload)
    })

    await listen('ws-request-approval-friend', (event: any) => {
      console.log('同意好友申请', event.payload)
      useMitt.emit(WsResponseMessageType.REQUEST_APPROVAL_FRIEND, event.payload)
    })

    await listen('ws-new-friend-session', (event: any) => {
      console.log('成员变动')
      useMitt.emit(WsResponseMessageType.NEW_FRIEND_SESSION, event.payload)
    })

    // 房间/群聊相关事件
    await listen('ws-room-info-change', (event: any) => {
      console.log('群主修改群聊信息', event.payload)
      useMitt.emit(WsResponseMessageType.ROOM_INFO_CHANGE, event.payload)
    })

    await listen('ws-my-room-info-change', (event: any) => {
      console.log('自己修改我在群里的信息', event.payload)
      useMitt.emit(WsResponseMessageType.MY_ROOM_INFO_CHANGE, event.payload)
    })

    await listen('ws-room-group-notice-msg', (event: any) => {
      console.log('发布群公告', event.payload)
      useMitt.emit(WsResponseMessageType.ROOM_GROUP_NOTICE_MSG, event.payload)
    })

    await listen('ws-room-edit-group-notice-msg', (event: any) => {
      console.log('编辑群公告', event.payload)
      useMitt.emit(WsResponseMessageType.ROOM_EDIT_GROUP_NOTICE_MSG, event.payload)
    })

    await listen('ws-room-dissolution', (event: any) => {
      console.log('群解散', event.payload)
      useMitt.emit(WsResponseMessageType.ROOM_DISSOLUTION, event.payload)
    })

    // 视频通话相关事件
    await listen('ws-video-call-request', (event: any) => {
      console.log('收到通话请求', event.payload)
      useMitt.emit(WsResponseMessageType.VideoCallRequest, event.payload)
    })

    await listen('ws-call-accepted', (event: any) => {
      console.log('通话被接受', event.payload)
      useMitt.emit(WsResponseMessageType.CallAccepted, event.payload)
    })

    await listen('ws-call-rejected', (event: any) => {
      console.log('通话被拒绝', event.payload)
      useMitt.emit(WsResponseMessageType.CallRejected, event.payload)
    })

    await listen('ws-room-closed', (event: any) => {
      console.log('房间已关闭', event.payload)
      useMitt.emit(WsResponseMessageType.RoomClosed, event.payload)
    })

    await listen('ws-webrtc-signal', (event: any) => {
      console.log('收到信令消息', event.payload)
      useMitt.emit(WsResponseMessageType.WEBRTC_SIGNAL, event.payload)
    })

    await listen('ws-join-video', (event: any) => {
      console.log('用户加入房间', event.payload)
      useMitt.emit(WsResponseMessageType.JoinVideo, event.payload)
    })

    await listen('ws-leave-video', (event: any) => {
      console.log('用户离开房间', event.payload)
      useMitt.emit(WsResponseMessageType.LeaveVideo, event.payload)
    })

    await listen('ws-dropped', (event: any) => {
      useMitt.emit(WsResponseMessageType.DROPPED, event.payload)
    })

    // 系统相关事件
    await listen('ws-token-expired', (event: any) => {
      console.log('账号在其他设备登录')
      useMitt.emit(WsResponseMessageType.TOKEN_EXPIRED, event.payload)
    })

    await listen('ws-invalid-user', (event: any) => {
      console.log('无效用户')
      useMitt.emit(WsResponseMessageType.INVALID_USER, event.payload)
    })

    // 未知消息类型
    await listen('ws-unknown-message', (event: any) => {
      console.log('接收到未处理类型的消息:', event.payload)
    })
  }

  /**
   * 处理心跳状态变化
   */
  private handleHeartbeatStatusChange(health: ConnectionHealth): void {
    // 发送心跳健康状态事件
    useMitt.emit('pongReceived', {
      timestamp: health.lastPongTime,
      roundTripTime: health.roundTripTime,
      consecutiveFailures: health.consecutiveFailures
    })

    useMitt.emit('wsConnectionHealthChange', {
      isHealthy: health.isHealthy,
      lastPongTime: health.lastPongTime,
      timeSinceLastPong: health.lastPongTime ? Date.now() - health.lastPongTime : null
    })
  }

  /**
   * 处理错误
   */
  private handleError(message: string, details?: Record<string, any>): void {
    console.error('[RustWS] WebSocket 错误:', message, details)

    useMitt.emit(WorkerMsgEnum.WS_ERROR, {
      msg: message,
      details
    })
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.eventListener) {
      this.eventListener()
      this.eventListener = null
    }

    if (this.isInitialized) {
      this.disconnect()
    }

    info('[RustWS] WebSocket 客户端已销毁')
  }
}

// 创建全局实例
const rustWebSocketClient = new RustWebSocketClient()

if (getCurrentWebviewWindow().label === 'home' || getCurrentWebviewWindow().label === 'rtcCall') {
  rustWebSocketClient.initConnect()
}

export default rustWebSocketClient
