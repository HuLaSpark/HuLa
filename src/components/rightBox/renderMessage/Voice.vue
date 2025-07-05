<template>
  <div
    class="voice-container select-none cursor-pointer"
    :class="{ playing: isPlaying, loading: loading }"
    @click="togglePlayback">
    <!-- 语音图标 -->
    <div class="voice-icon select-none cursor-pointer">
      <img
        v-if="loading"
        class="loading-icon"
        :style="{ color: voiceIconColor }"
        src="@/assets/img/loading.svg"
        alt="loading" />
      <svg v-else-if="isPlaying" :style="{ color: voiceIconColor }">
        <use href="#pause-one"></use>
      </svg>
      <svg v-else :style="{ color: voiceIconColor }">
        <use href="#play"></use>
      </svg>
    </div>

    <!-- 音浪波形 -->
    <div class="waveform-container select-none cursor-pointer" :style="{ width: `${waveformWidth}px` }">
      <canvas
        ref="waveformCanvas"
        class="waveform-canvas"
        :style="{ color: voiceIconColor }"
        :width="waveformWidth"
        height="24"
        @click.stop="seekToPosition"></canvas>
      <div
        class="scan-line"
        :class="{ active: isPlaying }"
        :style="{
          left: `${scanLinePosition}px`,
          background: `linear-gradient(to bottom, transparent, ${voiceIconColor}, transparent)`,
          boxShadow: isPlaying ? `0 0 8px ${voiceIconColor}50` : 'none'
        }"></div>
    </div>

    <!-- 语音时长 -->
    <div class="voice-second select-none cursor-pointer" :style="{ color: voiceIconColor }">
      <span>{{ formatTime(second) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { audioManager } from '@/utils/AudioManager'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { ThemeEnum } from '@/enums'
import { storeToRefs } from 'pinia'
import { VoiceBody } from '@/services/types'

const props = defineProps<{
  body: VoiceBody
  fromUser?: {
    uid: string
  }
}>()

// 获取主题和用户信息
const settingStore = useSettingStore()
const userStore = useUserStore()
const { themes } = storeToRefs(settingStore)

// 使用messageId作为音频ID，确保唯一性
const audioId = ref(props.body.url)

// 播放状态
const isPlaying = ref(false)
const loading = ref(false)
const currentTime = ref(0)
const playbackProgress = ref(0)
const audioElement = ref<HTMLAudioElement | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)
const waveformData = ref<number[]>([])
const audioContext = ref<AudioContext | null>(null)

// 判断是否为深色模式
const isDarkMode = computed(() => {
  return themes.value.content === ThemeEnum.DARK
})

// 判断是否为当前用户发送的消息
const isCurrentUser = computed(() => {
  return props.fromUser?.uid === userStore.userInfo?.uid
})

// 计算语音图标颜色
const voiceIconColor = computed(() => {
  if (isCurrentUser.value) {
    return '#fff'
  } else {
    return isDarkMode.value ? '#fff' : '#000'
  }
})

// 计算属性
const second = computed(() => props.body.second || 0)

// 根据音频时长计算波形宽度 (最短10px，最长100px)
const waveformWidth = computed(() => {
  const duration = second.value
  const baseWidth = 10 // 基础宽度
  const maxWidth = 100 // 最大宽度
  const pixelsPerSecond = 4 // 每秒对应的像素数

  const calculatedWidth = baseWidth + duration * pixelsPerSecond
  return Math.min(maxWidth, Math.max(baseWidth, calculatedWidth))
})

// 根据宽度计算波形条数 (每2像素一个条)
const waveformSamples = computed(() => {
  return Math.floor(waveformWidth.value / 2)
})

// 计算扫描线的精确位置 (像素位置) - 显示当前播放进度位置
const scanLinePosition = computed(() => {
  if (!waveformCanvas.value || waveformData.value.length === 0) return 0

  const progress = playbackProgress.value / 100
  const canvasWidth = waveformWidth.value

  // 扫描线直接按播放进度比例显示
  return progress * canvasWidth
})

// 监听播放进度变化重绘波形
watch(playbackProgress, () => {
  drawWaveform()
})

// 监听主题变化重绘波形
watch(isDarkMode, () => {
  drawWaveform()
})

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 生成音频波形数据
const generateWaveformData = async (audioBuffer: ArrayBuffer) => {
  try {
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || window.AudioContext)()
    }

    const buffer = await audioContext.value.decodeAudioData(audioBuffer.slice(0))
    const channelData = buffer.getChannelData(0)
    const samples = waveformSamples.value // 根据音频时长计算的波形条数
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

      // 使用RMS和峰值的组合来获得更好的视觉效果
      const rms = Math.sqrt(sum / blockSize)
      const intensity = Math.min(1, (rms + max) / 2)
      waveform.push(intensity)
    }

    waveformData.value = waveform
    drawWaveform()
  } catch (error) {
    console.error('生成波形数据失败:', error)
    // 生成默认波形数据
    waveformData.value = Array.from({ length: waveformSamples.value }, () => Math.random() * 0.8 + 0.2)
    drawWaveform()
  }
}

