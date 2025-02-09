import { WsResponseMessageType, WsTokenExpire } from '@/services/wsType.ts'
import type {
  LoginSuccessResType,
  LoginInitResType,
  WsReqMsgContentType,
  OnStatusChangeType
} from '@/services/wsType.ts'
import type { MessageType, MarkItemType, RevokedMsgType } from '@/services/types'
import { OnlineEnum, ChangeTypeEnum, WorkerMsgEnum, ConnectionState } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useUserStore } from '@/stores/user'
import { getEnhancedFingerprint } from '@/services/fingerprint.ts'

// 创建 webSocket worker
const worker: Worker = new Worker(new URL('../workers/webSocket.worker.ts', import.meta.url), {
  type: 'module'
})

class WS {
  // 添加消息队列大小限制
  readonly #MAX_QUEUE_SIZE = 100
  #tasks: WsReqMsgContentType[] = []
  // 重连🔐
  #connectReady = false
  // 使用LRU缓存替代简单的Set
  #processedMsgCache = new Map<number, number>()
  readonly #MAX_CACHE_SIZE = 1000

  constructor() {
    this.initConnect()
    // 收到消息
    worker.addEventListener('message', this.onWorkerMsg)
  }

  initConnect = async () => {
    const token = localStorage.getItem('TOKEN')
    // 如果token 是 null, 而且 localStorage 的用户信息有值，需要清空用户信息
    if (token === null && localStorage.getItem('user')) {
      localStorage.removeItem('user')
    }
    const clientId = await getEnhancedFingerprint()
    // 初始化 ws
    worker.postMessage(
      `{"type":"initWS","value":{"token":${token ? `"${token}"` : null},"clientId":${clientId ? `"${clientId}"` : null}}}`
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
        localStorage.removeItem('wsLogin')
        // 如果是重连失败，可以提示用户刷新页面
        if ((params.value as { msg: string }).msg.includes('连接失败次数过多')) {
          // 可以触发UI提示，让用户刷新页面
          useMitt.emit('wsReconnectFailed', params.value)
        }
        break
      }
      case 'connectionStateChange': {
        const { state } = params.value as { state: ConnectionState }
        // 可以触发事件通知其他组件
        console.log('连接状态改变', state)
        useMitt.emit('wsConnectionStateChange', state)
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

    setTimeout(() => {
      const userStore = useUserStore()
      if (userStore.isSign) {
        // 处理堆积的任务
        for (const task of this.#tasks) {
          this.send(task)
        }
        // 清空缓存的消息
        this.#tasks = []
      }
    }, 500)
  }

  #send(msg: WsReqMsgContentType) {
    worker.postMessage(`{"type":"message","value":${typeof msg === 'string' ? msg : JSON.stringify(msg)}}`)
  }

  send = (params: WsReqMsgContentType) => {
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
          // TODO: 暂时使用去重复的逻辑，后续优化
          if (this.#isMessageProcessed(message.message.id)) {
            break
          }
          useMitt.emit(WsResponseMessageType.RECEIVE_MESSAGE, message)
          break
        }
        // 用户上线
        case WsResponseMessageType.ONLINE: {
          console.log('上线')
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
          console.log('token过期')
          localStorage.removeItem('TOKEN')
          useMitt.emit(WsResponseMessageType.TOKEN_EXPIRED, params.data as WsTokenExpire)
          break
        }
        // 小黑子的发言在禁用后，要删除他的发言
        case WsResponseMessageType.INVALID_USER: {
          console.log('无效用户')
          useMitt.emit(WsResponseMessageType.INVALID_USER, params.data as { uid: number })
          break
        }
        // 点赞、倒赞消息通知
        case WsResponseMessageType.MSG_MARK_ITEM: {
          console.log('点赞')
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
          // TODO: 发送申请后其他人没有接收到好友申请请求，后端查看是否有问题
          console.log('好友申请')
          useMitt.emit(WsResponseMessageType.REQUEST_NEW_FRIEND, params.data as { uid: number; unreadCount: number })
          break
        }
        // 成员变动
        case WsResponseMessageType.NEW_FRIEND_SESSION: {
          console.log('新好友')
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
          console.log('同意好友申请')
          useMitt.emit(
            WsResponseMessageType.REQUEST_APPROVAL_FRIEND,
            params.data as {
              uid: number
            }
          )
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
  // TODO: 暂时使用去重复的逻辑，后续优化
  #isMessageProcessed(msgId: number): boolean {
    const now = Date.now()
    const lastProcessed = this.#processedMsgCache.get(msgId)

    if (lastProcessed && now - lastProcessed < 5000) {
      return true
    }

    // 清理过期缓存
    if (this.#processedMsgCache.size >= this.#MAX_CACHE_SIZE) {
      const oldestEntries = Array.from(this.#processedMsgCache.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, Math.floor(this.#MAX_CACHE_SIZE / 2))

      oldestEntries.forEach(([key]) => this.#processedMsgCache.delete(key))
    }

    this.#processedMsgCache.set(msgId, now)
    return false
  }

  destroy() {
    worker.postMessage(JSON.stringify({ type: 'clearReconnectTimer' }))
    worker.terminate()
    this.#tasks = []
    this.#processedMsgCache.clear()
    this.#connectReady = false
  }
}

export default new WS()
