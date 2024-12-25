import { type UnlistenFn } from '@tauri-apps/api/event'

/** 自动管理tauri Listener事件监听器的hooks */
export const useTauriListener = () => {
  const listeners: (UnlistenFn | null)[] = []

  /**
   * 添加事件监听器
   * @param listener 监听器函数或Promise
   */
  const addListener = async (listener: Promise<UnlistenFn>) => {
    const unlisten = await listener
    listeners.push(unlisten)
    return unlisten
  }

  /**
   * 批量添加事件监听器
   * @param listenerPromises 监听器Promise数组
   */
  const pushListeners = async (listenerPromises: Promise<UnlistenFn>[]) => {
    const unlistenFns = await Promise.all(listenerPromises)
    listeners.push(...unlistenFns)
    return unlistenFns
  }

  // 组件卸载时自动清理所有监听器
  onUnmounted(() => {
    listeners.forEach((unlisten) => unlisten?.())
    listeners.length = 0
  })

  return {
    addListener,
    pushListeners
  }
}
