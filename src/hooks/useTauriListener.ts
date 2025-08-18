import type { UnlistenFn } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { error, info } from '@tauri-apps/plugin-log'
import { getCurrentInstance, onUnmounted } from 'vue'

// 全局监听器管理
const globalListeners = new Map<string, Promise<UnlistenFn>[]>()
const windowCloseListenerSetup = new Map<string, UnlistenFn>()
const listenerIdMap = new Map<string, Promise<UnlistenFn>>()

/** 自动管理tauri Listener事件监听器的hooks */
export const useTauriListener = () => {
  const listeners: Promise<UnlistenFn>[] = []
  const instance = getCurrentInstance()
  const windowLabel = WebviewWindow.getCurrent().label
  let isComponentMounted = true

  /**
   * 添加事件监听器
   * @param listener Promise<UnlistenFn>
   */
  const addListener = async (listener: Promise<UnlistenFn>, id?: string) => {
    const listenerId = id || `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    if (listenerIdMap.has(listenerId)) {
      try {
        const unlisten = await listener
        unlisten()
      } catch (e) {
        error(`[跟踪] 取消新监听器失败:${listenerId}, 错误:${e}`)
      }
    } else {
      // 添加新的监听器
      listenerIdMap.set(listenerId, listener)
      listeners.push(listener)
      // 同时添加到全局监听器管理中
      if (!globalListeners.has(windowLabel)) {
        globalListeners.set(windowLabel, [])
      }
      globalListeners.get(windowLabel)!.push(listener)
    }
  }

  /**
   * 批量添加事件监听器
   * @param listenerPromises Promise<UnlistenFn>数组
   */
  const pushListeners = (listenerPromises: Promise<UnlistenFn>[]) => {
    listeners.push(...listenerPromises)

    // 同时添加到全局监听器管理中
    if (!globalListeners.has(windowLabel)) {
      globalListeners.set(windowLabel, [])
    }
    globalListeners.get(windowLabel)!.push(...listenerPromises)

    return listenerPromises
  }

  /**
   * 清理当前组件的监听器
   */
  const cleanup = async () => {
    // 标记组件为未挂载状态
    isComponentMounted = false

    // 只有当存在监听器时才打印日志和执行清理
    if (listeners.length > 0) {
      const componentName = instance?.type?.name || instance?.type?.__name || '未知组件'
      info(`[useTauriListener]清除组件[${componentName}]的Tauri 监听器，监听器数量:[${listeners.length}]`)
      try {
        // 等待所有的 unlisten 函数 resolve
        const unlistenFns = await Promise.all(listeners)
        // 执行所有的 unlisten 函数
        unlistenFns.forEach((unlisten) => {
          try {
            unlisten()
          } catch (error) {
            console.warn('清理监听器时出错:', error)
          }
        })
        listeners.length = 0
      } catch (error) {
        console.error('清理监听器失败:', error)
      }
    }
  }

  /**
   * 清理指定窗口的所有监听器（全局清理）
   */
  const cleanupAllListenersForWindow = async (windowLabel: string) => {
    const windowListeners = globalListeners.get(windowLabel)
    if (!windowListeners) return

    info(`[useTauriListener]清除窗口[${windowLabel}]的所有Tauri监听器，监听器数量:[${windowListeners.length}]`)
    try {
      // 等待所有的 unlisten 函数 resolve
      const unlistenFns = await Promise.all(windowListeners)
      // 执行所有的 unlisten 函数
      unlistenFns.forEach((unlisten) => {
        try {
          unlisten()
        } catch (error) {
          console.warn('清理监听器时出错:', error)
        }
      })

      // 清理全局状态
      globalListeners.delete(windowLabel)
    } catch (error) {
      console.error('清理监听器失败:', error)
    }
  }

  // 监听窗口关闭事件来自动清理监听器
  const setupWindowCloseListener = async () => {
    try {
      const appWindow = WebviewWindow.getCurrent()
      const currentWindowLabel = appWindow.label

      // 检查是否已经为该窗口设置过监听器
      if (windowCloseListenerSetup.has(currentWindowLabel)) {
        return
      }

      // 监听窗口关闭请求事件
      if (currentWindowLabel !== 'home') {
        info(`[useTauriListener]当前窗口标签设置关闭监听: ${currentWindowLabel}`)
        const closeUnlisten = await appWindow.onCloseRequested(async () => {
          info(`[useTauriListener]监听[${currentWindowLabel}]窗口关闭事件-清理所有监听器`)
          // 清理该窗口的所有监听器
          await cleanupAllListenersForWindow(currentWindowLabel)
          // 清理窗口关闭监听器
          windowCloseListenerSetup.delete(currentWindowLabel)
        })

        // 保存窗口关闭监听器
        windowCloseListenerSetup.set(currentWindowLabel, closeUnlisten)
      }
    } catch (error) {
      console.warn('设置窗口关闭监听器失败:', error)
    }
  }

  // 设置窗口关闭监听器
  setupWindowCloseListener()

  // 只在组件实例存在时才注册 onUnmounted 钩子
  if (instance) {
    onUnmounted(() => {
      // 检查组件是否仍然挂载，避免重复执行清理
      if (isComponentMounted) {
        cleanup()
      }
    })
  }

  return {
    addListener,
    pushListeners,
    // 暴露清理方法，以便在非组件环境中手动清理
    cleanup
  }
}
