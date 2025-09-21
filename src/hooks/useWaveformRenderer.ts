import { useThrottleFn } from '@vueuse/core'
import type { Ref } from 'vue'

/**
 * 波形颜色配置接口
 */
export type WaveformColors = {
  playedColor: string
  unplayedColor: string
}

/**
 * 波形渲染器返回接口
 */
export type WaveformRendererReturn = {
  // 状态
  waveformData: Ref<number[]>
  waveformCanvas: Ref<HTMLCanvasElement | null>
  waveformWidth: Ref<number>
  scanLinePosition: Ref<number>

  // 缓存管理
  waveformImageCache: Ref<ImageData | null>
  shouldUpdateCache: Ref<boolean>

  // 方法
  generateWaveformData: (audioBuffer: ArrayBuffer | Uint8Array | SharedArrayBuffer) => Promise<void>
  drawWaveform: () => void
  drawWaveformThrottled: () => void
  drawWaveformImmediate: () => void
  updateColors: (colors: WaveformColors) => void

  // 配置
  setDimensions: (width: number, height: number) => void
}

/**
 * 波形可视化渲染Hook
 * @param duration 音频时长（秒）
 * @param playbackProgress 播放进度百分比
 * @param isDragging 是否正在拖拽
 * @param previewTime 预览时间（拖拽时使用）
 * @param getColors 获取颜色配置的函数
 * @returns 波形渲染接口
 */
