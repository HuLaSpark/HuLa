import { useMitt } from '@/hooks/useMitt.ts'
import apis from '@/services/apis'
import type { MsgReadUnReadCountType } from '@/services/types'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

/**
 * 消息已读计数队列模块
 * 用于批量获取消息的已读状态，通过队列和定时器机制优化请求频率
 */

// 类型定义
type ReadCountQueue = Set<number> // 使用 Set 存储消息ID，自动去重
interface AbortableRequest extends Promise<MsgReadUnReadCountType[]> {
  abort: () => void // 可中断的请求类型，继承自 Promise
}

// 常量定义
const INTERVAL_DELAY = 10000 // 轮询间隔时间：10秒

// 状态变量
const queue: ReadCountQueue = new Set<number>() // 待处理的消息ID队列
let timerWorker: Worker | null = null // Web Worker定时器
let request: AbortableRequest | null = null // 当前正在进行的请求
let isTimerActive = false // 标记定时器是否活跃

// 事件类型定义
interface ReadCountTaskEvent {
  msgId: number // 消息ID
}

/**
 * 添加消息到已读计数队列
 * @param msgId 消息ID
 */
const onAddReadCountTask = ({ msgId }: ReadCountTaskEvent) => {
  if (typeof msgId !== 'number') return
  queue.add(msgId)
}

/**
 * 从已读计数队列中移除消息
 * @param msgId 消息ID
 */
const onRemoveReadCountTask = ({ msgId }: ReadCountTaskEvent) => {
  if (typeof msgId !== 'number') return
  queue.delete(msgId)
}

/**
 * 检查用户是否可以发送已读计数请求
 * 返回布尔值表示是否可以发送请求
 */
const checkUserAuthentication = () => {
  // 1. 检查当前是否在登录窗口
  const currentWindow = WebviewWindow.getCurrent()
  if (currentWindow.label === 'login') {
    return false
  }
}

/**
 * 执行消息已读计数查询任务
 * 1. 中断旧请求（如果存在）
 * 2. 检查队列是否为空
 * 3. 发起新请求获取消息已读状态
 * 4. 处理响应数据并发送事件
 */
const task = async () => {
  try {
    // 如果存在未完成的请求，中断它
    if (request) {
      request.abort()
      request = null
    }

    // 队列为空则不发起请求
    if (queue.size === 0) return

    // 检查用户是否可以发送请求
    const canSendRequest = checkUserAuthentication()
    if (!canSendRequest) {
      console.log('用户未登录或在登录窗口，跳过消息已读计数请求')
      // 在登录窗口时，清空队列并停止定时器
      clearQueue()
      return
    }

    // 发起新的批量查询请求
    request = apis.getMsgReadCount({ msgIds: Array.from(queue) }) as AbortableRequest
    const res = await request

    // 验证响应数据格式
    if (!Array.isArray(res)) {
      console.error('Invalid response format:', res)
      return
    }

    // 将响应数据转换为 Map 结构，方便查询
    const result = new Map<string, MsgReadUnReadCountType>()
    for (const item of res) {
      if (typeof item.msgId === 'string') {
        result.set(item.msgId, item)
      }
    }

    // 发送已读计数更新事件
    useMitt.emit('onGetReadCount', result)
  } catch (error) {
    console.error('无法获取消息读取计数:', error)
  } finally {
    request = null // 清理请求引用
  }
}

/**
 * 初始化消息已读计数监听器
 * 注册添加和移除消息的事件处理函数
 */
export const initListener = () => {
  useMitt.on('onAddReadCountTask', onAddReadCountTask)
  useMitt.on('onRemoveReadCountTask', onRemoveReadCountTask)
  clearQueue()
}

/**
 * 清理消息已读计数监听器
 * 移除事件监听并停止定时器
 */
export const clearListener = () => {
  useMitt.off('onAddReadCountTask', onAddReadCountTask)
  useMitt.off('onRemoveReadCountTask', onRemoveReadCountTask)
  // 取消当前请求
  if (request) {
    request.abort()
    request = null
  }
  stopTimer()
  // 终止Worker
  terminateWorker()
}

/**
 * 停止轮询定时器
 */
const stopTimer = () => {
  if (timerWorker && isTimerActive) {
    // 发送消息给worker停止定时器
    timerWorker.postMessage({
      type: 'clearTimer',
      msgId: 'readCountQueue' // 使用固定字符串作为定时器ID
    })
    isTimerActive = false
  }
}

/**
 * 清空消息队列
 * 清空队列并停止定时器
 */
export const clearQueue = () => {
  queue.clear()
  stopTimer()
}

/**
 * 初始化Web Worker
 */
const initWorker = () => {
  if (!timerWorker) {
    timerWorker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url))

    // 监听Worker消息
    timerWorker.onmessage = (e) => {
      const { type, msgId } = e.data

      // 当timer.worker.ts发送timeout消息时，执行task任务
      if (type === 'timeout' && msgId === 'readCountQueue') {
        void task()
        // 重新启动定时器
        startTimer()
      }
    }

    // 添加错误处理
    timerWorker.onerror = (error) => {
      console.error('[ReadCountQueue Worker Error]', error)
      isTimerActive = false
    }
  }
}

/**
 * 启动定时器
 */
const startTimer = () => {
  if (!timerWorker) {
    initWorker()
  }

  // 清除可能存在的旧定时器
  stopTimer()

  // 确保timerWorker已初始化
  if (timerWorker) {
    // 启动新的定时器
    timerWorker.postMessage({
      type: 'startTimer',
      msgId: 'readCountQueue', // 使用固定字符串作为定时器ID
      duration: INTERVAL_DELAY // 使用相同的轮询间隔时间
    })

    isTimerActive = true
  } else {
    console.error('[ReadCountQueue] 无法初始化Web Worker定时器')
  }
}

/**
 * 终止Worker
 */
const terminateWorker = () => {
  if (timerWorker) {
    stopTimer()
    timerWorker.terminate()
    timerWorker = null
  }
}

/**
 * 启动消息已读计数队列
 * 1. 立即执行一次查询任务
 * 2. 启动定时轮询
 */
export const readCountQueue = () => {
  // 初始化Worker
  initWorker()

  // 立即执行一次任务
  void task()

  // 启动定时器
  startTimer()
}
