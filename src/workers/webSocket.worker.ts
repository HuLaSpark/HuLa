// 发消息给主进程
import { ConnectionState, WorkerMsgEnum } from '@/enums'

const postMsg = ({ type, value }: { type: string; value?: object }) => {
  self.postMessage(JSON.stringify({ type, value }))
}

// ws instance
let connection: WebSocket
// 心跳 timer
let heartTimer: number | null = null

// 重连次数上限
const reconnectCountMax = 5
let reconnectCount = 0
// 重连🔐
let lockReconnect = false
let token: null | string = null

let clientId: null | string = null

// 往 ws 发消息
const connectionSend = (value: object) => {
  connection?.send(JSON.stringify(value))
}

// 添加心跳超时检测
let heartbeatTimeout: number | null = null
const HEARTBEAT_TIMEOUT = 15000 // 15秒超时

// 发送心跳 10s 内发送
const sendHeartPack = () => {
  // 10s 检测心跳
  heartTimer = setInterval(() => {
    // 心跳消息类型 2
    connectionSend({ type: 2 })

    // 清除之前的超时计时器
    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout)
    }

    // 设置新的超时计时器
    heartbeatTimeout = setTimeout(() => {
      console.log('心跳超时，重连...')
      connection.close()
    }, HEARTBEAT_TIMEOUT) as any
  }, 9900) as any
}

// 清除❤️跳 timer
const clearHeartPackTimer = () => {
  if (heartTimer) {
    clearInterval(heartTimer)
    heartTimer = null
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

  // 添加重连次数限制
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

  // 使用 timer worker 替代 setTimeout
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
  if (connection?.readyState !== WebSocket.OPEN) {
    postMsg({ type: WorkerMsgEnum.WS_ERROR, value: { msg: '连接失败，请检查网络或联系管理员' } })
    return
  }
  onCloseHandler()
  postMsg({ type: WorkerMsgEnum.ERROR })
}
// ws 连接 close
const onConnectClose = () => {
  updateConnectionState(ConnectionState.DISCONNECTED)
  onCloseHandler()
  token = null
  postMsg({ type: WorkerMsgEnum.CLOSE })
}
// ws 连接成功
const onConnectOpen = () => {
  updateConnectionState(ConnectionState.CONNECTED)
  postMsg({ type: WorkerMsgEnum.OPEN })
  sendHeartPack()
}
// ws 连接 接收到消息
const onConnectMsg = (e: any) => postMsg({ type: WorkerMsgEnum.MESSAGE, value: e.data })

// 初始化 ws 连接
const initConnection = () => {
  updateConnectionState(ConnectionState.CONNECTING)
  connection?.removeEventListener('message', onConnectMsg)
  connection?.removeEventListener('open', onConnectOpen)
  connection?.removeEventListener('close', onConnectClose)
  connection?.removeEventListener('error', onConnectError)
  // 建立链接
  // 本地配置到 .env 里面修改。生产配置在 .env.production 里面
  if (!connection) {
    connection = new WebSocket(
      `${import.meta.env.VITE_WEBSOCKET_URL}?clientId=${clientId}${token ? `&token=${token}` : ''}`
    )
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
  console.log(e.data)
  const { type, value } = JSON.parse(e.data)
  switch (type) {
    case 'initWS': {
      reconnectCount = 0
      token = value['token']
      clientId = value['clientId']
      initConnection()
      break
    }
    case 'message': {
      if (connection?.readyState !== 1) return
      connectionSend(value)
      break
    }
    case 'reconnectTimeout': {
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
  }
}
