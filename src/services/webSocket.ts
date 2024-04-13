const { VITE_WEBSOCKET_URL } = import.meta.env
/** websocket连接对象 */
let ws: WebSocket
const initWebSocket = () => {
  ws = new WebSocket(`${VITE_WEBSOCKET_URL}/`)
  ws.onopen = () => {
    sendToServer({ type: 1 })
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

export { initWebSocket }
