// 发消息给主进程
import { ConnectionState, WorkerMsgEnum } from '@/enums'

const postMsg = ({ type, value }: { type: string; value?: object }) => {
  self.postMessage(JSON.stringify({ type, value }))
}

// 最后一次收到pong消息的时间
let lastPongTime: number | null = null

// ws instance
let connection: WebSocket

// 重连次数上限
const reconnectCountMax = 5
let reconnectCount = 0
// 重连锁
let lockReconnect = false
let token: null | string = null

let clientId: null | string = null

let serverUrl: null | string = null

// 往 ws 发消息
const connectionSend = (value: object) => {
  connection?.send(JSON.stringify(value))
}

// 添加心跳超时检测
let heartbeatTimeout: string | null = null
const HEARTBEAT_TIMEOUT = 15000 // 15秒超时
const HEARTBEAT_INTERVAL = 9900 // 心跳间隔

// 发送心跳请求，使用timer.worker
const sendHeartPack = () => {
  // 请求主线程启动心跳定时器
  postMsg({
    type: 'startHeartbeatTimer',
    value: { interval: HEARTBEAT_INTERVAL }
  })
}

// 发送单次心跳
const sendSingleHeartbeat = () => {
  // 心跳消息类型 2
  connectionSend({ type: 2 })
  const pingTime = Date.now()

  // 检测连接健康状态
  if (lastPongTime !== null) {
    const timeSinceLastPong = pingTime - lastPongTime
    const isConnectionHealthy = timeSinceLastPong < HEARTBEAT_INTERVAL * 2

    // 如果连接不健康，通知主线程
    if (!isConnectionHealthy) {
      postMsg({
        type: WorkerMsgEnum.ERROR,
        value: { msg: '连接响应较慢，可能存在网络问题', timeSinceLastPong }
      })
    }
  }

  // 清除之前的超时计时器
  if (heartbeatTimeout) {
    postMsg({
      type: 'clearHeartbeatTimeoutTimer',
      value: { timerId: heartbeatTimeout }
    })
    heartbeatTimeout = null
  }

  // 设置新的超时计时器
  const timeoutId = `heartbeat_timeout_${Date.now()}`
  heartbeatTimeout = timeoutId
  postMsg({
    type: 'startHeartbeatTimeoutTimer',
    value: { timerId: timeoutId, timeout: HEARTBEAT_TIMEOUT }
  })
}

// 清除心跳定时器
const clearHeartPackTimer = () => {
  postMsg({ type: 'stopHeartbeatTimer' })

  // 清除超时定时器
  if (heartbeatTimeout) {
    postMsg({
      type: 'clearHeartbeatTimeoutTimer',
      value: { timerId: heartbeatTimeout }
    })
    heartbeatTimeout = null
  }
}

const getBackoffDelay = (retryCount: number) => {
  const baseDelay = 1000 // 基础延迟1秒
  const maxDelay = 30000 // 最大延迟30秒
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
  return delay + Math.random() * 1000 // 添加随机抖动
}

const onCloseHandler = () => {
  clearHeartPackTimer()
  if (lockReconnect) return

  // 重连次数限制检查
  if (reconnectCount >= reconnectCountMax) {
    console.log('达到最大重连次数，停止重连')
    postMsg({
      type: WorkerMsgEnum.WS_ERROR,
      value: { msg: '连接失败次数过多，请刷新页面重试' }
    })
    return
  }

  updateConnectionState(ConnectionState.RECONNECTING)
  lockReconnect = true

  // 使用 timer worker 发起重连
  postMsg({
    type: 'startReconnectTimer',
    value: {
      delay: getBackoffDelay(reconnectCount),
      reconnectCount
    }
  })
}

