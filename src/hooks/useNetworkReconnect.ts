import { useNetwork } from '@vueuse/core'
import { watch, ref } from 'vue'
import { info, warn, error as logError } from '@tauri-apps/plugin-log'

/**
 * 网络重连钩子
 * 监听网络状态变化，在网络恢复后自动重连 WebSocket
 */
export function useNetworkReconnect() {
  const { isOnline } = useNetwork()
  const isReconnecting = ref(false)
  const lastOfflineTime = ref<number | null>(null)
  const reconnectAttempts = ref(0)
  const MAX_RECONNECT_ATTEMPTS = 3

  /**
   * 执行重连逻辑
   */
  const attemptReconnect = async () => {
    if (isReconnecting.value) {
      warn('[NetworkReconnect] 重连已在进行中，跳过')
      return
    }

    isReconnecting.value = true
    reconnectAttempts.value++

    try {
      info(`[NetworkReconnect] 尝试重连 (第 ${reconnectAttempts.value} 次)`)

      // 动态导入 WebSocket 客户端以避免循环依赖
      const { default: RustWebSocketClient } = await import('@/services/webSocketRust')

      // 检查当前连接状态
      const isConnected = await RustWebSocketClient.isConnected()

      if (!isConnected) {
        info('[NetworkReconnect] WebSocket 未连接，执行强制重连')
        await RustWebSocketClient.forceReconnect()
        info('[NetworkReconnect] 重连成功')
        reconnectAttempts.value = 0 // 重置重连计数
      } else {
        info('[NetworkReconnect] WebSocket 已连接，无需重连')
        reconnectAttempts.value = 0
      }
    } catch (err) {
      logError(`[NetworkReconnect] 重连失败: ${err}`)

      // 如果未达到最大重试次数，延迟后再次尝试
      if (reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
        const retryDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 10000)
        warn(`[NetworkReconnect] ${retryDelay}ms 后将重试`)

        setTimeout(() => {
          attemptReconnect()
        }, retryDelay)
      } else {
        logError('[NetworkReconnect] 已达到最大重连次数，停止重连')
        reconnectAttempts.value = 0
      }
    } finally {
      isReconnecting.value = false
    }
  }

  /**
   * 监听网络状态变化
   */
  watch(
    isOnline,
    (online, wasOnline) => {
      if (online && wasOnline === false) {
        // 网络从离线恢复到在线
        const offlineDuration = lastOfflineTime.value ? Date.now() - lastOfflineTime.value : 0

        info(`[NetworkReconnect] 网络已恢复，离线时长: ${Math.round(offlineDuration / 1000)}秒`)

        // 延迟 500ms 后尝试重连，确保网络完全稳定
        setTimeout(() => {
          attemptReconnect()
        }, 500)

        lastOfflineTime.value = null
      } else if (!online && wasOnline === true) {
        // 网络从在线变为离线
        lastOfflineTime.value = Date.now()
        warn('[NetworkReconnect] 网络已断开')
      }
    },
    { immediate: false }
  )

  return {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    attemptReconnect
  }
}
