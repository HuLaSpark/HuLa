<template>
  <div ref="videoContainerRef" :style="containerStyle" @dblclick="handleOpenVideoViewer">
    <n-image
      v-if="body?.thumbUrl"
      class="video-thumbnail"
      object-fit="cover"
      show-toolbar-tooltip
      preview-disabled
      :img-props="{
        style: {
          ...imageStyle
        }
      }"
      :src="displayThumbSrc"
      @error="handleImageError">
      <template #placeholder>
        <n-flex
          v-if="!isError"
          align="center"
          justify="center"
          :style="{
            width: `${imageStyle.width}`,
            height: `${imageStyle.height}`,
            backgroundColor: '#c8c8c833'
          }"
          class="rounded-10px">
          <img class="size-24px select-none" src="@/assets/img/loading.svg" alt="loading" />
        </n-flex>
      </template>
      <template #error>
        <n-flex v-if="isError" align="center" justify="center" class="w-200px h-150px bg-#c8c8c833 rounded-10px">
          <svg class="size-34px color-[--chat-text-color]"><use href="#error-picture"></use></svg>
        </n-flex>
      </template>
    </n-image>

    <!-- 视频蒙层 -->
    <div class="video-overlay">
      <!-- 播放/下载按钮 -->
      <div
        class="play-button"
        @click="handlePlayButtonClick"
        :class="{ loading: isOpening || isDownloading || isUploading }">
        <!-- 上传中显示进度 -->
        <div v-if="isUploading" class="upload-progress">
          <div class="progress-circle">
            <svg class="progress-ring" width="44" height="44">
              <circle
                class="progress-ring-circle"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="3"
                fill="transparent"
                r="18"
                cx="22"
                cy="22" />
              <circle
                class="progress-ring-circle progress-ring-fill"
                stroke="#13987f"
                stroke-width="3"
                fill="transparent"
                r="18"
                cx="22"
                cy="22"
                :stroke-dasharray="`${2 * Math.PI * 18}`"
                :stroke-dashoffset="`${2 * Math.PI * 18 * (1 - uploadProgress / 100)}`" />
            </svg>
            <svg class="upload-icon"><use href="#Importing"></use></svg>
          </div>
        </div>
        <!-- 下载中显示进度 -->
        <div v-else-if="isDownloading" class="download-progress">
          <div class="progress-circle">
            <svg class="progress-ring" width="44" height="44">
              <circle
                class="progress-ring-circle"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="3"
                fill="transparent"
                r="18"
                cx="22"
                cy="22" />
              <circle
                class="progress-ring-circle progress-ring-fill"
                stroke="white"
                stroke-width="3"
                fill="transparent"
                r="18"
                cx="22"
                cy="22"
                :stroke-dasharray="`${2 * Math.PI * 18}`"
                :stroke-dashoffset="`${2 * Math.PI * 18 * (1 - process / 100)}`" />
            </svg>
            <svg class="download-icon"><use href="#arrow-down"></use></svg>
          </div>
        </div>
        <!-- 打开中显示加载动画 -->
        <div v-else-if="isOpening" class="loading-spinner"></div>
        <!-- 未检查状态或未下载显示下载图标 -->
        <svg v-else-if="isVideoDownloaded === null || !isVideoDownloaded" class="size-32px color-white">
          <use href="#Importing"></use>
        </svg>
        <!-- 已下载显示播放图标 -->
        <svg v-else class="size-full color-white"><use href="#play"></use></svg>
      </div>

      <!-- 视频信息 -->
      <div class="video-info">
        <div class="video-filename">{{ body?.filename || '视频文件' }}</div>
        <div class="video-filesize">{{ formatBytes(body?.size) }}</div>
      </div>

      <!-- 加载提示 -->
      <transition name="fade">
        <div v-if="isUploading" class="loading-tip upload-tip">
          <div class="loading-text">正在上传视频... {{ uploadProgress }}%</div>
        </div>
        <div v-else-if="isOpening" class="loading-tip">
          <div class="loading-text">正在打开视频...</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { BaseDirectory, exists } from '@tauri-apps/plugin-fs'
import { MessageStatusEnum, TauriCommand } from '@/enums'
import { MittEnum, MsgEnum } from '@/enums/index'
import { useDownload } from '@/hooks/useDownload'
import { useIntersectionTaskQueue } from '@/hooks/useIntersectionTaskQueue'
import { useMitt } from '@/hooks/useMitt'
import { useVideoViewer } from '@/hooks/useVideoViewer'
import type { MsgType, VideoBody } from '@/services/types'
import { useVideoViewer as useVideoViewerStore } from '@/stores/videoViewer'
import { useThumbnailCacheStore } from '@/stores/thumbnailCache'
import { useChatStore } from '@/stores/chat'
import { formatBytes } from '@/utils/Formatting.ts'
import { isMobile } from '@/utils/PlatformConstants'
import { invokeSilently } from '@/utils/TauriInvokeHandler'

