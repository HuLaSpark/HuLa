import { useMitt } from '@/hooks/useMitt.ts'
import apis from '@/services/apis'
import type { MsgReadUnReadCountType } from '@/services/types'

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
let timer: ReturnType<typeof setInterval> | null = null // 轮询定时器
let request: AbortableRequest | null = null // 当前正在进行的请求

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
}

/**
 * 停止轮询定时器
 */
const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
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
 * 启动消息已读计数队列
 * 1. 立即执行一次查询任务
 * 2. 启动定时轮询
 */
export const readCountQueue = () => {
  // 立即执行一次任务
  void task()
  // 设置定时器，每10秒执行一次
  stopTimer() // 确保不会创建多个定时器
  timer = setInterval(() => void task(), INTERVAL_DELAY)
}
