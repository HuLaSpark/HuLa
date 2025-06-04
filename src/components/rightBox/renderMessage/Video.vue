<template>
  <div class="video-container" :style="containerStyle" @dblclick="handleOpenVideoViewer">
    <n-image
      v-if="body?.thumbUrl"
      class="select-none cursor-pointer video-thumbnail"
      object-fit="cover"
      show-toolbar-tooltip
      preview-disabled
      :img-props="{
        style: {
          ...imageStyle
        }
      }"
      style="border-radius: 8px; cursor: pointer !important; position: relative; width: 100%; height: 100%"
      :src="body?.thumbUrl"
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
      <!-- 播放按钮 -->
      <div class="play-button cursor-pointer" @click="handleOpenVideoViewer" :class="{ loading: isOpening }">
        <svg v-if="!isOpening" class="size-full color-white"><use href="#play"></use></svg>
        <div v-else class="loading-spinner"></div>
      </div>

      <!-- 视频信息 -->
      <div class="video-info">
        <div class="video-filename">{{ getVideoFilename() }}</div>
        <div class="video-filesize">{{ formatFileSize(body?.size) }}</div>
      </div>

      <!-- 加载提示 -->
      <transition name="fade">
        <div v-if="isOpening" class="loading-tip">
          <div class="loading-text">正在打开视频...</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VideoBody } from '@/services/types'
import { MsgEnum } from '@/enums/index'
import { useVideoViewer } from '@/hooks/useVideoViewer'

const { openVideoViewer } = useVideoViewer()
const props = defineProps<{ body: VideoBody }>()
const MAX_WIDTH = 320
const MAX_HEIGHT = 240
const MIN_WIDTH = 60
const MIN_HEIGHT = 60
// 错误状态控制
const isError = ref(false)
// 视频打开状态
const isOpening = ref(false)

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

// 处理图片加载错误
const handleImageError = () => {
  isError.value = true
}

// 处理打开视频查看器
const handleOpenVideoViewer = async () => {
  if (props.body?.url && !isOpening.value) {
    try {
      isOpening.value = true
      await openVideoViewer(props.body.url, [MsgEnum.VIDEO])
    } catch (error) {
      console.error('打开视频失败:', error)
    } finally {
      setTimeout(() => {
        isOpening.value = false
      }, 1000)
    }
  }
}

// 预加载视频元数据
const preloadVideoMetadata = () => {
  if (props.body?.url) {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = props.body.url
    video.muted = true
    // 静默预加载，不阻塞UI
    video.load()
  }
}

// 格式化文件大小
const formatFileSize = (size?: number) => {
  if (!size) return '未知大小'

  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = size

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }

  return `${fileSize.toFixed(1)} ${units[index]}`
}

// 获取视频文件名
const getVideoFilename = () => {
  if (props.body?.filename) {
    return props.body.filename
  }
  if (props.body?.url) {
    // 从URL中提取文件名
    const urlParts = props.body.url.split('/')
    const filename = urlParts[urlParts.length - 1]
    if (filename && filename.includes('.')) {
      return filename
    }
  }
  return '视频文件'
}

onMounted(() => {
  setTimeout(preloadVideoMetadata, 500)
})
</script>

<style scoped>
.video-container {
  position: relative;
  display: inline-block;
}

.video-thumbnail {
  width: 100%;
  height: 100%;
  transition: transform 0.4s ease-in-out;
}

.video-thumbnail:hover {
  transform: scale(1.06);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  border-radius: 8px;
  user-select: none;
  cursor: default;
  pointer-events: none;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  pointer-events: auto;
}

.play-button:hover:not(.loading) {
  background: rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%) scale(1.1);
}

.play-button.loading {
  background: rgba(0, 0, 0, 0.6);
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-tip {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  backdrop-filter: blur(4px);
}

.loading-text {
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.video-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.video-filename {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 2px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-filesize {
  font-size: 10px;
  opacity: 0.9;
}
</style>