// ws 连接 error
const onConnectError = () => {
  console.log('❌ WebSocket 连接错误')
  if (connection?.readyState !== WebSocket.OPEN) {
    postMsg({ type: WorkerMsgEnum.WS_ERROR, value: { msg: '连接失败，请检查网络或联系管理员' } })
    return
  }
  onCloseHandler()
  postMsg({ type: WorkerMsgEnum.ERROR })
}
// ws 连接 close
const onConnectClose = () => {
  console.log('📡 WebSocket 连接断开')
  updateConnectionState(ConnectionState.DISCONNECTED)
  onCloseHandler()
  token = null
  postMsg({ type: WorkerMsgEnum.CLOSE })
}
// ws 连接成功
const onConnectOpen = () => {
  console.log('✅ WebSocket 连接成功')
  updateConnectionState(ConnectionState.CONNECTED)
  postMsg({ type: WorkerMsgEnum.OPEN })
  sendHeartPack()
}
// ws 连接 接收到消息
const onConnectMsg = (e: any) => {
  // 检查是否是pong消息（服务器响应心跳）
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    if (data && (data.type === 'pong' || data.type === 3)) {
      // 3是pong的消息类型
      lastPongTime = Date.now()
      // 告知主线程收到了pong
      postMsg({ type: 'pongReceived', value: { timestamp: lastPongTime } })
    }
  } catch (err) {
    // 解析失败则当作普通消息处理
  }

  // 转发消息给主线程
  postMsg({ type: WorkerMsgEnum.MESSAGE, value: e.data })
}

// 初始化 ws 连接
const initConnection = () => {
  console.log('🚀 开始初始化 WebSocket 连接')
  updateConnectionState(ConnectionState.CONNECTING)
  connection?.removeEventListener('message', onConnectMsg)
  connection?.removeEventListener('open', onConnectOpen)
  connection?.removeEventListener('close', onConnectClose)
  connection?.removeEventListener('error', onConnectError)
  // 建立链接
  // 本地配置到 .env 里面修改。生产配置在 .env.production 里面
  try {
    connection = new WebSocket(`${serverUrl}?clientId=${clientId}${token ? `&token=${token}` : ''}`)
  } catch (err) {
    console.log('🚀 创建 WebSocket 链接失败')
    postMsg({ type: WorkerMsgEnum.WS_ERROR, value: { msg: '创建 WebSocket 链接失败' } })
  }
  // 收到消息
  connection.addEventListener('message', onConnectMsg)
  // 建立链接
  connection.addEventListener('open', onConnectOpen)
  // 关闭连接
  connection.addEventListener('close', onConnectClose)
  // 连接错误
  connection.addEventListener('error', onConnectError)
}

let connectionState = ConnectionState.DISCONNECTED

// 更新连接状态
const updateConnectionState = (newState: ConnectionState) => {
  connectionState = newState
  postMsg({ type: 'connectionStateChange', value: { state: connectionState } })
}

self.onmessage = (e: MessageEvent<string>) => {
  const { type, value } = JSON.parse(e.data)
  switch (type) {
    case 'initWS': {
      reconnectCount = 0
      token = value['token']
      clientId = value['clientId']
      serverUrl = value['serverUrl']
      lastPongTime = null // 重置pong时间
      initConnection()
      break
    }
    case 'message': {
      if (connection?.readyState !== 1) return
      connectionSend(value)
      break
    }
    case 'reconnectTimeout': {
      console.log('重试次数: ', value.reconnectCount)
      reconnectCount = value.reconnectCount + 1
      // 如果没有超过最大重连次数才继续重连
      if (reconnectCount < reconnectCountMax) {
        initConnection()
        lockReconnect = false
      } else {
        console.log('达到最大重连次数，停止重连')
        postMsg({
          type: WorkerMsgEnum.WS_ERROR,
          value: { msg: '连接失败次数过多，请刷新页面重试' }
        })
      }
      break
    }
    // 心跳定时器触发
    case 'heartbeatTimerTick': {
      sendSingleHeartbeat()
      break
    }
    // 心跳超时
    case 'heartbeatTimeout': {
      console.log('心跳超时，重连...')
      connection.close()
      postMsg({ type: 'heartbeatTimeout' })
      break
    }
    // 页面可见性变化
    case 'visibilityChange': {
      const { isHidden } = value
      if (isHidden) {
        console.log('页面切换到后台，Web Worker继续维持心跳')
        // 页面在后台，Web Worker继续正常工作
      } else {
        console.log('页面切换到前台，恢复正常心跳')
        // 立即发送一次心跳
        sendSingleHeartbeat()
      }
      break
    }
    // 请求检查连接健康状态
    case 'checkConnectionHealth': {
      const now = Date.now()
      const isHealthy = lastPongTime !== null && now - lastPongTime < HEARTBEAT_INTERVAL * 2
      postMsg({
        type: 'connectionHealthStatus',
        value: {
          isHealthy,
          lastPongTime,
          timeSinceLastPong: lastPongTime ? now - lastPongTime : null
        }
      })
      break
    }
  }
}
