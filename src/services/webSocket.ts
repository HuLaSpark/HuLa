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
import { listen } from '@tauri-apps/api/event'
import { useDebounceFn } from '@vueuse/core'
// 使用类型导入避免直接执行代码
import type { useNetworkReconnect as UseNetworkReconnectType } from '@/hooks/useNetworkReconnect'

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

// LRU缓存实现
class LRUCache<K, V> {
  private maxSize: number
  private cache = new Map<K, V>()

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear() {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

class WS {
  // 添加消息队列大小限制
  readonly #MAX_QUEUE_SIZE = 50 // 减少队列大小
  #tasks: WsReqMsgContentType[] = []
  // 重连🔐
  #connectReady = false
  // 使用LRU缓存替代简单的Set
  #processedMsgCache = new LRUCache<number, number>(1000) // 使用LRU缓存

  #tauriListener: ReturnType<typeof useTauriListener> | null = null

  // 存储连接健康状态信息
  #connectionHealth = {
    isHealthy: true,
    lastPongTime: null as number | null,
    timeSinceLastPong: null as number | null
  }

  // 网络重连工具，延迟初始化
  #networkReconnect: ReturnType<typeof UseNetworkReconnectType> | null = null

  // 存储watch清理函数
  #unwatchFunctions: (() => void)[] = []

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

      this.initNetworkReconnect()
    }
  }

  // 初始化网络重连工具
  private initNetworkReconnect() {
    // 动态导入以延迟执行
    import('@/hooks/useNetworkReconnect')
      .then(({ useNetworkReconnect }) => {
        this.#networkReconnect = useNetworkReconnect()
        console.log('[WebSocket] 网络重连工具初始化完成')

        // 监听网络在线状态变化
        if (this.#networkReconnect.isOnline) {
          const unwatch = watch(this.#networkReconnect.isOnline, (newValue, oldValue) => {
            // 只在网络从离线变为在线时执行重连
            if (newValue === true && oldValue === false) {
              console.log('[WebSocket] 网络恢复在线状态，主动重新初始化WebSocket连接')
              // 重置重连计数并重新初始化连接
              this.forceReconnect()
            }
          })

          // 存储清理函数
          this.#unwatchFunctions = this.#unwatchFunctions || []
          this.#unwatchFunctions.push(unwatch)
        }
      })
      .catch((err) => {
        console.error('[WebSocket] 网络重连工具初始化失败:', err)
      })
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

      // 优化的可见性恢复检查
      if (isVisible && this.#networkReconnect?.isOnline?.value) {
        // 检查最后一次通信时间，如果太久没有通信，刷新数据
        const now = Date.now()
        const lastPongTime = this.#connectionHealth.lastPongTime
        const heartbeatTimeout = 90000 // 增加到90秒，减少误触发
        if (lastPongTime && now - lastPongTime > heartbeatTimeout) {
          console.log('[Network] 应用从后台恢复且长时间无心跳，刷新数据')
          this.#networkReconnect?.refreshAllData()
        }
      }
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
        const { state, isReconnection } = params.value as { state: ConnectionState; isReconnection: boolean }

        // 检测重连成功
        if (isReconnection && state === ConnectionState.CONNECTED) {
          console.log('🔄 WebSocket 重连成功')
          // 网络重连成功后刷新数据
          if (isMainWindow && this.#networkReconnect) {
            console.log('开始刷新数据...')
            this.#networkReconnect.refreshAllData()
          } else if (isMainWindow) {
            // 如果还没初始化，延迟初始化后再刷新
            this.initNetworkReconnect()
          }
        } else if (!isReconnection && state === ConnectionState.CONNECTED) {
          console.log('✅ WebSocket 首次连接成功')
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
        // 优化的队列管理
        if (this.#tasks.length >= this.#MAX_QUEUE_SIZE) {
          // 优先丢弃非关键消息
          const nonCriticalIndex = this.#tasks.findIndex(
            (task) => typeof task === 'object' && task.type !== 1 && task.type !== 2
          )
          if (nonCriticalIndex !== -1) {
            this.#tasks.splice(nonCriticalIndex, 1)
            console.warn('消息队列已满，丢弃非关键消息')
          } else {
            this.#tasks.shift()
            console.warn('消息队列已满，丢弃最旧消息')
          }
        }
        this.#tasks.push(params)
      }
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

  // 强制重新连接WebSocket
  forceReconnect() {
    console.log('[WebSocket] 强制重新初始化WebSocket连接')
    // 停止当前的重连计时器
    worker.postMessage(JSON.stringify({ type: 'clearReconnectTimer' }))

    // 停止心跳
    worker.postMessage(JSON.stringify({ type: 'stopHeartbeat' }))

    // 重置重连计数并重新初始化
    worker.postMessage(JSON.stringify({ type: 'resetReconnectCount' }))

    // 重新初始化连接
    this.initConnect()
  }

  destroy() {
    try {
      // 优化的资源清理顺序
      worker.postMessage(JSON.stringify({ type: 'clearReconnectTimer' }))
      worker.postMessage(JSON.stringify({ type: 'stopHeartbeat' }))

      // 同时终止timer worker相关的心跳
      timerWorker.postMessage({
        type: 'stopPeriodicHeartbeat'
      })

      // 清理内存
      this.#tasks.length = 0 // 更高效的数组清空
      this.#processedMsgCache.clear()
      this.#connectReady = false

      // 重置连接健康状态
      this.#connectionHealth = {
        isHealthy: true,
        lastPongTime: null,
        timeSinceLastPong: null
      }

      // 清理 Tauri 事件监听器
      this.#tauriListener?.cleanup()
      this.#tauriListener = null

      // 清理所有watch
      this.#unwatchFunctions.forEach((unwatch) => {
        try {
          unwatch()
        } catch (error) {
          console.warn('清理watch函数时出错:', error)
        }
      })
      this.#unwatchFunctions.length = 0

      // 最后终止workers
      setTimeout(() => {
        worker.terminate()
        timerWorker.terminate()
      }, 100) // 给一点时间让消息处理完成
    } catch (error) {
      console.error('销毁WebSocket时出错:', error)
    }
  }
}

export default new WS()
