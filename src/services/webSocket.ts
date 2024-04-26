import { WsReqEnum, WsResEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'

const { VITE_WEBSOCKET_URL } = import.meta.env
/** websocket连接对象 */
let ws: WebSocket
/** 尝试重新连接数 */
let reconnectAttempts = 0
/** 最大重连次数 */
const maxReconnectAttempts = 5
/** 重连间隔 */
const reconnectDelay = 3000
/** 初始化websocket连接 */
const initWebSocket = () => {
  ws = new WebSocket(`${VITE_WEBSOCKET_URL}/`)
  ws.onopen = () => {
    // 发送心跳
    setInterval(async () => {
      await sendToServer({
        type: WsReqEnum.HEARTBEAT
      })
    }, 1000 * 60)
  }

  // 监听服务器返回的消息
  ws.onmessage = (event: MessageEvent) => {
    const data: Record<string, any> = JSON.parse(event.data)
    switch (data.type) {
      case WsReqEnum.LOGIN:
        Mitt.emit(WsResEnum.QRCODE_LOGIN, data)
        break
      case WsReqEnum.HEARTBEAT:
        break
      case WsReqEnum.AUTHORIZE:
        Mitt.emit(WsResEnum.LOGIN_SUCCESS, data)
        break
    }
  }

  /** 尝试重新连接 */
  const retryConnection = () => {
    setTimeout(() => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        initWebSocket()
      } else {
        console.error('已达到最大重连次数，放弃重连')
      }
    }, reconnectDelay)
  }

  // websocket出错重连
  ws.onerror = () => {
    if (ws.readyState !== WebSocket.OPEN) return
    // websocket出错重连
    retryConnection()
  }
}

/**
 * 发送json数据至服务器
 *
 * @param data 传输的json数据对象
 */
const sendToServer = (data: Record<string, any>) => {
  if (ws.readyState === WebSocket.OPEN) {
    const json = JSON.stringify(data)
    ws.send(json)
    return Promise.resolve(true)
  } else {
    return Promise.reject('网络连接失败，请检查网络设置')
  }
}

export { initWebSocket, sendToServer }
