/**
 * WebSocket commands (src-tauri/src/websocket). The main tab owns the socket; other tabs (call
 * window, ...) relay their sends to it over the event bus and read the shared state.
 */
import { emitEvent, onControl, postControl } from '../runtime/bus'
import { WS_URL } from '../runtime/config'
import { log } from '../runtime/label'
import { auth } from './http'
import { registerCommands } from './registry'

type WsState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'

const ws = {
  socket: null as WebSocket | null,
  state: 'DISCONNECTED' as WsState,
  clientId: null as string | null,
  heartbeat: undefined as ReturnType<typeof setInterval> | undefined,
  closing: false,
  attempts: 0
}

/** Server push type -> [event, target window]; null reaches every tab, like the Rust layer. */
const WS_EVENTS: Record<string, [string, string | null]> = {
  loginQrCode: ['ws-login-qr-code', null],
  waitingAuthorize: ['ws-waiting-authorize', null],
  loginSuccess: ['ws-login-success', 'home'],
  receiveMessage: ['ws-receive-message', 'home'],
  msgRecall: ['ws-msg-recall', 'home'],
  msgMarkItem: ['ws-msg-mark-item', 'home'],
  online: ['ws-online', 'home'],
  offline: ['ws-offline', 'home'],
  userStateChange: ['ws-user-state-change', 'home'],
  notifyEvent: ['ws-request-notify-event', 'home'],
  groupSetAdmin: ['ws-group-set-admin-success', 'home'],
  newApply: ['ws-request-new-apply', 'home'],
  requestApprovalFriend: ['ws-request-approval-friend', 'home'],
  memberChange: ['ws-member-change', 'home'],
  roomInfoChange: ['ws-room-info-change', 'home'],
  myRoomInfoChange: ['ws-my-room-info-change', 'home'],
  roomGroupNoticeMsg: ['ws-room-group-notice-msg', 'home'],
  roomEditGroupNoticeMsg: ['ws-room-edit-group-notice-msg', 'home'],
  roomDissolution: ['ws-room-dissolution', 'home'],
  VideoCallRequest: ['ws-video-call-request', null],
  CallAccepted: ['ws-call-accepted', null],
  CallRejected: ['ws-call-rejected', null],
  RoomClosed: ['ws-room-closed', null],
  WEBRTC_SIGNAL: ['ws-webrtc-signal', null],
  JoinVideo: ['ws-join-video', null],
  LeaveVideo: ['ws-leave-video', null],
  DROPPED: ['ws-dropped', null],
  CANCEL: ['ws-cancel', null],
  TIMEOUT: ['ws-timeout', null],
  tokenExpired: ['ws-token-expired', null],
  invalidUser: ['ws-invalid-user', null],
  deleteFriend: ['ws-delete-friend', null],
  feedSendMsg: ['ws-feed-send-msg', 'home'],
  feedNotify: ['ws-feed-notify', 'home']
}

const WS_STATE_KEY = '__web_ws_state'
const OK = { success: true, message: null }

function ownsSocket() {
  return !!ws.socket && ws.socket.readyState === WebSocket.OPEN
}

function sharedState(): WsState {
  if (ws.socket) return ws.state
  try {
    return (localStorage.getItem(WS_STATE_KEY) as WsState) || ws.state
  } catch {
    return ws.state
  }
}

function setState(state: WsState, isReconnection: boolean) {
  ws.state = state
  try {
    localStorage.setItem(WS_STATE_KEY, state)
  } catch (e) {
    log('ws state store failed', e)
  }
  emitEvent('websocket-event', {
    type: 'connectionStateChanged',
    state,
    is_reconnection: isReconnection,
    isReconnection
  })
}

function send(data: unknown) {
  if (!ownsSocket()) return false
  ws.socket!.send(typeof data === 'string' ? data : JSON.stringify(data))
  return true
}

function sendAnywhere(data: unknown) {
  if (send(data)) return true
  if (sharedState() === 'CONNECTED') {
    postControl('wsSend', data)
    return true
  }
  return false
}

onControl('wsSend', (data) => send(data))

function onMessage(text: string) {
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    emitEvent('websocket-event', { type: 'messageReceived', message: text })
    return
  }
  const type = json?.type
  const data = json ? json.data : null
  // delivery ack, as the Rust client sends it
  if (type === 'receiveMessage' && data?.message?.id) {
    send({ type: '15', data: { msgId: String(data.message.id), timestamp: Date.now() } })
  }
  const route = WS_EVENTS[type]
  if (route) emitEvent(route[0], data === undefined ? null : data, route[1])
  else if (type !== undefined) emitEvent('ws-unknown-message', json)
  emitEvent('websocket-event', { type: 'messageReceived', message: json })
}

// A closing main tab must not leave the other tabs believing the socket is still up.
window.addEventListener('pagehide', () => {
  if (!ws.socket) return
  try {
    localStorage.setItem(WS_STATE_KEY, 'DISCONNECTED')
  } catch (e) {
    log('ws state store failed', e)
  }
})

function connect(isReconnection: boolean) {
  const token = auth.get().token
  const url = `${WS_URL}?clientId=${encodeURIComponent(ws.clientId || '')}${token ? `&Token=${encodeURIComponent(token)}` : ''}`
  ws.closing = false
  setState(isReconnection ? 'RECONNECTING' : 'CONNECTING', isReconnection)
  const socket = new WebSocket(url)
  ws.socket = socket
  socket.onopen = () => {
    ws.attempts = 0
    setState('CONNECTED', isReconnection)
    clearInterval(ws.heartbeat)
    ws.heartbeat = setInterval(() => send({ type: '2' }), 9900)
  }
  socket.onmessage = (e) => onMessage(e.data)
  socket.onclose = () => {
    clearInterval(ws.heartbeat)
    if (ws.socket !== socket) return
    if (ws.closing) {
      setState('DISCONNECTED', false)
      return
    }
    const delay = Math.min(1000 * 2 ** ws.attempts++, 15000)
    setState('RECONNECTING', true)
    setTimeout(() => {
      if (!ws.closing && ws.socket === socket) connect(true)
    }, delay)
  }
}

function disconnect() {
  ws.closing = true
  clearInterval(ws.heartbeat)
  ws.socket?.close()
  ws.socket = null
  setState('DISCONNECTED', false)
}

registerCommands({
  ws_init_connection(args) {
    const params = args.params || {}
    ws.clientId = params.clientId || params.client_id || ws.clientId
    if (!ws.socket || ws.socket.readyState > WebSocket.OPEN) connect(false)
    return OK
  },
  ws_disconnect() {
    disconnect()
    return OK
  },
  ws_send_message(args) {
    if (!sendAnywhere(args.params ? args.params.data : null)) throw 'WebSocket not connected'
    return OK
  },
  ws_get_state: () => sharedState(),
  ws_is_connected: () => ownsSocket() || (!ws.socket && sharedState() === 'CONNECTED'),
  ws_get_health: () => ({
    is_healthy: sharedState() === 'CONNECTED',
    last_pong_time: null,
    consecutive_failures: 0,
    round_trip_time: null
  }),
  ws_force_reconnect() {
    if (ws.socket) {
      ws.closing = true
      ws.socket.close()
    }
    connect(true)
    return OK
  },
  ws_update_config: () => OK,
  ws_set_app_background_state: () => OK,
  ws_get_app_background_state: () => false
})

export { disconnect as wsDisconnect }
