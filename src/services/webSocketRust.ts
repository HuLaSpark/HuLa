import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { error, info, warn } from '@tauri-apps/plugin-log'
import { useMitt } from '@/hooks/useMitt'
import { getEnhancedFingerprint } from '@/services/fingerprint'
import { WsResponseMessageType } from '@/services/wsType'

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
/**
 * 监听器管理器，类似 AbortController
 */
class ListenerController {
  private listeners: Set<UnlistenFn> = new Set()
  private isAborted = false

  add(unlisten: UnlistenFn): void {
    if (this.isAborted) {
      // 如果已经中止，立即清理新添加的监听器
      unlisten()
      return
    }
    this.listeners.add(unlisten)
  }

  async abort(): Promise<void> {
    if (this.isAborted) return

    this.isAborted = true
    const cleanupPromises: Promise<void>[] = []

    // 并行执行所有清理操作
    for (const unlisten of this.listeners) {
      cleanupPromises.push(
        Promise.resolve()
          .then(() => unlisten())
          .catch((err) => {
            error(`[ListenerController] 清理监听器失败: ${err}`)
          })
      )
    }

    // 等待所有清理完成（设置超时防止阻塞）
    try {
      await Promise.race([
        Promise.all(cleanupPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('清理超时')), 5000))
      ])
    } catch (err) {
      warn(`[ListenerController] 部分监听器清理可能未完成: ${err}`)
    }

    this.listeners.clear()
    info(`[ListenerController] 已清理所有监听器`)
  }

  get size(): number {
    return this.listeners.size
  }

  get aborted(): boolean {
    return this.isAborted
  }
}

class RustWebSocketClient {
  private listenerController: ListenerController = new ListenerController()

  constructor() {
    info('[RustWS] Rust WebSocket 客户端初始化')
  }

