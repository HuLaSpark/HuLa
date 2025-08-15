import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { error, info, warn } from '@tauri-apps/plugin-log'
import { WorkerMsgEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import { getEnhancedFingerprint } from '@/services/fingerprint'
import { WsResponseMessageType } from '@/services/wsType'
import { useContactStore } from '@/stores/contacts'

const contactStore = useContactStore()

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

      await invoke('ws_init_connection', { params })

      this.isInitialized = true
      info('[RustWS] WebSocket 连接初始化成功')
    } catch (err) {
      error(`[RustWS] 连接初始化失败: ${err}`)
      throw err
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      await invoke('ws_disconnect')
      this.isInitialized = false
      info('[RustWS] WebSocket 连接已断开')
    } catch (err) {
      error(`[RustWS] 断开连接失败: ${err}`)
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(data: any): Promise<void> {
    try {
      await invoke('ws_send_message', {
        params: { data }
      })
    } catch (err: any) {
      error(`[RustWS] 发送消息失败: ${err}`)
      throw err
    }
  }

  /**
   * 获取连接状态
   */
  async getState(): Promise<ConnectionState> {
    try {
      const state = await invoke<ConnectionState>('ws_get_state')
      return state
    } catch (err) {
      error(`[RustWS] 获取连接状态失败: ${err}`)
      return ConnectionState.ERROR
    }
  }

  /**
   * 强制重连
   */
  async forceReconnect(): Promise<void> {
    try {
      await invoke('ws_force_reconnect')
      info('[RustWS] 强制重连成功')
    } catch (err) {
      error(`[RustWS] 强制重连失败: ${err}`)
      throw err
    }
  }

  /**
   * 检查是否已连接
   */
  async isConnected(): Promise<boolean> {
    try {
      const connected = await invoke<boolean>('ws_is_connected')
      return connected
    } catch (err) {
      error(`[RustWS] 检查连接状态失败: ${err}`)
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
      await invoke('ws_update_config', {
        params: config
      })
      info('[RustWS] 配置更新成功')
    } catch (err) {
      error(`[RustWS] 配置更新失败: ${err}`)
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
    } catch (err) {
      error(`[RustWS] 设置事件监听器失败: ${err}`)
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
    // 连接状态相关事件
    await listen('ws-connection-lost', (event: any) => {
      warn(`[RustWS] 收到连接丢失事件: ${JSON.stringify(event.payload)}`)
      this.handleConnectionLost(event.payload)
    })

    // 登录相关事件
    await listen('ws-login-qr-code', (event: any) => {
      info('获取二维码')
      useMitt.emit(WsResponseMessageType.LOGIN_QR_CODE, event.payload)
    })

    await listen('ws-waiting-authorize', () => {
      info('等待授权')
      useMitt.emit(WsResponseMessageType.WAITING_AUTHORIZE)
    })

    await listen('ws-login-success', (event: any) => {
      info('登录成功')
      useMitt.emit(WsResponseMessageType.LOGIN_SUCCESS, event.payload)
    })

    // 消息相关事件
    await listen('ws-receive-message', (event: any) => {
      info(`[ws]收到消息: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.RECEIVE_MESSAGE, event.payload)
    })

    // 消息相关事件
    await listen('ws-join-group', async (event: any) => {
      info(`[ws]收到消息: ${JSON.stringify(event.payload)}`)
      //  更新群聊列表
      await contactStore.getGroupChatList()
    })

    await listen('ws-msg-recall', (event: any) => {
      info('撤回')
      useMitt.emit(WsResponseMessageType.MSG_RECALL, event.payload)
    })

    await listen('ws-msg-mark-item', (event: any) => {
      info(`消息标记: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.MSG_MARK_ITEM, event.payload)
    })

    // 用户状态相关事件
    await listen('ws-online', (event: any) => {
      info(`上线: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.ONLINE, event.payload)
    })

    await listen('ws-offline', () => {
      info('下线')
      useMitt.emit(WsResponseMessageType.OFFLINE)
    })

    await listen('ws-user-state-change', (event: any) => {
      info(`用户状态改变: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.USER_STATE_CHANGE, event.payload)
    })

    // 好友相关事件
    await listen('ws-request-new-friend', (event: any) => {
      info('好友申请')
      useMitt.emit(WsResponseMessageType.REQUEST_NEW_FRIEND, event.payload)
    })

    await listen('ws-request-approval-friend', (event: any) => {
      info(`同意好友申请: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.REQUEST_APPROVAL_FRIEND, event.payload)
    })

    await listen('ws-new-friend-session', (event: any) => {
      info('成员变动')
      useMitt.emit(WsResponseMessageType.NEW_FRIEND_SESSION, event.payload)
    })

    // 房间/群聊相关事件
    await listen('ws-room-info-change', (event: any) => {
      info(`群主修改群聊信息: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.ROOM_INFO_CHANGE, event.payload)
    })

    await listen('ws-my-room-info-change', (event: any) => {
      info(`自己修改我在群里的信息: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.MY_ROOM_INFO_CHANGE, event.payload)
    })

    await listen('ws-room-group-notice-msg', (event: any) => {
      info(`发布群公告: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.ROOM_GROUP_NOTICE_MSG, event.payload)
    })

    await listen('ws-room-edit-group-notice-msg', (event: any) => {
      info(`编辑群公告: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.ROOM_EDIT_GROUP_NOTICE_MSG, event.payload)
    })

    await listen('ws-room-dissolution', (event: any) => {
      info(`群解散: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.ROOM_DISSOLUTION, event.payload)
    })

    // 视频通话相关事件
    await listen('ws-video-call-request', (event: any) => {
      info(`收到通话请求: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.VideoCallRequest, event.payload)
    })

    await listen('ws-call-accepted', (event: any) => {
      info(`通话被接受: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.CallAccepted, event.payload)
    })

    await listen('ws-call-rejected', (event: any) => {
      info(`通话被拒绝: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.CallRejected, event.payload)
    })

    await listen('ws-room-closed', (event: any) => {
      info(`房间已关闭: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.RoomClosed, event.payload)
    })

    await listen('ws-webrtc-signal', (event: any) => {
      info(`收到信令消息: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.WEBRTC_SIGNAL, event.payload)
    })

    await listen('ws-join-video', (event: any) => {
      info(`用户加入房间: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.JoinVideo, event.payload)
    })

    await listen('ws-leave-video', (event: any) => {
      info(`用户离开房间: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.LeaveVideo, event.payload)
    })

    await listen('ws-dropped', (event: any) => {
      useMitt.emit(WsResponseMessageType.DROPPED, event.payload)
    })

    await listen('ws-cancel', (event: any) => {
      info(`已取消通话: ${JSON.stringify(event.payload)}`)
      useMitt.emit(WsResponseMessageType.CANCEL, event.payload)
    })

    // 系统相关事件
    await listen('ws-token-expired', (event: any) => {
      info('账号在其他设备登录')
      useMitt.emit(WsResponseMessageType.TOKEN_EXPIRED, event.payload)
    })

    await listen('ws-invalid-user', (event: any) => {
      info('无效用户')
      useMitt.emit(WsResponseMessageType.INVALID_USER, event.payload)
    })

    // 未知消息类型
    await listen('ws-unknown-message', (event: any) => {
      info(`接收到未处理类型的消息: ${JSON.stringify(event.payload)}`)
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
    error(`[RustWS] WebSocket 错误: ${message}, 详情: ${JSON.stringify(details)}`)

    useMitt.emit(WorkerMsgEnum.WS_ERROR, {
      msg: message,
      details
    })
  }

  /**
   * 处理连接丢失事件
   */
  private async handleConnectionLost(payload: any): Promise<void> {
    const { reason, error, timestamp } = payload

    warn(`[RustWS] 连接丢失 - 原因: ${reason}, 错误: ${error}, 时间: ${new Date(timestamp).toLocaleString()}`)

    try {
      // 重新建立连接
      await this.initConnect()
    } catch (reconnectError) {
      error(`[RustWS] 连接丢失后重连失败: ${reconnectError}`)

      // 可以在这里添加用户通知，比如显示重连失败的提示
      // 或者发送一个全局事件让UI层处理
      useMitt.emit('ws-reconnect-failed', {
        originalReason: reason,
        originalError: error,
        reconnectError: reconnectError
      })
    }
  }

  /**
   * 智能初始化连接
   * 检查连接状态，只有在断开时才重新连接
   */
  async smartInitConnect(): Promise<void> {
    try {
      // 检查当前窗口是否为主窗口
      const currentWindow = getCurrentWebviewWindow()
      const windowLabel = currentWindow.label

      // 只在主窗口（home 或 rtcCall）中初始化 WebSocket
      if (windowLabel !== 'home' && windowLabel !== 'rtcCall') {
        info(`[RustWS] 当前窗口 [${windowLabel}] 不需要 WebSocket 连接`)
        return
      }

      info(`[RustWS] 当前窗口 [${windowLabel}] 需要 WebSocket 连接`)

      // 检查当前连接状态
      const isConnected = await this.isConnected()

      if (!isConnected) {
        info('[RustWS] WebSocket 未连接，开始初始化连接...')
        await this.initConnect()
      } else {
        info('[RustWS] WebSocket 已连接，跳过初始化')
      }
    } catch (err) {
      warn(`[RustWS] 检查连接状态失败，尝试智能重连: ${err}`)
      try {
        await this.initConnect()
      } catch (reconnectError) {
        error(`[RustWS] 智能重连失败: ${reconnectError}`)
        throw reconnectError
      }
    }
  }

  /**
   * 设置应用后台状态
   */
  async setAppBackgroundState(isBackground: boolean): Promise<void> {
    try {
      await invoke('ws_set_app_background_state', { isBackground })
      info(`[RustWS] 设置应用状态: ${isBackground ? '后台' : '前台'}`)
    } catch (err) {
      error(`[RustWS] 设置应用状态失败: ${err}`)
    }
  }

  /**
   * 获取应用后台状态
   */
  async getAppBackgroundState(): Promise<boolean> {
    try {
      const isBackground = await invoke<boolean>('ws_get_app_background_state')
      return isBackground
    } catch (err) {
      error(`[RustWS] 获取应用状态失败: ${err}`)
      return false
    }
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

// 延迟执行智能初始化，确保页面加载完成
setTimeout(() => {
  rustWebSocketClient.smartInitConnect()
}, 100)

// 使用 Tauri 原生事件监听窗口焦点变化（跨平台兼容）
;(async () => {
  try {
    const currentWindow = getCurrentWebviewWindow()

    // 监听窗口获得焦点事件
    await currentWindow.listen('tauri://focus', () => {
      info('[RustWS] 窗口获得焦点，设置应用状态为前台')
      rustWebSocketClient.setAppBackgroundState(false)
    })

    // 监听窗口失去焦点事件
    await currentWindow.listen('tauri://blur', () => {
      info('[RustWS] 窗口失去焦点，设置应用状态为后台')
      rustWebSocketClient.setAppBackgroundState(true)
    })

    info('[RustWS] 窗口焦点事件监听器已设置')
  } catch (err) {
    error(`[RustWS] 设置窗口焦点监听器失败: ${err}`)
  }
})()

export default rustWebSocketClient
