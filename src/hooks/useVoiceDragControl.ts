import { useThrottleFn } from '@vueuse/core'
import type { Ref } from 'vue'
import { isMobile } from '@/utils/PlatformConstants'

/**
 * 拖拽控制器返回接口
 */
export type VoiceDragControlReturn = {
  // 状态
  isDragging: Ref<boolean>
  previewTime: Ref<number>
  showTimePreview: Ref<boolean>

  // 内部状态（用于调试和监控）
  dragStartX: Ref<number>
  wasPlayingBeforeDrag: Ref<boolean>

  // 方法
  handleDragStart: (event: MouseEvent | TouchEvent) => void
  calculateTimeFromPosition: (clientX: number) => number
  cleanup: () => void

  // 事件绑定
  bindDragEvents: (canvasElement: HTMLCanvasElement) => void
}

/**
 * 语音拖拽交互处理Hook
 * @param canvasElement Canvas元素引用
 * @param duration 音频时长
 * @param isPlaying 播放状态
 * @param onDragSeek 拖拽跳转回调
 * @param onPlayToggle 播放切换回调
 * @returns 拖拽控制接口
 */
export const useVoiceDragControl = (
  canvasElement: Ref<HTMLCanvasElement | null>,
  duration: Ref<number>,
  isPlaying: Ref<boolean>,
  onDragSeek: (time: number) => void,
  onPlayToggle: (shouldPlay: boolean) => Promise<void>
): VoiceDragControlReturn => {
  const isDragging = ref(false)
  const previewTime = ref(0)
  const showTimePreview = ref(false)
  const dragStartX = ref(0)
  const wasPlayingBeforeDrag = ref(false)

  const dragThreshold = 5 // 拖拽触发的最小移动距离（像素）
  const isMobileDevice = isMobile()

  /**
   * 增强的边界处理
   */
  const enhancedClampTime = (time: number) => {
    if (!Number.isFinite(time) || isNaN(time)) {
      return 0
    }

    const maxTime = Math.max(0, duration.value || 0)
    return Math.max(0, Math.min(maxTime, time))
  }

  /**
   * 恢复移动端页面状态
   */
  const restoreMobilePageState = () => {
    if (isMobileDevice) {
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10)

      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''

      // 恢复滚动位置
      window.scrollTo(0, scrollY)

      // 清理数据属性
      delete document.body.dataset.scrollY
    }
  }

  /**
   * 位置计算算法
   * @param clientX 鼠标/触摸点的X坐标
   * @returns 对应的时间（秒）
   */
  const calculateTimeFromPosition = (clientX: number): number => {
    if (!canvasElement.value) return 0

    const rect = canvasElement.value.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const progress = Math.max(0, Math.min(1, relativeX / rect.width))
    return progress * duration.value
  }

  /**
   * 处理拖拽开始
   * @param event 鼠标或触摸事件
   */
  const handleDragStart = (event: MouseEvent | TouchEvent) => {
    if (!canvasElement.value) return

    try {
      event.preventDefault()
      event.stopPropagation()

      // 移动端防止页面滚动
      if (isMobileDevice) {
        const currentScrollY = window.scrollY

        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.top = `-${currentScrollY}px`
        document.body.style.width = '100%'

        // 保存滚动位置以便恢复
        document.body.dataset.scrollY = currentScrollY.toString()
      }

      // 获取开始位置
      const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
      if (clientX === undefined) {
        return
      }

      dragStartX.value = clientX

      // 保存拖拽前的播放状态
      wasPlayingBeforeDrag.value = isPlaying.value

      // 绑定移动和结束事件
      if (isMobileDevice || 'ontouchstart' in window) {
        document.addEventListener('touchmove', handleDragMove, { passive: false })
        document.addEventListener('touchend', handleDragEnd, { passive: false })
        document.addEventListener('touchcancel', handleDragEnd, { passive: false })
      } else {
        document.addEventListener('mousemove', handleDragMove)
        document.addEventListener('mouseup', handleDragEnd)
        document.addEventListener('mouseleave', handleDragEnd)
      }
    } catch (error) {
      console.error('拖拽开始处理错误:', error)
      // 错误时恢复页面状态
      restoreMobilePageState()
    }
  }

  /**
   * 处理拖拽移动（节流处理）
   */
  const handleDragMove = useThrottleFn((event: MouseEvent | TouchEvent) => {
    try {
      if (!isDragging.value) {
        // 检查是否超过拖拽阈值
        const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
        if (clientX === undefined) {
          console.warn('无法获取移动位置')
          return
        }

        const moveDistance = Math.abs(clientX - dragStartX.value)

        if (moveDistance >= dragThreshold) {
          // 开始拖拽
          isDragging.value = true
          showTimePreview.value = true

          // 暂停播放（如果正在播放）
          if (isPlaying.value) {
            try {
              onPlayToggle(false)
            } catch (pauseError) {
              console.warn('暂停播放失败:', pauseError)
            }
          }
        } else {
          return
        }
      }

      // 防止页面滚动（移动端）
      event.preventDefault()

      // 计算当前位置
      const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
      if (clientX === undefined) {
        console.warn('无法获取拖拽位置')
        return
      }

      const targetTime = calculateTimeFromPosition(clientX)
      previewTime.value = enhancedClampTime(targetTime)
    } catch (error) {
      console.error('拖拽移动处理错误:', error)
      // 错误时结束拖拽
      handleDragEnd()
    }
  }, 16)

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = () => {
    try {
      restoreMobilePageState()

      // 清理全局事件监听器
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('mouseleave', handleDragEnd)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchend', handleDragEnd)
      document.removeEventListener('touchcancel', handleDragEnd)

      if (isDragging.value) {
        try {
          const clampedTime = enhancedClampTime(previewTime.value)

          // 通知外部进行跳转
          onDragSeek(clampedTime)

          // 如果拖拽前在播放，则恢复播放
          if (wasPlayingBeforeDrag.value) {
            onPlayToggle(true).catch((playError) => {
              console.error('恢复播放失败:', playError)
            })
          }
        } catch (seekError) {
          console.error('设置播放位置失败:', seekError)
        }
      }
    } catch (error) {
      console.error('拖拽结束处理错误:', error)
      // 确保在错误情况下也能恢复页面状态
      restoreMobilePageState()
    } finally {
      // 始终重置拖拽状态
      isDragging.value = false
      showTimePreview.value = false
      wasPlayingBeforeDrag.value = false
      dragStartX.value = 0
      previewTime.value = 0
    }
  }

  /**
   * 绑定Canvas元素的拖拽事件
   * @param canvas Canvas元素
   */
  const bindDragEvents = (canvas: HTMLCanvasElement) => {
    canvas.addEventListener('mousedown', handleDragStart)
    canvas.addEventListener('touchstart', handleDragStart)
  }

  /**
   * 清理资源和事件监听器
   */
  const cleanup = () => {
    // 清理全局事件监听器
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('mouseleave', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)
    document.removeEventListener('touchcancel', handleDragEnd)

    // 恢复页面状态
    restoreMobilePageState()

    // 重置状态
    isDragging.value = false
    showTimePreview.value = false
    wasPlayingBeforeDrag.value = false
    dragStartX.value = 0
    previewTime.value = 0
  }

  return {
    // 状态
    isDragging,
    previewTime,
    showTimePreview,

    // 内部状态
    dragStartX,
    wasPlayingBeforeDrag,

    // 方法
    handleDragStart,
    calculateTimeFromPosition,
    cleanup,

    // 事件绑定
    bindDragEvents
  }
}
