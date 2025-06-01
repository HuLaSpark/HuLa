/**
 * 网络状态监测钩子
 */
export const useNetworkStatus = () => {
  // 网络状态 - 基于浏览器navigator.onLine
  const isOnline = ref(navigator.onLine)

  // 监听浏览器网络状态变化
  const handleOnline = () => {
    isOnline.value = true
  }

  const handleOffline = () => {
    isOnline.value = false
  }

  // 初始化网络状态监听
  const initNetworkListener = () => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  // 清理网络状态监听
  const cleanupNetworkListener = () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  // 自动初始化监听器
  initNetworkListener()

  // 在组件卸载时清理监听器
  onUnmounted(() => {
    cleanupNetworkListener()
  })

  return {
    isOnline,
    initNetworkListener,
    cleanupNetworkListener
  }
}