export const useWaveformRenderer = (
  duration: Ref<number>,
  playbackProgress: Ref<number>,
  isDragging: Ref<boolean>,
  previewTime: Ref<number>,
  getColors: () => WaveformColors
): WaveformRendererReturn => {
  const waveformData = ref<number[]>([])
  const waveformCanvas = ref<HTMLCanvasElement | null>(null)
  const audioContext = ref<AudioContext | null>(null)

  const waveformImageCache = ref<ImageData | null>(null)
  const shouldUpdateCache = ref(true)
  const lastCacheKey = ref('')

  /**
   * 根据音频时长计算波形宽度 (最短10px，最长100px)
   */
  const waveformWidth = computed(() => {
    const dur = duration.value
    const baseWidth = 10 // 基础宽度
    const maxWidth = 100 // 最大宽度
    const pixelsPerSecond = 4 // 每秒对应的像素数

    const calculatedWidth = baseWidth + dur * pixelsPerSecond
    return Math.min(maxWidth, Math.max(baseWidth, calculatedWidth))
  })

  /**
   * 根据宽度计算波形条数 (每2像素一个条)
   */
  const waveformSamples = computed(() => {
    return Math.floor(waveformWidth.value / 2)
  })

  /**
   * 计算扫描线的精确位置 (像素位置)
   */
  const scanLinePosition = computed(() => {
    if (!waveformCanvas.value || waveformData.value.length === 0) return 0

    const canvasWidth = waveformWidth.value

    // 拖拽状态下显示预览位置，否则显示播放进度位置
    if (isDragging.value) {
      const progress = previewTime.value / (duration.value || 1)
      return progress * canvasWidth
    } else {
      const progress = playbackProgress.value / 100
      return progress * canvasWidth
    }
  })

  /**
   * 生成缓存键，用于检测是否需要重新生成缓存
   */
  const generateCacheKey = (colors: WaveformColors) => {
    const playbackState = isDragging.value ? 'dragging' : 'normal'
    return `${colors.playedColor}-${colors.unplayedColor}-${playbackState}-${waveformWidth.value}-${waveformData.value.length}`
  }

  /**
   * 生成音频波形数据
   * @param input 可以是 ArrayBuffer、Uint8Array 或 SharedArrayBuffer
   */
  const generateWaveformData = async (input: ArrayBuffer | Uint8Array | SharedArrayBuffer) => {
    try {
      // 创建 AudioContext
      if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || window.AudioContext)()
      }

      // 确保 arrayBuffer 是 ArrayBuffer 类型
      let arrayBuffer: ArrayBuffer
      if (input instanceof Uint8Array) {
        // 如果 buffer 是 ArrayBuffer，直接使用；否则创建新的 ArrayBuffer
        if (input.buffer instanceof ArrayBuffer) {
          arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
        } else {
          // 如果是 SharedArrayBuffer，转换为 ArrayBuffer
          arrayBuffer = new ArrayBuffer(input.byteLength)
          new Uint8Array(arrayBuffer).set(input)
        }
      } else if (input instanceof ArrayBuffer) {
        arrayBuffer = input
      } else {
        // 如果是 SharedArrayBuffer，转换为 ArrayBuffer
        arrayBuffer = new ArrayBuffer(input.byteLength)
        new Uint8Array(arrayBuffer).set(new Uint8Array(input))
      }

      // 解码音频数据
      const buffer = await audioContext.value.decodeAudioData(arrayBuffer)
      const channelData = buffer.getChannelData(0)
      const samples = waveformSamples.value
      const blockSize = Math.floor(channelData.length / samples)
      const waveform: number[] = []

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize
        const end = start + blockSize
        let sum = 0
        let max = 0

        for (let j = start; j < end && j < channelData.length; j++) {
          const value = Math.abs(channelData[j])
          sum += value
          max = Math.max(max, value)
        }

        const rms = Math.sqrt(sum / blockSize)
        const intensity = Math.min(1, (rms + max) / 2)
        waveform.push(intensity)
      }

      waveformData.value = waveform
      shouldUpdateCache.value = true
      drawWaveform()
    } catch (error) {
      console.error('生成波形数据失败:', error)
      // 生成默认波形
      waveformData.value = Array.from({ length: waveformSamples.value }, () => Math.random() * 0.8 + 0.2)
      shouldUpdateCache.value = true
      drawWaveform()
    }
  }

  /**
   * 绘制波形
   */
  const drawWaveform = () => {
    if (!waveformCanvas.value || waveformData.value.length === 0) return

    const canvas = waveformCanvas.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = waveformWidth.value
    const height = canvas.height
    const barWidth = width / waveformData.value.length

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 获取颜色状态
    const colors = getColors()

    // 检查是否需要更新缓存
    const currentCacheKey = generateCacheKey(colors)
    const needUpdateCache =
      shouldUpdateCache.value || !waveformImageCache.value || lastCacheKey.value !== currentCacheKey

    // 只在需要更新或缓存不存在时才重新生成静态波形
    if (needUpdateCache) {
      // 创建离屏Canvas渲染静态波形
      const offscreenCanvas = new OffscreenCanvas(width, height)
      const offscreenCtx = offscreenCanvas.getContext('2d')

      if (offscreenCtx) {
        waveformData.value.forEach((intensity, index) => {
          const x = index * barWidth
          const barHeight = Math.max(2, intensity * height * 0.8)
          const y = (height - barHeight) / 2

          offscreenCtx.fillStyle = colors.unplayedColor
          offscreenCtx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
        })

        // 缓存静态波形图像
        waveformImageCache.value = offscreenCtx.getImageData(0, 0, width, height)
        lastCacheKey.value = currentCacheKey
        shouldUpdateCache.value = false
      }
    }

    // 绘制缓存的静态波形
    if (waveformImageCache.value) {
      ctx.putImageData(waveformImageCache.value, 0, 0)
    }

    // 根据播放进度绘制已播放部分（动态层）
    const progress = isDragging.value ? previewTime.value / (duration.value || 1) : playbackProgress.value / 100
    const progressX = progress * width

    if (progressX > 0) {
      try {
        const startBarIndex = 0
        const endBarIndex = Math.ceil(progressX / barWidth)

        for (let index = startBarIndex; index < endBarIndex && index < waveformData.value.length; index++) {
          const intensity = waveformData.value[index]
          const x = index * barWidth

          // 只绘制在进度线左侧的部分
          const barRight = x + Math.max(1, barWidth - 1)
          if (barRight <= progressX) {
            const barHeight = Math.max(2, intensity * height * 0.8)
            const y = (height - barHeight) / 2

            ctx.fillStyle = colors.playedColor
            ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
          } else if (x < progressX) {
            // 部分在进度线左侧的柱子
            const barHeight = Math.max(2, intensity * height * 0.8)
            const y = (height - barHeight) / 2
            const clippedWidth = progressX - x

            ctx.fillStyle = colors.playedColor
            ctx.fillRect(x, y, clippedWidth, barHeight)
          }
        }
      } catch (error) {
        console.error('绘制播放进度失败:', error)
      }
    }
  }

  /**
   * 节流版本的波形绘制（用于播放进度更新）
   */
  const drawWaveformThrottled = useThrottleFn(() => {
    if (!isDragging.value) {
      drawWaveform()
    }
  }, 16)

  /**
   * 立即绘制波形（用于拖拽时的实时响应）
   */
  const drawWaveformImmediate = () => {
    drawWaveform()
  }

  /**
   * 更新颜色配置并重绘
   * @param colors 新的颜色配置
   */
  const updateColors = (_colors: WaveformColors) => {
    shouldUpdateCache.value = true
    drawWaveform()
  }

  /**
   * 设置Canvas尺寸
   * @param width 宽度
   * @param height 高度
   */
  const setDimensions = (width: number, height: number) => {
    if (waveformCanvas.value) {
      waveformCanvas.value.width = width
      waveformCanvas.value.height = height
      shouldUpdateCache.value = true
      drawWaveform()
    }
  }

  // 监听播放进度变化重绘波形（节流处理）
  watch(playbackProgress, () => {
    drawWaveformThrottled()
  })

  // 监听拖拽状态变化重绘波形
  watch(isDragging, () => {
    shouldUpdateCache.value = true
    drawWaveform()
  })

  // 监听波形数据变化
  watch(waveformData, () => {
    shouldUpdateCache.value = true
    drawWaveform()
  })

  // 监听尺寸变化
  watch(waveformWidth, () => {
    shouldUpdateCache.value = true
    if (waveformCanvas.value) {
      waveformCanvas.value.width = waveformWidth.value
      drawWaveform()
    }
  })

  return {
    // 状态
    waveformData,
    waveformCanvas,
    waveformWidth,
    scanLinePosition,

    // 缓存管理
    waveformImageCache,
    shouldUpdateCache,

    // 方法
    generateWaveformData,
    drawWaveform,
    drawWaveformThrottled,
    drawWaveformImmediate,
    updateColors,

    // 配置
    setDimensions
  }
}
