import type { ComputedRef, Ref } from 'vue'

type OverlayControllerOptions = {
  /** 是否为首次登录（需要阻塞首屏） */
  isInitialSync: ComputedRef<boolean>
  /** 进度条数值（会被本工具在就绪时自动置为 100） */
  progress: Ref<number>
  /** 异步子模块总数，默认 3 */
  asyncTotal?: number
  /** 最小展示时长，默认 600ms */
  minDisplayMs?: number
}

/**
 * 控制首次登录的遮罩与 LoadingSpinner：
 * - 只有 isInitialSync 为 true 时才显示遮罩
 * - 等待异步子模块全部加载完毕后，将进度置为 100%，再等待 minDisplayMs 后隐藏
 * - 非首次登录直接不显示遮罩
 */
export const useOverlayController = (options: OverlayControllerOptions) => {
  const asyncTarget = options.asyncTotal ?? 3
  const minDisplayMs = options.minDisplayMs ?? 600

  // 是否已经触发过“首次登录遮罩”逻辑。一旦触发，直到流程结束才会隐藏。
  const activated = ref(options.isInitialSync.value)
  const overlayVisible = ref(activated.value)
  const asyncLoadedCount = ref(0)
  const asyncComponentsReady = computed(() => asyncLoadedCount.value >= asyncTarget)

  let hideTimer: number | null = null

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimer = window.setTimeout(() => {
      overlayVisible.value = false
      hideTimer = null
    }, minDisplayMs)
  }

  const evaluateOverlay = () => {
    // 未触发首次登录遮罩：直接隐藏
    if (!activated.value) {
      overlayVisible.value = false
      clearHideTimer()
      return
    }

    // 首次登录：保持显示，等待异步全部就绪
    overlayVisible.value = true
    if (!asyncComponentsReady.value) {
      clearHideTimer()
      return
    }

    // 异步全部就绪，将进度置为 100%，再等待最小展示时长后隐藏
    if (options.progress.value < 100) {
      options.progress.value = 100
    }
    scheduleHide()
  }

  // 仅当 isInitialSync 首次为 true 时激活遮罩，之后不再因 isInitialSync 变 false 而提前隐藏
  watch(
    options.isInitialSync,
    (val) => {
      if (val) {
        activated.value = true
        overlayVisible.value = true
        clearHideTimer()
      }
      evaluateOverlay()
    },
    { immediate: true }
  )

  watch(asyncComponentsReady, evaluateOverlay)

  const markAsyncLoaded = () => {
    asyncLoadedCount.value = Math.min(asyncLoadedCount.value + 1, asyncTarget)
    evaluateOverlay()
  }

  const resetOverlay = () => {
    asyncLoadedCount.value = 0
    activated.value = options.isInitialSync.value
    overlayVisible.value = activated.value
    clearHideTimer()
  }

  return {
    overlayVisible,
    asyncComponentsReady,
    markAsyncLoaded,
    resetOverlay
  }
}
