<template>
  <div class="size-full bg-#000 relative flex flex-col select-none">
    <!-- 顶部操作栏 -->
    <ActionBar class="bg-#000 z-9999" :shrink="false" :current-label="currentLabel" />

    <!-- 主体内容区域 -->
    <div class="flex-1 overflow-auto">
      <!-- 视频展示区域 -->
      <div style="min-height: calc(100vh / var(--page-scale, 1) - 124px)" class="flex-center w-full h-full">
        <video
          ref="videoRef"
          :src="currentVideo"
          controls
          :class="videoClass"
          :style="videoStyle"
          @loadeddata="onVideoLoaded"
          @ended="onVideoEnded"
          @pause="onVideoPaused"
          @play="onVideoPlay"
          alt="preview" />

        <!-- 提示文本 -->
        <transition name="viewer-tip">
          <div
            v-if="showTip"
            class="fixed z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 px-24px py-12px rounded-8px text-(white 14px) transition-all duration-300 backdrop-blur-sm select-none flex items-center gap-8px">
            <svg class="size-16px"><use href="#info"></use></svg>
            {{ tipText }}
          </div>
        </transition>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div data-tauri-drag-region class="z-9999 h-50px bg-#000 flex justify-center items-center gap-20px">
      <!-- 上一个视频 -->
      <n-tooltip placement="top">
        <template #trigger>
          <div
            @click="previousVideo"
            class="bottom-operation"
            :class="canGoPrevious ? 'cursor-pointer hover:bg-gray-600/50' : 'cursor-not-allowed'">
            <svg
              class="size-20px rotate-180"
              :class="canGoPrevious ? 'color-white' : 'color-gray-500 cursor-not-allowed'">
              <use href="#right"></use>
            </svg>
          </div>
        </template>
        {{ t('message.video_viewer.previous_video') }}
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <div @click="playPause" class="bottom-operation">
            <svg class="size-20px color-white">
              <use :href="isPlaying ? '#pause-one' : '#play'"></use>
            </svg>
          </div>
        </template>
        {{ isPlaying ? t('message.video_viewer.pause') : t('message.video_viewer.play') }}
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <div @click="muteUnmute" class="bottom-operation">
            <svg class="size-20px color-white">
              <use :href="isMuted ? '#volume-mute' : '#volume-notice'"></use>
            </svg>
          </div>
        </template>
        {{ isMuted ? t('message.video_viewer.unmute') : t('message.video_viewer.mute') }}
      </n-tooltip>

      <!-- 下一个视频 -->
      <n-tooltip placement="top">
        <template #trigger>
          <div @click="nextVideo" class="bottom-operation">
            <svg class="size-20px" :class="canGoNext ? 'color-white' : 'color-gray-500 cursor-not-allowed'">
              <use href="#right"></use>
            </svg>
          </div>
        </template>
        {{ t('message.video_viewer.next_video') }}
      </n-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { convertFileSrc } from '@tauri-apps/api/core'
import { dirname, join } from '@tauri-apps/api/path'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { readDir } from '@tauri-apps/plugin-fs'
import ActionBar from '@/components/windows/ActionBar.vue'
import { useTauriListener } from '@/hooks/useTauriListener'
import { useVideoViewer } from '@/stores/videoViewer.ts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { addListener } = useTauriListener()
const videoViewerStore = useVideoViewer()
const appWindow = WebviewWindow.getCurrent()
// 支持的视频文件扩展名
const supportedVideoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v']

// 初始化数据
const videoList = ref<string[]>([])

const currentLabel = WebviewWindow.getCurrent().label
const currentIndex = ref(0)
const isPlaying = ref(false)
const isMuted = ref(false)
const videoRef = ref<HTMLVideoElement>()
const showTip = ref(false)
const tipText = ref('')
const videoWidth = ref(0)
const videoHeight = ref(0)

// 当前显示的视频URL（统一使用列表模式）
const currentVideo = computed(() => {
  const videoUrl = videoList.value[currentIndex.value] || ''

  // 如果是本地文件路径，使用 Tauri 的 convertFileSrc 来转换
  if (videoUrl && !videoUrl.startsWith('http')) {
    return convertFileSrc(videoUrl)
  }
  return videoUrl
})

