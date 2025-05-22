import { WsResponseMessageType, WsTokenExpire } from '@/services/wsType.ts'
import type {
  LoginSuccessResType,
  LoginInitResType,
  WsReqMsgContentType,
  OnStatusChangeType,
  UserStateType
} from '@/services/wsType.ts'
import type { MessageType, MarkItemType, RevokedMsgType } from '@/services/types'
import { OnlineEnum, ChangeTypeEnum, WorkerMsgEnum, ConnectionState } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useUserStore } from '@/stores/user'
import { getEnhancedFingerprint } from '@/services/fingerprint.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useTauriListener } from '@/hooks/useTauriListener'
import { listen, emit } from '@tauri-apps/api/event'
import { useDebounceFn } from '@vueuse/core'

// 创建 webSocket worker
const worker: Worker = new Worker(new URL('../workers/webSocket.worker.ts', import.meta.url), {
  type: 'module'
})

// 创建 timer worker
const timerWorker: Worker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url), {
  type: 'module'
})

// 添加一个标识是否是主窗口的变量
let isMainWindow = false

class WS {
  // 添加消息队列大小限制
  readonly #MAX_QUEUE_SIZE = 100
  #tasks: WsReqMsgContentType[] = []
  // 重连🔐
  #connectReady = false
  // 使用LRU缓存替代简单的Set
  #processedMsgCache = new Map<number, number>()

  #tauriListener: ReturnType<typeof useTauriListener> | null = null

  // 存储前一个连接状态，用于检测重连成功
  #previousConnectionState = ConnectionState.DISCONNECTED

