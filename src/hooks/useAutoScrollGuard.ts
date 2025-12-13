import { onUnmounted, ref } from 'vue'

/**
 * 管理自动滚动保护窗口，避免在程序滚动期间被误判为用户滚动。
 * 使用 requestAnimationFrame 控制时长，不依赖 setTimeout。
 */
export const useAutoScrollGuard = () => {
  const isAutoScrolling = ref(false)
  let autoScrollRafId: number | null = null
  let autoScrollUntil = 0

  const stopGuard = () => {
    if (autoScrollRafId) {
      cancelAnimationFrame(autoScrollRafId)
      autoScrollRafId = null
    }
    autoScrollUntil = 0
    isAutoScrolling.value = false
  }

  const enableAutoScroll = (duration = 500) => {
    const now = performance.now()
    autoScrollUntil = Math.max(autoScrollUntil, now + duration)
    if (!isAutoScrolling.value) {
      isAutoScrolling.value = true
    }

    const step = (timestamp: number) => {
      if (timestamp >= autoScrollUntil) {
        stopGuard()
        return
      }
      autoScrollRafId = requestAnimationFrame(step)
    }

    if (!autoScrollRafId) {
      autoScrollRafId = requestAnimationFrame(step)
    }
  }

  onUnmounted(stopGuard)

  return {
    isAutoScrolling,
    enableAutoScroll,
    stopAutoScrollGuard: stopGuard
  }
}