// 视频样式类
const videoClass = computed(() => 'w-full h-full object-contain')

const videoStyle = computed(() => {
  const style: Record<string, string> = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  }
  if (videoWidth.value > 0 && videoHeight.value > 0) {
    style.width = `${videoWidth.value}px`
    style.height = `${videoHeight.value}px`
  }
  return style
})

// 是否可以切换到上一个视频
const canGoPrevious = computed(() => {
  if (videoList.value.length <= 1) return false

  const currentVideoPath = videoList.value[currentIndex.value]
  if (!currentVideoPath || currentVideoPath.startsWith('http')) {
    // 网络视频：检查是否不是第一个
    return currentIndex.value > 0
  }

  // 本地视频：总是返回true，具体判断在点击时进行
  return true
})

// 是否可以切换到下一个视频
const canGoNext = computed(() => {
  if (videoList.value.length <= 1) return false

  const currentVideoPath = videoList.value[currentIndex.value]
  if (!currentVideoPath || currentVideoPath.startsWith('http')) {
    // 网络视频：检查是否不是最后一个
    return currentIndex.value < videoList.value.length - 1
  }

  // 本地视频：总是返回true，具体判断在点击时进行
  return true
})

// 检查文件是否为视频文件
const isVideoFile = (filename: string) => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return supportedVideoExtensions.includes(ext)
}

// 获取当前视频所在文件夹的所有视频文件
const getVideosFromCurrentFolder = async (currentVideoPath: string) => {
  try {
    if (!currentVideoPath || currentVideoPath.startsWith('http')) {
      return []
    }

    const folderPath = await dirname(currentVideoPath)

    // 使用绝对路径读取目录
    const entries = await readDir(folderPath)

    const videoFiles = await Promise.all(
      entries
        .filter((entry) => entry.isFile && isVideoFile(entry.name))
        .map(async (entry) => await join(folderPath, entry.name))
    )

    return videoFiles.sort() // 按文件名排序
  } catch (error) {
    console.warn('获取文件夹视频文件失败:', error)
    return []
  }
}

// 播放/暂停视频
const playPause = () => {
  if (videoRef.value) {
    if (videoRef.value.paused) {
      videoRef.value
        .play()
        .then(() => {
          isPlaying.value = true
        })
        .catch((error) => {
          console.warn('视频播放失败:', error)
          isPlaying.value = false
        })
    } else {
      videoRef.value.pause()
      isPlaying.value = false
    }
  }
}

// 静音/取消静音
const muteUnmute = () => {
  if (videoRef.value) {
    videoRef.value.muted = !videoRef.value.muted
    isMuted.value = videoRef.value.muted
  }
}

// 自动播放视频
const onVideoLoaded = () => {
  if (videoRef.value) {
    // 获取视频原始尺寸
    videoWidth.value = videoRef.value.videoWidth
    videoHeight.value = videoRef.value.videoHeight

    videoRef.value
      .play()
      .then(() => {
        isPlaying.value = true
      })
      .catch((error) => {
        console.warn('自动播放失败，可能需要用户交互:', error)
        isPlaying.value = false
      })
  }
}

// 视频播放结束事件
const onVideoEnded = () => {
  isPlaying.value = false
  // 播放结束不自动切下一条
  if (videoRef.value) {
    videoRef.value.currentTime = videoRef.value.duration
  }
}

// 视频暂停事件
const onVideoPaused = () => {
  isPlaying.value = false
}

// 视频播放事件
const onVideoPlay = () => {
  isPlaying.value = true
}