  // 存储连接健康状态信息
  #connectionHealth = {
    isHealthy: true,
    lastPongTime: null as number | null,
    timeSinceLastPong: null as number | null
  }

  constructor() {
    this.initWindowType()
    if (isMainWindow) {
      this.initConnect()
      // 收到WebSocket worker消息
      worker.addEventListener('message', this.onWorkerMsg)
      // 收到Timer worker消息
      timerWorker.addEventListener('message', this.onTimerWorkerMsg)
      // 添加页面可见性监听
      this.initVisibilityListener()
    }
  }

  // 初始化页面可见性监听
  private async initVisibilityListener() {
    const handleVisibilityChange = (isVisible: boolean) => {
      worker.postMessage(
        JSON.stringify({
          type: 'visibilityChange',
          value: { isHidden: !isVisible }
        })
      )
    }

    const debouncedVisibilityChange = useDebounceFn((isVisible: boolean) => {
      handleVisibilityChange(isVisible)
    }, 300)

    // 使用document.visibilitychange事件 兼容web
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden
      console.log(`document visibility change: ${document.hidden ? '隐藏' : '可见'}`)
      debouncedVisibilityChange(isVisible)
    })

    // 跟踪当前窗口状态，避免无变化时重复触发
    let currentVisibilityState = true

    // 创建状态变更处理器
    const createStateChangeHandler = (newState: boolean) => {
      return () => {
        if (currentVisibilityState !== newState) {
          currentVisibilityState = newState
          debouncedVisibilityChange(newState)
        }
      }
    }

    try {
      // 设置各种Tauri窗口事件监听器
      // 窗口失去焦点 - 隐藏状态
      await listen('tauri://blur', createStateChangeHandler(false))

      // 窗口获得焦点 - 可见状态
      await listen('tauri://focus', createStateChangeHandler(true))

      // 窗口最小化 - 隐藏状态
      await listen('tauri://window-minimized', createStateChangeHandler(false))

      // 窗口恢复 - 可见状态
      await listen('tauri://window-restored', createStateChangeHandler(true))

      // 窗口隐藏 - 隐藏状态
      await listen('tauri://window-hidden', createStateChangeHandler(false))

      // 窗口显示 - 可见状态
      await listen('tauri://window-shown', createStateChangeHandler(true))
    } catch (error) {
      console.error('无法设置Tauri Window事件监听:', error)
    }
  }

  // 处理Timer worker消息
  onTimerWorkerMsg = (e: MessageEvent<any>) => {
    const data = e.data
    switch (data.type) {
      case 'timeout': {
        // 检查是否是心跳超时消息
        if (data.msgId && data.msgId.startsWith('heartbeat_timeout_')) {
          // 转发给WebSocket worker
          worker.postMessage(JSON.stringify({ type: 'heartbeatTimeout' }))
        }
        // 处理任务队列定时器超时
        else if (data.msgId === 'process_tasks_timer') {
          const userStore = useUserStore()
          if (userStore.isSign) {
            // 处理堆积的任务
            for (const task of this.#tasks) {
              this.send(task)
            }
            // 清空缓存的消息
            this.#tasks = []
          }
        }
        break
      }
      case 'periodicHeartbeat': {
        // 心跳触发，转发给WebSocket worker
        worker.postMessage(JSON.stringify({ type: 'heartbeatTimerTick' }))
        break
      }
      case 'reconnectTimeout': {
        // timer上报重连超时事件，转发给WebSocket worker
        console.log('重试次数: ', data.reconnectCount)
        worker.postMessage(
          JSON.stringify({
            type: 'reconnectTimeout',
            value: { reconnectCount: data.reconnectCount }
          })
        )
        break
      }
    }
  }

  // 初始化窗口类型
  private async initWindowType() {
    const currentWindow = WebviewWindow.getCurrent()
    isMainWindow = currentWindow.label === 'home'

    if (!isMainWindow) {
      // 非主窗口监听来自主窗口的消息
      await this.initChildWindowListeners()
    }
  }

  // 为子窗口初始化监听器
  private async initChildWindowListeners() {
    this.#tauriListener = useTauriListener()

    // 监听主窗口发来的WebSocket消息
    this.#tauriListener.addListener(
      listen('ws-message', (event) => {
        this.onMessage(event.payload as string)
      })
    )

    // 监听连接状态变化
    this.#tauriListener.addListener(
      listen('ws-state-change', (event) => {
        const state = event.payload as ConnectionState
        useMitt.emit('wsConnectionStateChange', state)
      })
    )
  }

  initConnect = async () => {
    const token = localStorage.getItem('TOKEN')
    // 如果token 是 null, 而且 localStorage 的用户信息有值，需要清空用户信息
    if (token === null && localStorage.getItem('user')) {
      localStorage.removeItem('user')
    }
    const clientId = await getEnhancedFingerprint()
    const savedProxy = localStorage.getItem('proxySettings')
    let serverUrl = import.meta.env.VITE_WEBSOCKET_URL
    if (savedProxy) {
      const settings = JSON.parse(savedProxy)
      const suffix = settings.wsIp + ':' + settings.wsPort + '/' + settings.wsSuffix
      if (settings.wsType === 'ws' || settings.wsType === 'wss') {
        serverUrl = settings.wsType + '://' + suffix
      }
    }
    // 初始化 ws
    worker.postMessage(
      `{"type":"initWS","value":{"token":${token ? `"${token}"` : null},"clientId":${clientId ? `"${clientId}", "serverUrl":"${serverUrl}"` : null}}}`
    )
  }

  onWorkerMsg = async (e: MessageEvent<any>) => {
    const params: { type: string; value: unknown } = JSON.parse(e.data)
    switch (params.type) {
      case WorkerMsgEnum.MESSAGE: {
        await this.onMessage(params.value as string)
        // 广播消息给其他窗口
        if (isMainWindow) {
          await emit('ws-message', params.value)
        }
        break
      }
      case WorkerMsgEnum.OPEN: {
        this.#dealTasks()
        break
      }
      case WorkerMsgEnum.CLOSE:
      case WorkerMsgEnum.ERROR: {
        this.#onClose()
        break
      }
      case WorkerMsgEnum.WS_ERROR: {
        console.log('WebSocket错误:', (params.value as { msg: string }).msg)
        useMitt.emit(WsResponseMessageType.NO_INTERNET, params.value)
        // 如果是重连失败，可以提示用户刷新页面
        if ((params.value as { msg: string }).msg.includes('连接失败次数过多')) {
          useMitt.emit('showMainMessage', { title: '连接断开', content: '连接已断开，请刷新页面或重新登录。' })
          // 可以触发UI提示，让用户刷新页面
          useMitt.emit('wsReconnectFailed', params.value)
        }
        break
      }
      case 'startReconnectTimer': {
        console.log('worker上报心跳超时事件', params.value)
        // 向timer发送startReconnectTimer事件
        timerWorker.postMessage({
          type: 'startReconnectTimer',
          reconnectCount: (params.value as any).reconnectCount as number,
          value: { delay: 1000 }
        })
        break
      }
      // 心跳定时器相关消息处理
      case 'startHeartbeatTimer': {
        // 启动心跳定时器
        const { interval } = params.value as { interval: number }
        timerWorker.postMessage({
          type: 'startPeriodicHeartbeat',
          interval
        })
        break
      }
      case 'stopHeartbeatTimer': {
        // 停止心跳定时器
        timerWorker.postMessage({
          type: 'stopPeriodicHeartbeat'
        })
        break
      }
      case 'startHeartbeatTimeoutTimer': {
        // 启动心跳超时定时器
        const { timerId, timeout } = params.value as { timerId: string; timeout: number }
        timerWorker.postMessage({
          type: 'startTimer',
          msgId: timerId,
          duration: timeout
        })
        break
      }
      case 'clearHeartbeatTimeoutTimer': {
        // 清除心跳超时定时器
        const { timerId } = params.value as { timerId: string }
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId: timerId
        })
        break
      }
      case 'connectionStateChange': {
        const { state } = params.value as { state: ConnectionState }

        // 检测重连成功: 从RECONNECTING状态变为CONNECTED状态
        if (this.#previousConnectionState === ConnectionState.RECONNECTING && state === ConnectionState.CONNECTED) {
          console.log('🔄 WebSocket 重连成功')
          // 可以添加UI提示
          useMitt.emit('showMainMessage', { title: '连接恢复', content: '网络连接已恢复' })
        }

        // 更新前一状态
        this.#previousConnectionState = state

        console.log('连接状态改变', state)
        useMitt.emit('wsConnectionStateChange', state)
        // 广播状态变化给其他窗口
        if (isMainWindow) {
          await emit('ws-state-change', state)
        }
        break
      }
      // 处理心跳响应
      case 'pongReceived': {
        const { timestamp } = params.value as { timestamp: number }
        this.#connectionHealth.lastPongTime = timestamp
        break
      }
      // 处理连接健康状态
      case 'connectionHealthStatus': {
        const { isHealthy, lastPongTime, timeSinceLastPong } = params.value as {
          isHealthy: boolean
          lastPongTime: number | null
          timeSinceLastPong: number | null
        }
        this.#connectionHealth = { isHealthy, lastPongTime, timeSinceLastPong }
        useMitt.emit('wsConnectionHealthChange', this.#connectionHealth)
        break
      }
    }
  }

  // 重置一些属性
  #onClose = () => {
    this.#connectReady = false
  }

  #dealTasks = () => {
    this.#connectReady = true
    // 先探测登录态
    // this.#detectionLoginStatus()

    timerWorker.postMessage({
      type: 'startTimer',
      msgId: 'process_tasks_timer',
      duration: 500
    })
  }

  #send(msg: WsReqMsgContentType) {
    worker.postMessage(`{"type":"message","value":${typeof msg === 'string' ? msg : JSON.stringify(msg)}}`)
  }

  send = (params: WsReqMsgContentType) => {
    if (isMainWindow) {
      // 主窗口直接发送消息
      if (this.#connectReady) {
        this.#send(params)
      } else {
        // 队列限制
        if (this.#tasks.length >= this.#MAX_QUEUE_SIZE) {
          console.warn('消息队列已满，正在丢弃最旧的消息')
          this.#tasks.shift()
        }
        this.#tasks.push(params)
      }
    } else {
      // 子窗口通过事件发送消息到主窗口
      emit('ws-send', params)
    }
  }

  // 收到消息回调
  onMessage = async (value: string) => {
    try {
      const params: { type: WsResponseMessageType; data: unknown } = JSON.parse(value)
      switch (params.type) {
        // 获取登录二维码
        case WsResponseMessageType.LOGIN_QR_CODE: {
          console.log('获取二维码')
          useMitt.emit(WsResponseMessageType.LOGIN_QR_CODE, params.data as LoginInitResType)
          break
        }
        // 等待授权
        case WsResponseMessageType.WAITING_AUTHORIZE: {
          console.log('等待授权')
          useMitt.emit(WsResponseMessageType.WAITING_AUTHORIZE)
          break
        }
        // 登录成功
        case WsResponseMessageType.LOGIN_SUCCESS: {
          console.log('登录成功')
          useMitt.emit(WsResponseMessageType.LOGIN_SUCCESS, params.data as LoginSuccessResType)
          break
        }
        // 收到消息
        case WsResponseMessageType.RECEIVE_MESSAGE: {
          const message = params.data as MessageType
          useMitt.emit(WsResponseMessageType.RECEIVE_MESSAGE, message)
          break
        }
        // 用户状态改变
        case WsResponseMessageType.USER_STATE_CHANGE: {
          console.log('用户状态改变', params.data)
          useMitt.emit(WsResponseMessageType.USER_STATE_CHANGE, params.data as UserStateType)
          break
        }
        // 用户上线
        case WsResponseMessageType.ONLINE: {
          console.log('上线', params.data)
          useMitt.emit(WsResponseMessageType.ONLINE, params.data as OnStatusChangeType)
          break
        }
        // 用户下线
        case WsResponseMessageType.OFFLINE: {
          console.log('下线')
          useMitt.emit(WsResponseMessageType.OFFLINE)
          break
        }
        // 用户 token 过期
        case WsResponseMessageType.TOKEN_EXPIRED: {
          console.log('账号在其他设备登录')
          useMitt.emit(WsResponseMessageType.TOKEN_EXPIRED, params.data as WsTokenExpire)
          break
        }
        // 拉黑的用户的发言在禁用后，要删除他的发言
        case WsResponseMessageType.INVALID_USER: {
          console.log('无效用户')
          useMitt.emit(WsResponseMessageType.INVALID_USER, params.data as { uid: number })
          break
        }
        // 点赞、不满消息通知
        case WsResponseMessageType.MSG_MARK_ITEM: {
          useMitt.emit(WsResponseMessageType.MSG_MARK_ITEM, params.data as { markList: MarkItemType[] })
          break
        }
        // 消息撤回通知
        case WsResponseMessageType.MSG_RECALL: {
          console.log('撤回')
          useMitt.emit(WsResponseMessageType.MSG_RECALL, params.data as { data: RevokedMsgType })
          break
        }
        // 新好友申请
        case WsResponseMessageType.REQUEST_NEW_FRIEND: {
          console.log('好友申请')
          useMitt.emit(WsResponseMessageType.REQUEST_NEW_FRIEND, params.data as { uid: number; unreadCount: number })
          break
        }
        // 成员变动
        case WsResponseMessageType.NEW_FRIEND_SESSION: {
          console.log('成员变动')
          useMitt.emit(
            WsResponseMessageType.NEW_FRIEND_SESSION,
            params.data as {
              roomId: number
              uid: number
              changeType: ChangeTypeEnum
              activeStatus: OnlineEnum
              lastOptTime: number
            }
          )
          break
        }
        // 同意好友请求
        case WsResponseMessageType.REQUEST_APPROVAL_FRIEND: {
          console.log('同意好友申请', params.data)
          useMitt.emit(
            WsResponseMessageType.REQUEST_APPROVAL_FRIEND,
            params.data as {
              uid: number
            }
          )
          break
        }
        // 自己修改我在群里的信息
        case WsResponseMessageType.MY_ROOM_INFO_CHANGE: {
          console.log('自己修改我在群里的信息', params.data)
          useMitt.emit(
            WsResponseMessageType.MY_ROOM_INFO_CHANGE,
            params.data as {
              myName: string
              roomId: string
              uid: string
            }
          )
          break
        }
        case WsResponseMessageType.ROOM_INFO_CHANGE: {
          console.log('群主修改群聊信息', params.data)
          useMitt.emit(
            WsResponseMessageType.ROOM_INFO_CHANGE,
            params.data as {
              roomId: string
              name: string
              avatar: string
            }
          )
          break
        }
        case WsResponseMessageType.ROOM_GROUP_NOTICE_MSG: {
          console.log('发布群公告', params.data)
          useMitt.emit(
            WsResponseMessageType.ROOM_GROUP_NOTICE_MSG,
            params.data as {
              id: string
              content: string
              top: string
            }
          )
          break
        }
        case WsResponseMessageType.ROOM_EDIT_GROUP_NOTICE_MSG: {
          console.log('编辑群公告', params.data)
          useMitt.emit(
            WsResponseMessageType.ROOM_EDIT_GROUP_NOTICE_MSG,
            params.data as {
              id: string
              content: string
              top: string
            }
          )
          break
        }
        case WsResponseMessageType.ROOM_DISSOLUTION: {
          console.log('群解散', params.data)
          useMitt.emit(WsResponseMessageType.ROOM_DISSOLUTION, params.data)
          break
        }
        default: {
          console.log('接收到未处理类型的消息:', params)
          break
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      // 可以添加错误上报逻辑
      return
    }
  }

  // 检查连接健康状态
  checkConnectionHealth() {
    if (isMainWindow) {
      worker.postMessage(
        JSON.stringify({
          type: 'checkConnectionHealth'
        })
      )
      return this.#connectionHealth
    }
    return null
  }

  // 获取当前连接健康状态
  getConnectionHealth() {
    return this.#connectionHealth
  }

  destroy() {
    worker.postMessage(JSON.stringify({ type: 'clearReconnectTimer' }))
    worker.terminate()
    // 同时终止timer worker相关的心跳
    timerWorker.postMessage({
      type: 'stopPeriodicHeartbeat'
    })
    this.#tasks = []
    this.#processedMsgCache.clear()
    this.#connectReady = false
    // 清理 Tauri 事件监听器
    this.#tauriListener?.cleanup()
  }
}

export default new WS()
