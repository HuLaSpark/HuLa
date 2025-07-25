import { type UnlistenFn } from '@tauri-apps/api/event'
import { onUnmounted, getCurrentInstance } from 'vue'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'

/** 自动管理tauri Listener事件监听器的hooks */
export const useTauriListener = () => {
  const listeners: Promise<UnlistenFn>[] = []
  const instance = getCurrentInstance()
  let windowCloseUnlisten: UnlistenFn | null = null

  /**
   * 添加事件监听器
   * @param listener Promise<UnlistenFn>
   */
  const addListener = (listener: Promise<UnlistenFn>) => {
    listeners.push(listener)
    return listener
  }

  /**
   * 批量添加事件监听器
   * @param listenerPromises Promise<UnlistenFn>数组
   */
  const pushListeners = (listenerPromises: Promise<UnlistenFn>[]) => {
    listeners.push(...listenerPromises)
    return listenerPromises
  }

  /**
   * 清理所有监听器
   */
  const cleanup = async () => {
    info(`[useTauriListener]清除所有的Tauri 监听器，监听器数量:[${listeners.length}]`)
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

      // 清理窗口关闭监听器
      if (windowCloseUnlisten) {
        windowCloseUnlisten()
        windowCloseUnlisten = null
      }
    } catch (error) {
      console.error('清理监听器失败:', error)
    }
  }

  // 监听窗口关闭事件来自动清理监听器
  const setupWindowCloseListener = async () => {
    try {
      const appWindow = WebviewWindow.getCurrent()
      // 监听窗口关闭请求事件
      if (appWindow.label !== 'home') {
        info(`[useTauriListener]当前窗口标签设置关闭监听: ${appWindow.label}`)
        windowCloseUnlisten = await appWindow.onCloseRequested(async () => {
          info(`监听[${appWindow.label}]窗口关闭事件-清理所有监听器`)
          await cleanup()
        })
      }
    } catch (error) {
      console.warn('设置窗口关闭监听器失败:', error)
    }
  }

  // 设置窗口关闭监听器
  setupWindowCloseListener()

  // 只在组件实例存在时才注册 onUnmounted 钩子
  if (instance) {
    onUnmounted(cleanup)
  }

  return {
    addListener,
    pushListeners,
    // 暴露清理方法，以便在非组件环境中手动清理
    cleanup
  }
}