// 切换到上一个视频
const previousVideo = async () => {
  if (!canGoPrevious.value) return

  const currentVideoPath = videoList.value[currentIndex.value]
  if (!currentVideoPath || currentVideoPath.startsWith('http')) {
    // 如果是网络视频，使用原有逻辑
    currentIndex.value--
    showVideoTip(t('message.video_viewer.tip_playing_index', { index: currentIndex.value + 1 }))
  } else {
    // 如果是本地视频，从文件夹获取视频列表
    const folderVideos = await getVideosFromCurrentFolder(currentVideoPath)
    if (folderVideos.length > 0) {
      const currentVideoIndex = folderVideos.indexOf(currentVideoPath)
      if (currentVideoIndex > 0) {
        const previousVideoPath = folderVideos[currentVideoIndex - 1]
        videoList.value[currentIndex.value] = previousVideoPath
        showVideoTip(t('message.video_viewer.tip_playing_previous'))
      } else {
        showVideoTip(t('message.video_viewer.tip_first'))
        return
      }
    } else {
      // 如果获取文件夹视频失败，使用原有逻辑
      currentIndex.value--
      showVideoTip(t('message.video_viewer.tip_playing_index', { index: currentIndex.value + 1 }))
    }
  }

  nextTick(() => {
    if (videoRef.value) {
      videoRef.value.load()
      videoRef.value
        .play()
        .then(() => {
          isPlaying.value = true
        })
        .catch((error) => {
          console.warn('视频播放失败:', error)
          isPlaying.value = false
        })
    }
  })
}

// 切换到下一个视频
const nextVideo = async () => {
  if (!canGoNext.value) return

  const currentVideoPath = videoList.value[currentIndex.value]
  if (!currentVideoPath || currentVideoPath.startsWith('http')) {
    // 如果是网络视频，使用原有逻辑
    currentIndex.value++
    showVideoTip(t('message.video_viewer.tip_playing_index', { index: currentIndex.value + 1 }))
  } else {
    // 如果是本地视频，从文件夹获取视频列表
    const folderVideos = await getVideosFromCurrentFolder(currentVideoPath)
    if (folderVideos.length > 0) {
      const currentVideoIndex = folderVideos.indexOf(currentVideoPath)
      if (currentVideoIndex < folderVideos.length - 1) {
        const nextVideoPath = folderVideos[currentVideoIndex + 1]
        videoList.value[currentIndex.value] = nextVideoPath
        showVideoTip(t('message.video_viewer.tip_playing_next'))
      } else {
        showVideoTip(t('message.video_viewer.tip_last'))
        return
      }
    } else {
      // 如果获取文件夹视频失败，使用原有逻辑
      currentIndex.value++
      showVideoTip(t('message.video_viewer.tip_playing_index', { index: currentIndex.value + 1 }))
    }
  }

  nextTick(() => {
    if (videoRef.value) {
      videoRef.value.load()
      videoRef.value
        .play()
        .then(() => {
          isPlaying.value = true
        })
        .catch((error) => {
          console.warn('视频播放失败:', error)
          isPlaying.value = false
        })
    }
  })
}

// 显示提示信息
const showVideoTip = (message: string) => {
  tipText.value = message
  showTip.value = true
  setTimeout(() => {
    showTip.value = false
  }, 2000)
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()

  // 修改事件名称与发送端保持一致
  await addListener(
    appWindow.listen('video-updated', (event: any) => {
      const { list, index } = event.payload
      videoList.value = list
      currentIndex.value = index
      nextTick(() => {
        if (videoRef.value) {
          videoRef.value.load()
          videoRef.value.play().catch((error) => {
            console.warn('视频播放失败:', error)
            isPlaying.value = false
          })
        }
      })
    }),
    'video-updated'
  )

  // 统一使用列表模式初始化
  const validIndex = Math.min(Math.max(videoViewerStore.currentVideoIndex, 0), videoViewerStore.videoList.length - 1)
  videoList.value = [...videoViewerStore.videoList]
  currentIndex.value = validIndex
})
</script>

<style scoped>
.bottom-operation {
  @apply flex-center px-8px py-7px rounded-8px cursor-pointer hover:bg-gray-600/50 transition-colors duration-300;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

/* 添加以下样式来修改 ActionBar 中的 svg 颜色 */
:deep(.action-close),
:deep(.hover-box) {
  svg {
    color: #fff !important;
  }
}
</style>