  /**
   * 初始化 WebSocket 连接
   */
  async initConnect(): Promise<void> {
    try {
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
        clientId: clientId || ''
      }

      info(`[RustWS] 初始化连接参数: ${JSON.stringify(params)}`)

      await invoke('ws_init_connection', { params })

      // await this.setupEventListener()

      // this.isInitialized = true
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
  // private async setupEventListener(): Promise<void> {
  //   try {
  //     info(`[RustWS] 开始设置事件监听器，当前业务监听器数量: ${this.listenerController.size}`)

  //     // 清理旧的监听器
  //     if (this.eventListener) {
  //       this.eventListener()
  //       info('[RustWS] 已清理主事件监听器')
  //     }

  //     // 高效清理所有业务监听器（并行 + 超时）
  //     const oldListenerCount = this.listenerController.size
  //     await this.listenerController.abort()
  //     this.listenerController = new ListenerController()
  //     info(`[RustWS] 已高效清理 ${oldListenerCount} 个业务监听器`)

  //     // 监听 WebSocket 事件
  //     this.eventListener = await listen<WebSocketEvent>('websocket-event', (event) => {
  //       this.handleWebSocketEvent(event.payload)
  //     })

  //     // 设置业务消息监听器
  //     await this.setupBusinessMessageListeners()

  //     info(`[RustWS] 事件监听器设置完成，新的业务监听器数量: ${this.listenerController.size}`)
  //   } catch (err) {
  //     error(`[RustWS] 设置事件监听器失败: ${err}`)
  //   }
  // }

  /**
   * 设置业务消息监听器
   * 监听 Rust 端发送的具体业务消息事件
   */
  public async setupBusinessMessageListeners(): Promise<void> {
    // 登录相关事件
    this.listenerController.add(
      await listen('ws-login-qr-code', (event: any) => {
        info('获取二维码')
        useMitt.emit(WsResponseMessageType.LOGIN_QR_CODE, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-waiting-authorize', () => {
        info('等待授权')
        useMitt.emit(WsResponseMessageType.WAITING_AUTHORIZE)
      })
    )

    this.listenerController.add(
      await listen('ws-login-success', (event: any) => {
        info('登录成功')
        useMitt.emit(WsResponseMessageType.LOGIN_SUCCESS, event.payload)
      })
    )

    // 消息相关事件
    const listenerIndex = this.listenerController.size
    this.listenerController.add(
      await listen('ws-receive-message', (event: any) => {
        info(`[ws]收到消息[监听器${listenerIndex}]: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.RECEIVE_MESSAGE, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-msg-recall', (event: any) => {
        info('撤回')
        useMitt.emit(WsResponseMessageType.MSG_RECALL, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-msg-mark-item', (event: any) => {
        info(`消息标记: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.MSG_MARK_ITEM, event.payload)
      })
    )

    // 用户状态相关事件
    this.listenerController.add(
      await listen('ws-online', (event: any) => {
        info(`上线: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.ONLINE, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-offline', () => {
        info('下线')
        useMitt.emit(WsResponseMessageType.OFFLINE)
      })
    )

    this.listenerController.add(
      await listen('ws-user-state-change', (event: any) => {
        info(`用户状态改变: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.USER_STATE_CHANGE, event.payload)
      })
    )

    // 好友相关事件
    this.listenerController.add(
      await listen('ws-request-new-apply', (event: any) => {
        info('好友申请')
        useMitt.emit(WsResponseMessageType.REQUEST_NEW_FRIEND, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-request-approval-friend', (event: any) => {
        info(`同意好友申请: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.REQUEST_APPROVAL_FRIEND, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-new-friend-session', (event: any) => {
        info('成员变动')
        useMitt.emit(WsResponseMessageType.NEW_FRIEND_SESSION, event.payload)
      })
    )

    // 房间/群聊相关事件
    this.listenerController.add(
      await listen('ws-room-info-change', (event: any) => {
        info(`群主修改群聊信息: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.ROOM_INFO_CHANGE, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-my-room-info-change', (event: any) => {
        info(`自己修改我在群里的信息: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.MY_ROOM_INFO_CHANGE, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-room-group-notice-msg', (event: any) => {
        info(`发布群公告: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.ROOM_GROUP_NOTICE_MSG, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-room-edit-group-notice-msg', (event: any) => {
        info(`编辑群公告: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.ROOM_EDIT_GROUP_NOTICE_MSG, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-room-dissolution', (event: any) => {
        info(`群解散: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.ROOM_DISSOLUTION, event.payload)
      })
    )

    // 视频通话相关事件
    this.listenerController.add(
      await listen('ws-video-call-request', (event: any) => {
        info(`收到通话请求: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.VideoCallRequest, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-call-accepted', (event: any) => {
        info(`通话被接受: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.CallAccepted, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-call-rejected', (event: any) => {
        info(`通话被拒绝: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.CallRejected, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-room-closed', (event: any) => {
        info(`房间已关闭: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.RoomClosed, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-webrtc-signal', (event: any) => {
        info(`收到信令消息: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.WEBRTC_SIGNAL, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-join-video', (event: any) => {
        info(`用户加入房间: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.JoinVideo, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-leave-video', (event: any) => {
        info(`用户离开房间: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.LeaveVideo, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-dropped', (event: any) => {
        useMitt.emit(WsResponseMessageType.DROPPED, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-cancel', (event: any) => {
        info(`已取消通话: ${JSON.stringify(event.payload)}`)
        useMitt.emit(WsResponseMessageType.CANCEL, event.payload)
      })
    )

    // 系统相关事件
    this.listenerController.add(
      await listen('ws-token-expired', (event: any) => {
        info('账号在其他设备登录')
        useMitt.emit(WsResponseMessageType.TOKEN_EXPIRED, event.payload)
      })
    )

    this.listenerController.add(
      await listen('ws-invalid-user', (event: any) => {
        info('无效用户')
        useMitt.emit(WsResponseMessageType.INVALID_USER, event.payload)
      })
    )

    // 未知消息类型
    this.listenerController.add(
      await listen('ws-unknown-message', (event: any) => {
        info(`接收到未处理类型的消息: ${JSON.stringify(event.payload)}`)
      })
    )
  }
}
info('创建RustWebSocketClient')
// 创建全局实例
const rustWebSocketClient = new RustWebSocketClient()

// 使用 Tauri 原生事件监听窗口焦点变化（跨平台兼容）
// 防止重复设置窗口焦点监听器
// let isWindowListenerInitialized = false

// if (!isWindowListenerInitialized) {
//   isWindowListenerInitialized = true
//   ;(async () => {
//     try {
//       const currentWindow = getCurrentWebviewWindow()

//       // 监听窗口获得焦点事件
//       await currentWindow.listen('tauri://focus', () => {
//         info('[RustWS] 窗口获得焦点，设置应用状态为前台')
//         rustWebSocketClient.setAppBackgroundState(false)
//       })

//       // 监听窗口失去焦点事件
//       await currentWindow.listen('tauri://blur', () => {
//         info('[RustWS] 窗口失去焦点，设置应用状态为后台')
//         rustWebSocketClient.setAppBackgroundState(true)
//       })

//       info('[RustWS] 窗口焦点事件监听器已设置')
//     } catch (err) {
//       error(`[RustWS] 设置窗口焦点监听器失败: ${err}`)
//     }
//   })()
// }

export default rustWebSocketClient