// 绘制波形
const drawWaveform = () => {
  if (!waveformCanvas.value || waveformData.value.length === 0) return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = waveformWidth.value // 使用计算出的宽度保持一致
  const height = canvas.height
  const barWidth = width / waveformData.value.length

  // 清除画布 - 使用canvas实际尺寸
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 设置样式 - 根据是否是当前用户发送的消息和深色模式来设置颜色
  const playedColor = isCurrentUser.value ? '#fff' : isDarkMode.value ? '#fff' : '#000' // 已播放部分颜色
  const unplayedColor = isPlaying.value
    ? isCurrentUser.value
      ? '#ffffff80' // 当前用户播放时：半透明白色
      : isDarkMode.value
        ? '#ffffff80' // 其他用户深色模式播放时：半透明白色
        : '#00000080' // 其他用户浅色模式播放时：半透明黑色
    : isCurrentUser.value
      ? '#fff' // 当前用户未播放时：白色
      : isDarkMode.value
        ? '#fff' // 其他用户深色模式未播放时：白色
        : '#000' // 其他用户浅色模式未播放时：黑色

  waveformData.value.forEach((intensity, index) => {
    const x = index * barWidth
    const barHeight = Math.max(2, intensity * height * 0.8)
    const y = (height - barHeight) / 2

    // 根据播放进度决定颜色 - 扫描线到达波形条左边界时变色
    const progress = playbackProgress.value / 100
    const progressX = progress * width

    ctx.fillStyle = x < progressX ? playedColor : unplayedColor
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
  })
}

// 获取音频文件并生成波形
const loadAudioWaveform = async () => {
  try {
    const response = await fetch(props.body.url)
    const arrayBuffer = await response.arrayBuffer()
    await generateWaveformData(arrayBuffer)
  } catch (error) {
    console.error('加载音频波形失败:', error)
    // 生成默认波形
    waveformData.value = Array.from({ length: waveformSamples.value }, () => Math.random() * 0.8 + 0.2)
    drawWaveform()
  }
}

// 点击波形跳转到指定位置
const seekToPosition = (event: MouseEvent) => {
  if (!audioElement.value || !waveformCanvas.value) return

  const rect = waveformCanvas.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const progress = clickX / rect.width
  const targetTime = progress * audioElement.value.duration

  if (!isNaN(targetTime)) {
    audioElement.value.currentTime = targetTime
  }
}

