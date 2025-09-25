<template>
  <div
    :class="[
      'file-item',
      `file-item--${file.status}`,
      {
        'file-item--downloading': file.status === 'downloading',
        'file-item--mobile': isMobile
      }
    ]"
    @dblclick="handleDoubleClick"
    @click="handleClick">
    <!-- 文件缩略图 -->
    <div class="file-thumbnail">
      <!-- 图片文件显示实际预览 -->
      <img
        v-if="isImageFile && file.thumbnailUrl"
        :src="file.thumbnailUrl"
        :alt="file.fileName"
        class="thumbnail-img"
        @error="handleThumbnailError" />

      <!-- 视频文件显示视频预览 -->
      <div v-else-if="isVideoFile && file.thumbnailUrl" class="video-thumbnail">
        <video :src="file.thumbnailUrl" class="video-preview" preload="metadata" @error="handleThumbnailError">
          <source :src="file.thumbnailUrl" />
        </video>
        <div class="video-overlay">
          <svg class="play-icon size-20px text-white">
            <use href="#play"></use>
          </svg>
        </div>
      </div>

      <!-- 其他文件显示对应图标 -->
      <img
        v-else
        :src="`/file/${fileIconName}.svg`"
        :alt="`${fileIconName} 文件`"
        class="file-type-icon"
        @error="handleIconError" />

      <!-- 状态覆盖层 -->
      <div v-if="file.status === 'uploading' || file.status === 'downloading'" class="status-overlay">
        <n-progress
          type="circle"
          :percentage="progressPercentage"
          :size="24"
          :stroke-width="3"
          :show-indicator="false"
          color="#13987f" />
      </div>
    </div>

    <!-- 文件信息 -->
    <div class="file-info">
      <!-- 文件名 -->
      <div class="file-name" :title="file.fileName">
        <n-highlight
          v-if="searchKeyword"
          :text="truncateFileName(file.fileName)"
          :patterns="[searchKeyword]"
          :highlight-style="{
            padding: '0 4px',
            borderRadius: '4px',
            color: '#000',
            background: '#13987f'
          }" />
        <template v-else>
          {{ truncateFileName(file.fileName) }}
        </template>
      </div>

      <!-- 文件大小和状态 -->
      <div class="file-meta">
        <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
        <span :class="['file-status', `file-status--${file.status}`]">
          {{ getStatusText(file.status) }}
        </span>
      </div>
    </div>

    <!-- 发送者信息和时间 -->
    <div class="file-details">
      <div class="send-time">{{ formatTimestamp(new Date(file.uploadTime).getTime()) }}</div>
      <div class="sender-info">
        <span class="sender-name">{{ file.sender.name }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="file-actions" v-show="showActions">
      <n-button
        v-if="file.status === 'completed' && !file.isDownloaded"
        size="small"
        type="primary"
        @click.stop="handleDownload">
        下载
      </n-button>

      <n-button
        v-if="file.status === 'completed' && file.isDownloaded"
        size="small"
        type="default"
        @click.stop="handleOpenFile">
        打开
      </n-button>

      <n-button v-if="file.status === 'expired'" size="small" type="error" disabled>已过期</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTimestamp } from '@/utils/ComputedTime'
import { getFileExtension, SUPPORTED_IMAGE_EXTENSIONS, SUPPORTED_VIDEO_EXTENSIONS } from '@/utils/FileType'
import { formatBytes, getFileSuffix } from '@/utils/Formatting'

interface FileInfo {
  id?: string
  fileName: string
  fileType: string
  fileSize: number
  status: string
  uploadTime: string
  isDownloaded: boolean
  thumbnailUrl?: string
  sender: {
    name: string
  }
}

interface Props {
  file: FileInfo
  searchKeyword?: string
  isMobile?: boolean
}

interface Emits {
  (e: 'download', file: FileInfo): void
  (e: 'open', file: FileInfo): void
  (e: 'click', file: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  isMobile: false
})
const emit = defineEmits<Emits>()

// 显示操作按钮
const showActions = ref(false)

// 下载进度（模拟）
const progressPercentage = ref(0)

// 文件类型判断
const isImageFile = computed(() => {
  const fileExtension = props.file.fileType?.toLowerCase() || getFileExtension(props.file.fileName)
  return SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension as any)
})

