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
import { join } from '@tauri-apps/api/path'
import { BaseDirectory, create, exists, mkdir, readFile } from '@tauri-apps/plugin-fs'
import { storeToRefs } from 'pinia'
import { ThemeEnum } from '@/enums'
import type { FilesMeta, VoiceBody } from '@/services/types'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { audioManager } from '@/utils/AudioManager'
import { getFilesMeta, getImageCache } from '@/utils/PathUtil'
import { isMac } from '@/utils/PlatformConstants'

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
const isMacOS = ref(false)

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

/**
 * 检查音频格式支持
 */
const checkAudioSupport = (mimeType: string): string => {
  const audio = document.createElement('audio')
  const support = audio.canPlayType(mimeType)
  return support
}

/**
 * 生成音频波形数据
 * @param input 可以是 ArrayBuffer 或 Uint8Array
 */
const generateWaveformData = async (input: ArrayBuffer | Uint8Array | SharedArrayBuffer) => {
  try {
    // 创建 AudioContext
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || window.AudioContext)()
    }

    // 如果是 Uint8Array，先取出其 buffer
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
    drawWaveform()
  } catch (error) {
    console.error('生成波形数据失败:', error)
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

/**
 * 尝试从本地缓存中读取音频文件。
 *
 * @param fileName 音频文件名（如 voice_1234.mp3）
 * @returns 包含文件 buffer、完整路径、缓存路径和是否存在标志的对象
 */
const getLocalAudioFile = async (fileName: string) => {
  const audioFolder = 'audio'
  // 拼接缓存路径（如 cache\46022457888256\audio）
  const cachePath = getImageCache(audioFolder, userStore.userInfo!.uid as string)
  const fullPath = await join(cachePath, fileName)

  // 检查文件是否存在于本地缓存文件夹中
  const fileExists = await exists(fullPath, { baseDir: BaseDirectory.AppCache })
  if (!fileExists) {
    console.log('找不到该音频文件，即将使用在线资源')
    return {
      cachePath,
      fullPath,
      fileBuffer: new ArrayBuffer(),
      fileExists
    }
  }

  // 读取音频文件内容
  const fileBuffer = await readFile(fullPath, { baseDir: BaseDirectory.AppCache })

  // 如果是 Uint8Array，手动转成ArrayBuffer
  const arrayBuffer =
    fileBuffer instanceof Uint8Array
      ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
      : fileBuffer

  return {
    fileBuffer: arrayBuffer,
    cachePath,
    fullPath,
    fileExists
  }
}

/**
 * 加载音频波形数据并绘制波形。
 *
 * 优先尝试从本地缓存中读取音频文件，若不存在则从远程 URL 下载，
 * 并保存到本地缓存中以供后续使用。支持错误回退生成默认波形。
 */
const loadAudioWaveform = async () => {
  /**
   * 从远程下载音频文件并保存到本地缓存目录。
   *
   * @param cachePath 要保存的目录路径
   * @param fileName 要保存的文件名
   * @returns 下载的 ArrayBuffer 数据
   */
  const fetchAndDownloadAudioFile = async (cachePath: string, fileName: string) => {
    const response = await fetch(props.body.url)
    const arrayBuffer = await response.arrayBuffer()
    const dirExists = await exists(cachePath, { baseDir: BaseDirectory.AppCache })

    // 若目录不存在，则创建缓存目录
    if (!dirExists) {
      await mkdir(cachePath, { baseDir: BaseDirectory.AppCache, recursive: true })
    }

    // 拼接完整路径并保存文件
    const fullPath = await join(cachePath, fileName)
    const file = await create(fullPath, { baseDir: BaseDirectory.AppCache })
    await file.write(new Uint8Array(arrayBuffer))
    await file.close()

    return arrayBuffer
  }

  try {
    // 从url中提取文件基本信息
    const [fileMeta] = await getFilesMeta<FilesMeta>([props.body.url])

    // 尝试获取本地音频文件
    const localAudioFile = await getLocalAudioFile(fileMeta.name)

    // 判断本地音频文件是否存在
    if (localAudioFile.fileExists) {
      // 本地音频存在，则读取它的Buffer格式为Uint8Array<ArrayBufferLike>
      await generateWaveformData(localAudioFile.fileBuffer as ArrayBuffer)
    } else {
      // 本地音频不存在，读取在线资源文件，格式为Uint8Array<ArrayBufferLike>
      const arrayBuffer = await fetchAndDownloadAudioFile(localAudioFile.cachePath, fileMeta.name)
      await generateWaveformData(arrayBuffer)
      // console.log('获取音频buffer', response.url, arrayBuffer)
    }
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

const existsAudioFile = async (): Promise<{
  exists: boolean
  fullPath: string
  fileMeta: {
    name: string
    path: string
    file_type: string
    mime_type: string
    exists: boolean
  }
}> => {
  const [fileMeta] = await getFilesMeta<FilesMeta>([props.body.url])
  const audioFolder = 'audio'
  const cachePath = getImageCache(audioFolder, userStore.userInfo!.uid as string)
  const fullPath = await join(cachePath, fileMeta.name)

  const fileExists = await exists(fullPath, { baseDir: BaseDirectory.AppCache })
  console.log('文件是否存在本地：', fileExists, fullPath)
  return {
    exists: fileExists,
    fullPath: fullPath,
    fileMeta: fileMeta
  }
}

// 创建音频元素
const createAudioElement = async () => {
  if (audioElement.value) return

  const existsData = await existsAudioFile()

  let playableUrl = props.body.url // 默认使用远程地址

  if (existsData.exists) {
    console.log('找到音频文件：', existsData)
    const fileData = await getLocalAudioFile(existsData.fileMeta.name)

    // Mac系统优化：设置正确的MIME类型
    const mimeType = existsData.fileMeta.mime_type || 'audio/mpeg'

    // 检查音频格式支持(mac)
    const support = checkAudioSupport(mimeType)
    if (!support && isMacOS.value) {
      console.warn(`Mac系统可能不支持此音频格式: ${mimeType}`)
      // 降级到远程URL
      playableUrl = props.body.url
    } else {
      // 确保 fileBuffer 是 ArrayBuffer 类型
      let arrayBuffer: ArrayBuffer
      if (fileData.fileBuffer instanceof ArrayBuffer) {
        arrayBuffer = fileData.fileBuffer
      } else {
        arrayBuffer = new ArrayBuffer((fileData.fileBuffer as any).byteLength)
        new Uint8Array(arrayBuffer).set(new Uint8Array(fileData.fileBuffer as any))
      }
      playableUrl = URL.createObjectURL(new Blob([new Uint8Array(arrayBuffer)], { type: mimeType }))
    }
  }

  console.log('完成后的路径：', playableUrl)

  audioElement.value = new Audio(playableUrl)

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
    await createAudioElement()

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
onMounted(async () => {
  isMacOS.value = isMac()
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
