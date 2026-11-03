/**
 * 网络状态监测钩子
 */
import { createSharedComposable, tryOnScopeDispose } from '@vueuse/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import rustWebSocketClient, { ConnectionState } from '@/services/webSocketRust'
import { info, warn, error as logError } from '@tauri-apps/plugin-log'

const useSharedNetworkStatus = createSharedComposable(() => {
  // 网络状态 - 基于浏览器navigator.onLine
  const browserOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const wsState = ref<ConnectionState | null>(null)
  const wsStatus = computed<'unknown' | 'connected' | 'connecting' | 'disconnected' | 'error'>(() => {
    switch (wsState.value) {
      case ConnectionState.CONNECTED:
        return 'connected'
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'connecting'
      case ConnectionState.DISCONNECTED:
        return 'disconnected'
      case ConnectionState.ERROR:
        return 'error'
      default:
        return 'unknown'
    }
  })
  const wsOnline = computed<boolean | null>(() => {
    if (wsState.value === null) return null
    return wsState.value === ConnectionState.CONNECTED
  })
  const isWsConnecting = computed(() => wsStatus.value === 'connecting')
  const isOnline = computed(() => {
    if (!browserOnline.value) return false
    if (wsOnline.value === null) return true
    return wsOnline.value
  })
  const isListening = ref(false)
  let wsUnlisten: UnlistenFn | null = null

  // 自动重连相关状态
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const lastOfflineTime = ref<number | null>(null)
  const MAX_RECONNECT_ATTEMPTS = 3

  // 监听浏览器网络状态变化
  const handleOnline = () => {
    browserOnline.value = true
    // 网络恢复后尝试重连
    attemptReconnect()
  }

  const handleOffline = () => {
    browserOnline.value = false
    lastOfflineTime.value = Date.now()
    warn('[NetworkStatus] 网络已断开')
  }

  /**
   * 执行重连逻辑
   */
  const attemptReconnect = async () => {
    if (isReconnecting.value) {
      warn('[NetworkStatus] 重连已在进行中，跳过')
      return
    }

    isReconnecting.value = true
    reconnectAttempts.value++

    try {
      info(`[NetworkStatus] 尝试重连 (第 ${reconnectAttempts.value} 次)`)

      // 检查当前连接状态
      const isConnected = await rustWebSocketClient.isConnected()

      if (!isConnected) {
        info('[NetworkStatus] WebSocket 未连接，执行强制重连')
        await rustWebSocketClient.forceReconnect()
        info('[NetworkStatus] 重连成功')
        reconnectAttempts.value = 0 // 重置重连计数
      } else {
        info('[NetworkStatus] WebSocket 已连接，无需重连')
        reconnectAttempts.value = 0
      }
    } catch (err) {
      logError(`[NetworkStatus] 重连失败: ${err}`)

      // 如果未达到最大重试次数，延迟后再次尝试
      if (reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
        const retryDelay = Math.min(1000 * 2 ** reconnectAttempts.value, 10000)
        warn(`[NetworkStatus] ${retryDelay}ms 后将重试`)

        setTimeout(() => {
          attemptReconnect()
        }, retryDelay)
      } else {
        logError('[NetworkStatus] 已达到最大重连次数，停止重连')
        reconnectAttempts.value = 0
      }
    } finally {
      isReconnecting.value = false
    }
  }

  const isTauriContext = () => {
    if (typeof window === 'undefined') return false
    return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  }

  const resolveWsState = (state: unknown): ConnectionState | null => {
    if (!state) return null
    const normalized = String(state).toUpperCase()
    switch (normalized) {
      case ConnectionState.CONNECTED:
        return ConnectionState.CONNECTED
      case ConnectionState.CONNECTING:
        return ConnectionState.CONNECTING
      case ConnectionState.RECONNECTING:
        return ConnectionState.RECONNECTING
      case ConnectionState.DISCONNECTED:
        return ConnectionState.DISCONNECTED
      case ConnectionState.ERROR:
        return ConnectionState.ERROR
      default:
        return null
    }
  }

  const updateWsState = (state: unknown) => {
    const resolved = resolveWsState(state)
    if (!resolved) return
    wsState.value = resolved
  }

  const initWsListener = async () => {
    if (!isTauriContext() || wsUnlisten) return
    try {
      wsUnlisten = await listen('websocket-event', (event) => {
        const payload = event.payload as { type?: string; state?: string }
        if (!payload) return
        if (payload.type !== 'connectionStateChanged') return
        updateWsState(payload.state)
      })
    } catch (error) {
      console.warn('[Network] websocket-event 监听失败:', error)
    }
  }

  const initWsState = async () => {
    if (!isTauriContext()) return
    try {
      const state = await rustWebSocketClient.getState()
      updateWsState(state)
    } catch (error) {
      console.warn('[Network] WebSocket 状态获取失败:', error)
    }
  }

  // 初始化网络状态监听
  const initNetworkListener = () => {
    if (isListening.value || typeof window === 'undefined') return
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    isListening.value = true
    void initWsListener()
    void initWsState()
  }

  // 清理网络状态监听
  const cleanupNetworkListener = () => {
    if (!isListening.value || typeof window === 'undefined') return
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    isListening.value = false
    if (wsUnlisten) {
      wsUnlisten()
      wsUnlisten = null
    }
  }

  // 自动初始化监听器
  initNetworkListener()

  // 共享实例在最后一个订阅销毁时清理
  tryOnScopeDispose(() => {
    cleanupNetworkListener()
  })

  return {
    isOnline,
    browserOnline,
    wsOnline,
    wsStatus,
    wsState,
    isWsConnecting,
    isReconnecting,
    reconnectAttempts,
    attemptReconnect,
    initNetworkListener,
    cleanupNetworkListener
  }
})

export const useNetworkStatus = () => useSharedNetworkStatus()
