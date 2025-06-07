import { useNetwork, useEventListener, useTimeoutFn } from '@vueuse/core'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useCachedStore } from '@/stores/cached'
import { useContactStore } from '@/stores/contacts'
import { type } from '@tauri-apps/plugin-os'
import webSocket from '@/services/webSocket'

/**
 * 网络重连Hook，监测网络恢复并自动刷新数据
 * 在网络从离线变为在线时触发数据刷新
 * 处理系统睡眠唤醒和长时间空闲后的连接恢复
 * 刷新当前聊天室消息、会话列表、群组信息等
 */
export const useNetworkReconnect = () => {
  // 使用VueUse的useNetwork获取网络状态
  const { isOnline, offlineAt, onlineAt } = useNetwork()

  // 上次离线的时间戳
  let lastOfflineTimestamp = 0

  // 上次活动时间戳（用于检测长时间空闲）
  let lastActivityTimestamp = Date.now()

  // 判断是否是移动设备
  const isMobile = computed(() => type() === 'android' || type() === 'ios')

  // 最长空闲时间，超过这个时间会检查连接（15分钟）
  const MAX_IDLE_TIME = 15 * 60 * 1000

  // 定期健康检查定时器
  const healthCheckTimer = useTimeoutFn(
    () => {
      checkConnectionHealth()
      // 执行完一次后，再次启动定时器，实现循环检查
      healthCheckTimer.start()
    },
    5 * 60 * 1000,
    { immediate: true, immediateCallback: false }
  )

  // 监听网络状态变化
  watch([isOnline, offlineAt], ([newIsOnline, newOfflineAt], [oldIsOnline]) => {
    // 网络从离线变为在线时
    if (!oldIsOnline && newIsOnline) {
      console.log('[Network] 网络已重新连接，开始刷新数据')

      // 如果知道离线时间，记录下来
      if (newOfflineAt) {
        lastOfflineTimestamp = newOfflineAt
      }

      // 执行数据刷新
      refreshAllData()
    }

    // 网络变为离线时记录时间
    if (oldIsOnline && !newIsOnline && newOfflineAt) {
      lastOfflineTimestamp = newOfflineAt
      console.log('[Network] 网络已断开连接')
    }
  })

  /**
   * 在挂起/恢复时可能会改变网络状态
   * 对所有平台处理可见性变化和潜在的连接问题
   */
  useEventListener(window, 'visibilitychange', () => {
    const currentTime = Date.now()
    const idleTime = currentTime - lastActivityTimestamp

    // 页面变为可见时
    if (document.visibilityState === 'visible') {
      console.log(`[Network] 应用从后台恢复，已离线 ${idleTime / 1000} 秒`)
      lastActivityTimestamp = currentTime

      // 在移动设备上的恢复逻辑
      if (isMobile.value && isOnline.value) {
        // 如果离线超过30秒，则刷新数据
        if (lastOfflineTimestamp > 0 && currentTime - lastOfflineTimestamp > 30000) {
          console.log('[Network] 移动端应用从后台恢复，刷新数据')
          refreshAllData()
          lastOfflineTimestamp = 0
        }
      }

      // 在所有设备上，如果空闲时间过长，执行连接健康检查
      if (idleTime > 15 * 60 * 1000) {
        // 如果超过15分钟没活动
        checkConnectionHealth(true)
      }
    } else {
      // 页面变为不可见时，记录时间戳
      lastActivityTimestamp = currentTime
    }
  })

  /**
   * 睡眠/唤醒事件
   * TODO 实现
   */
  // const setupSystemEventListeners = async () => {
  // }

  /**
   * 检查WebSocket连接健康状态
   * @param forceReconnect 是否在不健康时强制重连
   */
  const checkConnectionHealth = (forceReconnect = false) => {
    // 调用WebSocket的健康检查
    const health = webSocket.checkConnectionHealth()

    if (!health) return

    console.log('[Network] 连接健康检查:', health)

    const currentTime = Date.now()
    const idleTime = currentTime - lastActivityTimestamp

    // 1. 明确要求强制重连
    // 2. 连接不健康且空闲时间超过MAX_IDLE_TIME
    if (forceReconnect || (!health.isHealthy && idleTime > MAX_IDLE_TIME)) {
      console.log('[Network] 检测到不健康或空闲时间过长的连接，正在重新连接...')
      webSocket.forceReconnect()

      // 刷新数据
      refreshAllData()
    }
  }

  /**
   * 刷新所有重要数据
   */
  const refreshAllData = async () => {
    const chatStore = useChatStore()
    const globalStore = useGlobalStore()
    const groupStore = useGroupStore()
    const cachedStore = useCachedStore()
    const contactStore = useContactStore()

    // 刷新会话列表
    await chatStore.getSessionList(true)
    // 如果当前有选中的聊天室，重置并刷新消息列表
    if (globalStore.currentSession?.roomId) {
      // 获取最新消息
      await chatStore.resetAndRefreshCurrentRoomMessages()
    }
    // 如果当前是群聊，刷新群组信息
    if (globalStore.currentSession?.type === 2) {
      await groupStore.getGroupUserList(true)
      await groupStore.getCountStatistic()
      await cachedStore.getGroupAtUserBaseInfo()
    }
    // 刷新联系人列表
    await contactStore.getContactList(true)
    // 更新未读消息计数
    globalStore.updateGlobalUnreadCount()
    // 刷新在线用户列表
    await groupStore.refreshGroupMembers()

    console.log('[Network] 数据刷新完成')
  }

  return {
    isOnline,
    offlineAt,
    onlineAt,
    refreshAllData,
    checkConnectionHealth
  }
}
