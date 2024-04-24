import { WsReqEnum, WsResEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'

const { VITE_WEBSOCKET_URL } = import.meta.env
/** websocket连接对象 */
let ws: WebSocket
/** 初始化websocket连接 */
const initWebSocket = () => {
  ws = new WebSocket(`${VITE_WEBSOCKET_URL}/`)
  ws.onopen = () => {
    // 发送心跳
    setInterval(() => {
      sendToServer({
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

  // websocket出错重连
  ws.onerror = () => {
    // websocket出错重连
    initWebSocket()
  }
}

/**
 * 发送json数据至服务器
 *
 * @param data 传输的json数据对象
 */
const sendToServer = (data: Record<string, any>) => {
  const json = JSON.stringify(data)
  ws.send(json)
}

export { initWebSocket, sendToServer }
