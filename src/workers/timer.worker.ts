// 修改类型定义以支持字符串和数字类型的key
type TimerId = number | string
type TimerInfo = {
  timerId: NodeJS.Timeout
  debugId: NodeJS.Timeout | null
}

// 存储定时器ID和调试定时器ID
const timerIds = new Map<TimerId, TimerInfo>()

// 添加一个计数器来跟踪活动的定时器数量
let activeTimers = 0

// 周期性心跳定时器ID
let periodicHeartbeatId: NodeJS.Timeout | null = null

// 日志控制开关，默认不打印日志
let enableLogging = false

// 检查并通知所有定时器是否完成
const checkAllTimersCompleted = () => {
  if (activeTimers === 0) {
    self.postMessage({ type: 'allTimersCompleted' })
  }
}

// 优化的调试信息打印函数
const logDebugInfo = (msgId: number, remainingTime: number) => {
  // 只有开启日志功能时才打印，且只在关键时间点打印
  if (enableLogging && (remainingTime <= 5000 || remainingTime % 10000 < 1000)) {
    console.log(`[Worker Debug] 消息ID: ${msgId}, 剩余时间: ${(remainingTime / 1000).toFixed(1)}秒`)
    // 减少向主线程发送调试消息的频率
    if (remainingTime <= 3000) {
      self.postMessage({
        type: 'debug',
        msgId,
        remainingTime,
        timestamp: Date.now()
      })
    }
  }
}

// 安全的日志函数
/**
 * @description 如何开启日志打印
 * @example timerWorker.postMessage({ type: 'setLogging', logging: true })
 */
const safeLog = (message: string, ...args: any[]) => {
  if (enableLogging) {
    console.log(message, ...args)
  }
}

self.onmessage = (e) => {
  const { type, msgId, duration, reconnectCount, interval, logging } = e.data

  // 如果收到日志控制参数，则更新日志缀状态
  if (type === 'setLogging') {
    enableLogging = !!logging
    safeLog(`[Worker] 日志状态已${enableLogging ? '开启' : '关闭'}`)
    return
  }

  switch (type) {
    case 'startReconnectTimer': {
      // 主线程发送重启timer事件, 延时后返回reconnectTimeout事件给主线程
      console.log('[Timer Worker] 启动重连定时器.....')
      const timerId = setTimeout(() => {
        self.postMessage({
          type: 'reconnectTimeout',
          reconnectCount
        })
      }, e.data.value.delay)

      // 现在可以使用字符串作为key了
      timerIds.set('reconnect', { timerId, debugId: null })
      safeLog('[Worker] 启动重连定时器')
      break
    }

    case 'clearReconnectTimer': {
      if (timerIds.has('reconnect')) {
        const { timerId } = timerIds.get('reconnect')!
        clearTimeout(timerId)
        timerIds.delete('reconnect')
        safeLog('[Worker] 清除重连定时器')
      }
      break
    }

    case 'startTimer': {
      activeTimers++
      safeLog(`[Worker] 启动定时器: ${msgId}, 时长: ${duration}ms`)
      // 使用数字类型的msgId
      if (timerIds.has(msgId)) {
        const { timerId, debugId } = timerIds.get(msgId)!
        clearTimeout(timerId)
        if (debugId) clearInterval(debugId)
        timerIds.delete(msgId)
        safeLog(`[Worker] 替换已存在的定时器: ${msgId}`)
      }

      const startTime = Date.now()

      // 立即打印一次初始状态
      logDebugInfo(msgId, duration)

      // 优化的调试间隔器，减少打印频率
      const debugInterval = duration > 10000 ? 5000 : 1000 // 长任务每5秒打印，短任务每秒打印
      const debugId = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = duration - elapsed
        if (remaining > 0) {
          logDebugInfo(msgId, remaining)
        } else {
          clearInterval(debugId)
        }
      }, debugInterval)

      const timerId = setTimeout(() => {
        clearInterval(debugId)
        safeLog('[Worker] 定时器到期:', msgId)
        self.postMessage({ type: 'timeout', msgId })
        timerIds.delete(msgId)

        activeTimers--
        checkAllTimersCompleted()
      }, duration)

      timerIds.set(msgId, { timerId, debugId })
      break
    }

    case 'clearTimer': {
      safeLog('[Worker] 清理定时器:', msgId)
      if (timerIds.has(msgId)) {
        const { timerId, debugId } = timerIds.get(msgId)!
        clearTimeout(timerId)
        if (debugId) clearInterval(debugId)
        timerIds.delete(msgId)
        activeTimers--
        checkAllTimersCompleted()
      }
      break
    }

    // 心跳周期性定时器相关功能
    case 'startPeriodicHeartbeat': {
      // 先清除之前的定时器如果存在
      if (periodicHeartbeatId) {
        clearInterval(periodicHeartbeatId)
        periodicHeartbeatId = null
      }

      // 创建新的周期性心跳定时器
      periodicHeartbeatId = setInterval(() => {
        safeLog('[Worker] 发送心跳')
        self.postMessage({ type: 'periodicHeartbeat' })
      }, interval || 9900) as any

      safeLog('[Worker] 心跳定时器已启动, 间隔:', interval, 'ms')
      break
    }

    case 'stopPeriodicHeartbeat': {
      if (periodicHeartbeatId) {
        clearInterval(periodicHeartbeatId)
        periodicHeartbeatId = null
        safeLog('[Worker] 心跳定时器已停止')
      }
      break
    }
  }
}