// 创建音频元素
const createAudioElement = () => {
  if (audioElement.value) return

  audioElement.value = new Audio(props.body.url)

  // 设置事件监听
  audioElement.value.addEventListener('loadstart', () => {
    loading.value = true
  })

  audioElement.value.addEventListener('canplay', () => {
    loading.value = false
  })

  audioElement.value.addEventListener('timeupdate', () => {
    if (audioElement.value) {
      currentTime.value = audioElement.value.currentTime
      const progress = (audioElement.value.currentTime / audioElement.value.duration) * 100
      playbackProgress.value = progress || 0
      // 重绘波形以显示播放进度
      drawWaveform()
    }
  })

  audioElement.value.addEventListener('ended', () => {
    isPlaying.value = false
    currentTime.value = 0
    playbackProgress.value = 0
    drawWaveform()
  })

  audioElement.value.addEventListener('error', () => {
    loading.value = false
    isPlaying.value = false
  })
}

// 切换播放状态
const togglePlayback = async () => {
  if (loading.value) return

  try {
    // 如果当前是播放状态，则暂停
    if (isPlaying.value) {
      audioManager.pause()
      isPlaying.value = false
      return
    }

    // 重新初始化音频元素（清理旧的音频元素）
    if (audioElement.value) {
      try {
        audioElement.value.pause()
        audioElement.value.src = ''
        audioElement.value.removeEventListener('loadstart', () => {})
        audioElement.value.removeEventListener('canplay', () => {})
        audioElement.value.removeEventListener('timeupdate', () => {})
        audioElement.value.removeEventListener('ended', () => {})
        audioElement.value.removeEventListener('error', () => {})
      } catch (error) {
        console.warn('清理旧音频元素时出现错误:', error)
      }
      audioElement.value = null
    }

    // 重置播放状态
    currentTime.value = 0
    playbackProgress.value = 0
    drawWaveform()

    // 创建新的音频元素
    createAudioElement()

    if (!audioElement.value) return

    await audioManager.play(audioElement.value, audioId.value)
    isPlaying.value = true
  } catch (error) {
    isPlaying.value = false
    loading.value = false
  }
}

// 音频状态变化监听器
const handleAudioStateChange = () => {
  const currentId = audioManager.getCurrentAudioId()
  // 如果当前播放的不是本组件的音频，则重置播放状态
  if (currentId !== audioId.value && isPlaying.value) {
    isPlaying.value = false
    playbackProgress.value = 0
    currentTime.value = 0
    drawWaveform()
  }
}

// 组件挂载时加载波形并添加监听器
onMounted(() => {
  loadAudioWaveform()
  audioManager.addListener(handleAudioStateChange)
})

// 清理资源
onUnmounted(() => {
  // 移除音频管理器监听器
  audioManager.removeListener(handleAudioStateChange)

  // 清理音频元素
  if (audioElement.value) {
    try {
      audioElement.value.pause()
      audioElement.value.src = ''
      audioElement.value.removeEventListener('loadstart', () => {})
      audioElement.value.removeEventListener('canplay', () => {})
      audioElement.value.removeEventListener('timeupdate', () => {})
      audioElement.value.removeEventListener('ended', () => {})
      audioElement.value.removeEventListener('error', () => {})
    } catch (error) {
      console.warn('清理音频元素时出现错误:', error)
    } finally {
      audioElement.value = null
    }
  }

  // 清理音频上下文
  if (audioContext.value) {
    try {
      audioContext.value.close()
    } catch (error) {
      console.warn('关闭音频上下文时出现错误:', error)
    } finally {
      audioContext.value = null
    }
  }
})
</script>

<style scoped lang="scss">
.voice-container {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  &.loading {
    cursor: wait;
    opacity: 0.7;
  }
}

.voice-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color, #333);

  svg {
    width: 18px;
    height: 18px;

    &.loading-icon {
      animation: spin 1s linear infinite;
    }
  }
}

.waveform-container {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;

  .waveform-canvas {
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }

  .scan-line {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    border-radius: 1px;
    opacity: 0;
    transition: all 0.1s ease;
    pointer-events: none;
    z-index: 1;

    &.active {
      opacity: 0.8;
    }
  }
}

.voice-second {
  @apply: text-(12px #fff) whitespace-nowrap;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
