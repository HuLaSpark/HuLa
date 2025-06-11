// 发消息给主进程
import { ConnectionState, WorkerMsgEnum } from '@/enums'

const postMsg = ({ type, value }: { type: string; value?: object }) => {
  self.postMessage(JSON.stringify({ type, value }))
}

// 连接状态
let connectionState = ConnectionState.DISCONNECTED

// 最后一次收到pong消息的时间
let lastPongTime: number | null = null

// 连续心跳失败计数（未收到pong响应）
let consecutiveHeartbeatFailures = 0
// 最大允许的连续心跳失败次数，超过这个值会触发重连
const MAX_HEARTBEAT_FAILURES = 3

// 心跳日志记录开关
let heartbeatLoggingEnabled = false

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

// 标识是否曾经成功连接过，用于区分首次连接和重连
let hasEverConnected = false

// 心跳状态
let heartbeatActive = false

// 往 ws 发消息
const connectionSend = (value: object) => {
  connection?.send(JSON.stringify(value))
}

// 添加心跳超时检测
let heartbeatTimeout: string | null = null
const HEARTBEAT_TIMEOUT = 15000 // 15秒超时
const HEARTBEAT_INTERVAL = 9900 // 心跳间隔

// 上次发送心跳的时间
let lastPingSent: number | null = null

// 健康检查间隔
const HEALTH_CHECK_INTERVAL = 30000 // 30秒检查一次连接健康状态

// 健康检查定时器ID
let healthCheckTimerId: string | null = null

// 发送心跳请求，使用timer.worker
const sendHeartPack = () => {
  // 启动健康检查定时器
  startHealthCheck()

  // 标记心跳活跃
  heartbeatActive = true

  // 请求主线程启动心跳定时器
  postMsg({
    type: 'startHeartbeatTimer',
    value: { interval: HEARTBEAT_INTERVAL }
  })

  // 记录日志
  logHeartbeat('心跳定时器已启动')
}

// 启动定期健康检查
const startHealthCheck = () => {
  // 清除之前的健康检查定时器
  if (healthCheckTimerId) {
    postMsg({
      type: 'clearTimer',
      value: { msgId: healthCheckTimerId }
    })
    healthCheckTimerId = null
  }

  // 设置新的健康检查定时器
  const timerId = `health_check_${Date.now()}`
  healthCheckTimerId = timerId
  postMsg({
    type: 'startTimer',
    value: { msgId: timerId, duration: HEALTH_CHECK_INTERVAL }
  })

  logHeartbeat('健康检查定时器已启动')
}

// 心跳日志记录
const logHeartbeat = (message: string, data?: any) => {
  if (heartbeatLoggingEnabled) {
    console.log(`[WebSocket心跳] ${message}`, data || '')
    postMsg({
      type: 'heartbeatLog',
      value: { message, data, timestamp: Date.now() }
    })
  }
}