const isVideoFile = computed(() => {
  const fileExtension = props.file.fileType?.toLowerCase() || getFileExtension(props.file.fileName)
  return SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension as any)
})

// 获取文件图标名称
const fileIconName = computed(() => {
  return getFileSuffix(props.file.fileName)
})

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    uploading: '上传中',
    completed: props.file.isDownloaded ? '已下载' : '未下载',
    expired: '已过期',
    downloading: '下载中'
  }

  return statusMap[status] || '未知'
}

// 格式化文件大小
const formatFileSize = (size: number) => {
  return formatBytes(size)
}

// 截断文件名
const truncateFileName = (fileName: string, maxLength = 30) => {
  if (fileName.length <= maxLength) {
    return fileName
  }

  const extension = fileName.split('.').pop() || ''
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const maxNameLength = maxLength - extension.length - 3 // 3 for '...'

  return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`
}

// 处理双击
const handleDoubleClick = () => {
  if (props.file.status === 'completed') {
    handleOpenFile()
  }
}

// 处理点击
const handleClick = () => {
  emit('click', props.file)
}

// 处理下载
const handleDownload = () => {
  emit('download', props.file)
}

// 处理打开文件
const handleOpenFile = () => {
  emit('open', props.file)
}

// 处理缩略图错误
const handleThumbnailError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

// 处理图标错误
const handleIconError = (event: Event) => {
  const target = event.target as HTMLImageElement
  const currentSrc = target.src

  // 防止无限循环：如果已经是默认图标，就不再更改
  if (currentSrc.includes('/file/other.svg')) {
    return
  }

  // 回退到默认文件图标
  target.src = '/file/other.svg'
}

// 模拟下载进度
watch(
  () => props.file.status,
  (newStatus) => {
    if (newStatus === 'downloading') {
      const interval = setInterval(() => {
        progressPercentage.value += 10
        if (progressPercentage.value >= 100) {
          clearInterval(interval)
          progressPercentage.value = 0
        }
      }, 100)
    }
  }
)
</script>

<style scoped lang="scss">
.file-item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  grid-template-rows: auto auto;
  gap: 12px 16px;
  padding: 16px;
  border-radius: 8px;
  background-color: var(--file-bg-color);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background-color: var(--bg-bubble-active);
    border-color: var(--line-color);

    .file-actions {
      opacity: 1;
      visibility: visible;
    }
  }

  &--downloading,
  &--uploading {
    opacity: 0.8;
  }

  &--expired {
    opacity: 0.6;

    .file-info,
    .file-details {
      color: var(--text-color);
      opacity: 0.6;
    }
  }

  // 移动端适配
  &--mobile {
    grid-template-columns: 48px 1fr;
    grid-template-rows: auto auto auto;
    gap: 8px 12px;
    padding: 12px;

    .file-thumbnail {
      width: 48px;
      height: 48px;
      grid-row: 1 / 3;
    }

    .file-details {
      grid-column: 1 / 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }

    .file-actions {
      grid-column: 1 / 3;
      justify-content: flex-start;
    }
  }
}

.file-thumbnail {
  grid-row: 1 / 3;
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--bg-bubble);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-img,
.file-type-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-type-icon {
  object-fit: contain;
  padding: 8px;
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.video-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.play-icon {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  line-height: 1.4;
  word-break: break-word;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.file-size {
  color: #909090;
}

.file-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;

  &--completed {
    background-color: rgba(19, 152, 127, 0.1);
    color: #13987f;
  }

  &--uploading,
  &--downloading {
    background-color: rgba(24, 144, 255, 0.1);
    color: #1890ff;
  }

  &--expired {
    background-color: rgba(255, 77, 79, 0.1);
    color: #ff4d4f;
  }
}

.file-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  text-align: right;
}

.send-time {
  font-size: 12px;
  color: #909090;
}

.sender-info {
  font-size: 12px;
}

.sender-name {
  color: #13987f;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.file-actions {
  grid-column: 1 / 4;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
}

// 深色主题适配
html[data-theme='dark'] {
  .file-item {
    &:hover {
      background-color: var(--bg-bubble-active);
    }
  }

  .file-thumbnail {
    background-color: var(--bg-bubble);
  }
}
</style>