const { openVideoViewer, getLocalVideoPath, checkVideoDownloaded } = useVideoViewer()
const videoViewerStore = useVideoViewerStore()
const chatStore = useChatStore()
const { downloadFile, isDownloading, process } = useDownload()
const props = defineProps<{
  body: VideoBody
  messageStatus?: MessageStatusEnum
  uploadProgress?: number
  onVideoClick?: (url: string) => void
  message?: MsgType
}>()

// 视频容器引用
const videoContainerRef = ref<HTMLElement | null>(null)
const MAX_WIDTH = 300
const MAX_HEIGHT = 150
const MIN_WIDTH = 60
const MIN_HEIGHT = 60
// 错误状态控制
const isError = ref(false)
// 视频打开状态
const isOpening = ref(false)
// 视频下载状态（延迟加载，只在需要时检查）
const isVideoDownloaded = ref<boolean | null>(null)
// 是否已检查过下载状态
const hasCheckedDownloadStatus = ref(false)
// 视频上传状态
const isUploading = computed(() => props.messageStatus === MessageStatusEnum.SENDING)
const uploadProgress = computed(() => {
  return props.uploadProgress || 0
})
const thumbnailStore = useThumbnailCacheStore()
const { observe: observeVideoVisibility, disconnect: disconnectVideoVisibility } = useIntersectionTaskQueue({
  threshold: 0.5
})

const persistVideoLocalPath = async (absolutePath: string) => {
  if (!props.message?.id || !absolutePath) return
  const target = chatStore.getMessage(props.message.id)
  if (!target) return

  const nextBody = { ...(target.message.body || {}), localPath: absolutePath }
  if (target.message.body?.localPath === absolutePath) return

  chatStore.updateMsg({ msgId: target.message.id, status: target.message.status, body: nextBody })
  const updated = { ...target, message: { ...target.message, body: nextBody } }
  await invokeSilently(TauriCommand.SAVE_MSG, { data: updated as any })
}
const localVideoThumbSrc = ref<string | null>(null)

const imageStyle = computed(() => {
  // 如果有原始尺寸，使用原始尺寸计算
  let width = props.body?.thumbWidth
  let height = props.body?.thumbHeight

  // 如果没有原始尺寸，使用默认尺寸
  if (!width || !height) {
    width = MAX_WIDTH
    height = MAX_HEIGHT
  }

  const aspectRatio = width / height
  let finalWidth = width
  let finalHeight = height

  // 如果图片太大,需要等比缩放
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    if (width / height > MAX_WIDTH / MAX_HEIGHT) {
      // 宽度超出更多,以最大宽度为基准缩放
      finalWidth = MAX_WIDTH
      finalHeight = MAX_WIDTH / aspectRatio
    } else {
      // 高度超出更多,以最大高度为基准缩放
      finalHeight = MAX_HEIGHT
      finalWidth = MAX_HEIGHT * aspectRatio
    }
  }

  // 确保不小于最小尺寸
  finalWidth = Math.max(finalWidth, MIN_WIDTH)
  finalHeight = Math.max(finalHeight, MIN_HEIGHT)
  // 向上取整避免小数导致的抖动
  return {
    width: `${Math.ceil(finalWidth)}px`,
    height: `${Math.ceil(finalHeight)}px`
  }
})

const containerStyle = computed(() => {
  const style = imageStyle.value
  return `width: ${style.width}; height: ${style.height}; position: relative; border-radius: 8px; overflow: hidden; cursor: pointer;`
})

const remoteThumbSrc = computed(() => props.body?.thumbUrl || '')
const downloadKey = computed(() => remoteThumbSrc.value || '')
const displayThumbSrc = computed(() => localVideoThumbSrc.value || remoteThumbSrc.value || '')

const requestVideoThumbnailDownload = () => {
  if (!downloadKey.value || !props.message) return
  void thumbnailStore
    .enqueueThumbnail({ url: downloadKey.value, msgId: props.message.id, roomId: props.message.roomId, kind: 'video' })
    .then((path) => {
      if (!path) return
      localVideoThumbSrc.value = convertFileSrc(path)
    })
}

const ensureLocalVideoThumbnail = async () => {
  const localPath = props.body?.thumbnailPath
  if (!localPath) {
    localVideoThumbSrc.value = null
    return
  }

  try {
    const existsFlag = await exists(localPath)
    if (existsFlag) {
      localVideoThumbSrc.value = convertFileSrc(localPath)
      return
    }
  } catch (error) {
    console.warn('[Video] 检查缩略图文件失败:', error)
  }

  localVideoThumbSrc.value = null
  thumbnailStore.invalidate(downloadKey.value)
  requestVideoThumbnailDownload()
}

