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

// 检查并通知所有定时器是否完成
const checkAllTimersCompleted = () => {
  if (activeTimers === 0) {
    self.postMessage({ type: 'allTimersCompleted' })
  }
}

// 添加调试信息打印函数
const logDebugInfo = (msgId: number, remainingTime: number) => {
  console.log(`[Worker Debug] 消息ID: ${msgId}, 剩余时间: ${(remainingTime / 1000).toFixed(1)}秒`)
  self.postMessage({
    type: 'debug',
    msgId,
    remainingTime,
    timestamp: Date.now()
  })
}

self.onmessage = (e) => {
  const { type, msgId, duration, reconnectCount } = e.data

  switch (type) {
    case 'startReconnectTimer': {
      const timerId = setTimeout(() => {
        self.postMessage({
          type: 'reconnectTimeout',
          value: { reconnectCount }
        })
      }, e.data.value.delay)

      // 现在可以使用字符串作为key了
      timerIds.set('reconnect', { timerId, debugId: null })
      break
    }

    case 'clearReconnectTimer': {
      if (timerIds.has('reconnect')) {
        const { timerId } = timerIds.get('reconnect')!
        clearTimeout(timerId)
        timerIds.delete('reconnect')
      }
      break
    }

    case 'startTimer': {
      activeTimers++
      // 使用数字类型的msgId
      if (timerIds.has(msgId)) {
        const { timerId, debugId } = timerIds.get(msgId)!
        clearTimeout(timerId)
        if (debugId) clearInterval(debugId)
        timerIds.delete(msgId)
      }

      const startTime = Date.now()

      // 立即打印一次初始状态
      logDebugInfo(msgId, duration)

      // 创建定时打印的间隔器，每1000ms打印一次
      const debugId = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = duration - elapsed
        if (remaining > 0) {
          logDebugInfo(msgId, remaining)
        } else {
          clearInterval(debugId)
        }
      }, 1000) // 每秒打印一次

      const timerId = setTimeout(() => {
        clearInterval(debugId)
        console.log('[Worker] 定时器到期:', msgId)
        self.postMessage({ type: 'timeout', msgId })
        timerIds.delete(msgId)

        activeTimers--
        checkAllTimersCompleted()
      }, duration)

      timerIds.set(msgId, { timerId, debugId })
      break
    }

    case 'clearTimer': {
      console.log('[Worker] 清理定时器:', msgId)
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
  }
}