// 发送单次心跳
const sendSingleHeartbeat = () => {
  // 检查WebSocket连接状态
  if (connection?.readyState !== WebSocket.OPEN) {
    logHeartbeat('尝试发送心跳时发现连接未打开', { readyState: connection?.readyState })
    tryReconnect()
    return
  }

  // 记录本次发送心跳时间
  lastPingSent = Date.now()

  // 心跳消息类型 2
  try {
    connectionSend({ type: 2 })
    logHeartbeat('心跳已发送', { timestamp: lastPingSent })
  } catch (err) {
    logHeartbeat('心跳发送失败', { error: err })
    // 发送失败，可能连接已经中断但状态未更新
    tryReconnect()
    return
  }

  // 优化的连接健康检测机制
  if (lastPongTime !== null) {
    const timeSinceLastPong = lastPingSent - lastPongTime
    const healthThreshold = HEARTBEAT_INTERVAL * 2.5 // 增加容错时间
    const isConnectionHealthy = timeSinceLastPong < healthThreshold

    // 如果连接不健康，通知主线程
    if (!isConnectionHealthy) {
      consecutiveHeartbeatFailures++

      // 只在关键阈值时记录日志，减少日志开销
      if (consecutiveHeartbeatFailures === 1 || consecutiveHeartbeatFailures % 3 === 0) {
        logHeartbeat('连接响应缓慢', {
          consecutiveFailures: consecutiveHeartbeatFailures,
          timeSinceLastPong
        })
      }

      // 延迟错误通知，避免频繁触发
      if (consecutiveHeartbeatFailures >= 2) {
        postMsg({
          type: WorkerMsgEnum.ERROR,
          value: {
            msg: '连接响应较慢，可能存在网络问题',
            timeSinceLastPong,
            consecutiveFailures: consecutiveHeartbeatFailures
          }
        })
      }

      // 连续失败次数过多，尝试重连
      if (consecutiveHeartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
        logHeartbeat('连续心跳失败次数过多，触发重连', { consecutiveFailures: consecutiveHeartbeatFailures })
        tryReconnect()
        return
      }
    } else {
      // 重置连续失败计数
      if (consecutiveHeartbeatFailures > 0) {
        logHeartbeat('心跳恢复正常', { previousFailures: consecutiveHeartbeatFailures })
        consecutiveHeartbeatFailures = 0
      }
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

// 更新连接状态
const updateConnectionState = (newState: ConnectionState, isReconnection?: boolean) => {
  connectionState = newState
  postMsg({
    type: 'connectionStateChange',
    value: {
      state: connectionState,
      isReconnection: isReconnection || false
    }
  })
}

// 清除心跳定时器
const clearHeartPackTimer = () => {
  logHeartbeat('清除心跳定时器')
  heartbeatActive = false
  postMsg({ type: 'stopHeartbeatTimer' })

  // 清除超时定时器
  if (heartbeatTimeout) {
    postMsg({
      type: 'clearHeartbeatTimeoutTimer',
      value: { timerId: heartbeatTimeout }
    })
    heartbeatTimeout = null
  }

  // 清除健康检查定时器
  if (healthCheckTimerId) {
    postMsg({
      type: 'clearTimer',
      value: { msgId: healthCheckTimerId }
    })
    healthCheckTimerId = null
  }
}

// 主动尝试重连
const tryReconnect = () => {
  logHeartbeat('触发主动重连')

  // 主动关闭当前连接
  connection?.close()

  // 重置心跳状态
  heartbeatActive = false

  // 清除心跳定时器
  clearHeartPackTimer()

  // 触发重连流程
  updateConnectionState(ConnectionState.RECONNECTING)
  if (!lockReconnect) {
    lockReconnect = true

    // 使用短延迟立即重连
    postMsg({
      type: 'startReconnectTimer',
      value: {
        delay: 1000, // 快速重连，1秒后
        reconnectCount
      }
    })
  }
}

// 优化的智能退避算法
const getBackoffDelay = (retryCount: number) => {
  const baseDelay = 1000 // 基础延迟1秒
  const maxDelay = 15000 // 减少最大延迟到15秒
  const multiplier = Math.min(1.5, 2 - retryCount * 0.1)
  const delay = Math.min(baseDelay * Math.pow(multiplier, retryCount), maxDelay)

  // 减少随机抖动范围
  return delay + Math.random() * 500
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
  postMsg({ type: WorkerMsgEnum.CLOSE })
}
// ws 连接成功
const onConnectOpen = () => {
  console.log('🔌 WebSocket 连接成功')
  // 重置心跳相关状态
  consecutiveHeartbeatFailures = 0
  lastPongTime = null
  lastPingSent = null

  // 判断是否为重连（在设置hasEverConnected之前）
  const isReconnection = hasEverConnected

  // 标记已经成功连接过
  hasEverConnected = true

  updateConnectionState(ConnectionState.CONNECTED, isReconnection)
  postMsg({ type: WorkerMsgEnum.OPEN })

  // 连接成功后立即发送一次心跳
  sendSingleHeartbeat()

  // 然后开始定期心跳
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

      // 计算心跳往返时间
      let roundTripTime = null
      if (lastPingSent) {
        roundTripTime = lastPongTime - lastPingSent
      }

      // 重置连续失败计数
      if (consecutiveHeartbeatFailures > 0) {
        logHeartbeat('收到pong响应，重置连续失败计数', {
          previousFailures: consecutiveHeartbeatFailures,
          roundTripTime
        })
        consecutiveHeartbeatFailures = 0
      } else {
        logHeartbeat('收到pong响应', { roundTripTime })
      }

      // 告知主线程收到了pong
      postMsg({
        type: 'pongReceived',
        value: {
          timestamp: lastPongTime,
          roundTripTime,
          consecutiveFailures: consecutiveHeartbeatFailures
        }
      })
    }
  } catch (err) {
    // 解析失败则当作普通消息处理
    logHeartbeat('解析消息失败', { error: err })
  }

  // 如果收到任何消息，说明连接是有效的，更新连接状态
  if (connectionState !== ConnectionState.CONNECTED) {
    updateConnectionState(ConnectionState.CONNECTED)
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

// 停止所有心跳相关活动
const stopAllHeartbeat = () => {
  console.log('停止所有心跳活动')
  heartbeatActive = false
  clearHeartPackTimer()
}

// 重置重连状态
const resetReconnection = () => {
  reconnectCount = 0
  lockReconnect = false
  hasEverConnected = false
  console.log('重置重连计数和状态')
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
        console.log('重连中，当前clientId:', clientId, '当前token状态:', token ? '存在' : '不存在')
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
    // 停止心跳
    case 'stopHeartbeat': {
      stopAllHeartbeat()
      break
    }
    // 重置重连计数
    case 'resetReconnectCount': {
      resetReconnection()
      break
    }
    // 清除重连计时器
    case 'clearReconnectTimer': {
      lockReconnect = true // 锁定重连，阻止旧的重连流程
      console.log('清除重连计时器')
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

      // 连续失败次数也是健康状态的一个指标
      const healthStatus = {
        isHealthy,
        lastPongTime,
        lastPingSent,
        connectionState,
        heartbeatActive,
        consecutiveFailures: consecutiveHeartbeatFailures,
        timeSinceLastPong: lastPongTime ? now - lastPongTime : null,
        readyState: connection?.readyState
      }

      logHeartbeat('健康检查', healthStatus)

      // 如果连接不健康但状态显示已连接，尝试修复
      if (!isHealthy && connection?.readyState === WebSocket.OPEN && heartbeatActive) {
        logHeartbeat('健康检查发现异常，尝试恢复心跳', healthStatus)
        // 立即发送一次心跳
        sendSingleHeartbeat()
      }

      // 如果心跳应该活跃但心跳定时器未运行，重启心跳
      if (connectionState === ConnectionState.CONNECTED && !heartbeatActive) {
        logHeartbeat('发现心跳停止但连接正常，重启心跳', healthStatus)
        sendHeartPack()
      }

      postMsg({
        type: 'connectionHealthStatus',
        value: healthStatus
      })
      break
    }

    // 健康检查定时器触发
    case 'healthCheckTimeout': {
      // 定期健康检查触发
      const { msgId } = value
      if (msgId === healthCheckTimerId) {
        // 执行健康检查
        const now = Date.now()
        const isHealthy = lastPongTime !== null && now - lastPongTime < HEARTBEAT_INTERVAL * 2

        logHeartbeat('定期健康检查', {
          isHealthy,
          timeSinceLastPong: lastPongTime ? now - lastPongTime : null,
          heartbeatActive,
          readyState: connection?.readyState
        })

        // 如果不健康且连接状态异常，尝试重连
        if (!isHealthy && consecutiveHeartbeatFailures >= 1) {
          logHeartbeat('定期健康检查发现连接异常，尝试重连')
          tryReconnect()
        }
        // 如果心跳定时器应该在运行但实际没有运行，重启心跳
        else if (connectionState === ConnectionState.CONNECTED && !heartbeatActive) {
          logHeartbeat('发现心跳停止但连接正常，重启心跳')
          sendHeartPack()
        }
        // 继续启动下一次健康检查
        startHealthCheck()
      }
      break
    }

    // 控制心跳日志记录
    case 'setHeartbeatLogging': {
      heartbeatLoggingEnabled = !!value.enabled
      logHeartbeat(`心跳日志${heartbeatLoggingEnabled ? '已开启' : '已关闭'}`)
      break
    }
  }
}