watch(
  () => props.body?.thumbnailPath,
  () => {
    void ensureLocalVideoThumbnail()
  },
  { immediate: true }
)

watch(
  () => props.body?.localPath,
  async (path) => {
    if (!path) return
    try {
      const existsFlag = await exists(path)
      if (existsFlag) {
        isVideoDownloaded.value = true
      }
    } catch (error) {
      console.warn('[Video] 本地视频校验失败:', error)
    }
  },
  { immediate: true }
)

watch(
  () => downloadKey.value,
  () => {
    if (!props.body?.thumbnailPath) {
      requestVideoThumbnailDownload()
    }
  }
)

// 检查视频下载状态（延迟加载）
const checkDownloadStatusLazy = async () => {
  if (!props.body?.url || hasCheckedDownloadStatus.value) return
  hasCheckedDownloadStatus.value = true
  isVideoDownloaded.value = await checkVideoDownloaded(props.body.url)
}

// 使用 IntersectionObserver 在视频进入视口时检查下载状态
const setupIntersectionObserver = () => {
  if (!videoContainerRef.value || hasCheckedDownloadStatus.value) return

  observeVideoVisibility(videoContainerRef.value, () => {
    void checkDownloadStatusLazy()
  })
}

// 处理图片加载错误
const handleImageError = () => {
  isError.value = true
}

// 下载视频
const downloadVideo = async () => {
  if (!props.body?.url || isDownloading.value) return

  try {
    const localPath = await getLocalVideoPath(props.body?.url)
    if (localPath) {
      const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
      await downloadFile(props.body.url, localPath, baseDir)
      isVideoDownloaded.value = await checkVideoDownloaded(props.body.url)

      // 下载完成后，更新videoViewer store中的视频路径
      if (isVideoDownloaded.value) {
        const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
        const path = await join(baseDirPath, localPath)
        videoViewerStore.updateVideoPath(props.body.url, path)
        void persistVideoLocalPath(path)
      }
    }
  } catch (error) {
    console.error('下载视频失败:', error)
  }
}

// 处理播放按钮点击
const handlePlayButtonClick = async () => {
  if (!props.body?.url) return

  // 如果正在上传，不允许点击
  if (isUploading.value) return

  // 首次点击时检查下载状态
  if (!hasCheckedDownloadStatus.value) {
    await checkDownloadStatusLazy()
  }

  // 如果视频未下载，先下载
  if (!isVideoDownloaded.value) {
    await downloadVideo()
    return
  }

  // 如果已下载，直接播放
  await handleOpenVideoViewer()
}

// 处理打开视频查看器
const handleOpenVideoViewer = async () => {
  if (props.body?.url && !isOpening.value) {
    // 如果有自定义视频点击处理函数，使用它
    if (props.onVideoClick) {
      props.onVideoClick(props.body.url)
      return
    }

    try {
      isOpening.value = true

      // 检查视频是否已下载
      const isDownloaded = await checkVideoDownloaded(props.body.url)
      isVideoDownloaded.value = isDownloaded

      // 如果视频未下载，先下载
      if (!isDownloaded) {
        await downloadVideo()
        // 下载完成后重新检查状态
        isVideoDownloaded.value = await checkVideoDownloaded(props.body.url)

        // 如果下载失败，不继续打开视频
        if (!isVideoDownloaded.value) {
          console.error('视频下载失败，无法打开')
          return
        }
      }

      await openVideoViewer(props.body.url, [MsgEnum.VIDEO])
    } catch (error) {
      console.error('打开视频失败:', error)
    } finally {
      isOpening.value = false
    }
  }
}

// 监听视频下载状态更新事件
const handleVideoDownloadStatusUpdate = (data: { url: string; downloaded: boolean }) => {
  if (data.url === props.body?.url) {
    isVideoDownloaded.value = data.downloaded
  }
}

onMounted(() => {
  // 监听视频下载状态更新事件
  useMitt.on(MittEnum.VIDEO_DOWNLOAD_STATUS_UPDATED, handleVideoDownloadStatusUpdate)

  // 设置视口观察器
  nextTick(() => {
    setupIntersectionObserver()
  })

  if (!props.body?.thumbnailPath) {
    requestVideoThumbnailDownload()
  }
})

onUnmounted(() => {
  // 清理事件监听
  useMitt.off(MittEnum.VIDEO_DOWNLOAD_STATUS_UPDATED, handleVideoDownloadStatusUpdate)

  disconnectVideoVisibility()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/renderMessage/video.scss';
</style>
