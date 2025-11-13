import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

/**
 * 统一管理 后端状态是否可用 的判定，避免在AppData尚未注入时调用 tauri command。
 * 先通过 `is_app_state_ready` 查询一次，如果仍未就绪则监听 `app-state-ready` 事件再继续。
 */
let isReady = false
let pendingPromise: Promise<void> | null = null

/**
 * 等待一次后端广播的 ready 事件。事件触发后即解除监听，并允许后续调用直接读取缓存结果。
 */
const waitForReadyEvent = () =>
  new Promise<void>((resolve) => {
    let cleanup: (() => void) | null = null
    listen('app-state-ready', () => {
      isReady = true
      resolve()
      if (cleanup) {
        cleanup()
        cleanup = null
      }
      pendingPromise = null
    })
      .then((unlisten) => {
        cleanup = unlisten
      })
      .catch((error) => {
        console.warn('[appStateReady] Failed to register listener:', error)
        pendingPromise = null
        resolve()
      })
  })

/**
 * 确保在调用任何依赖后台状态的命令前，Rust 端已经完成初始化。
 * 如果前端在等待期间被多次调用，会复用同一个 Promise，避免重复监听。
 */
export const ensureAppStateReady = async () => {
  if (isReady) {
    return
  }

  try {
    const readyFlag = await invoke<boolean>('is_app_state_ready')
    if (readyFlag) {
      isReady = true
      return
    }
  } catch (error) {
    console.warn('[appStateReady] is_app_state_ready invoke failed:', error)
  }

  if (!pendingPromise) {
    pendingPromise = waitForReadyEvent()
  }

  await pendingPromise
}
