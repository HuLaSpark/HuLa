<template>
  <div class="file-upload-progress" :class="{ 'is-completed': !queue.isActive && queue.endTime }">
    <!-- 进度条头部信息 -->
    <div class="progress-header">
      <div class="progress-info">
        <n-icon :size="16" class="upload-icon">
          <svg>
            <use href="#file2"></use>
          </svg>
        </n-icon>
        <span class="progress-text">
          {{ getStatusText() }}
        </span>
        <span class="progress-stats">{{ queue.completedFiles }}/{{ queue.totalFiles }}</span>
      </div>

      <div class="progress-actions">
        <!-- 预计剩余时间 -->
        <span v-if="isUploading && estimatedTimeRemaining > 0" class="time-remaining">
          剩余 {{ formatTime(estimatedTimeRemaining) }}
        </span>

        <!-- 取消按钮 -->
        <n-button v-if="queue.isActive" quaternary size="tiny" @click="handleCancel" class="cancel-btn">
          <template #icon>
            <n-icon :size="14">
              <svg>
                <use href="#close"></use>
              </svg>
            </n-icon>
          </template>
        </n-button>

        <!-- 关闭按钮 -->
        <n-button v-else-if="queue.endTime" quaternary size="tiny" @click="handleClose" class="close-btn">
          <template #icon>
            <n-icon :size="14">
              <svg>
                <use href="#close"></use>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 主进度条 -->
    <div class="main-progress">
      <n-progress
        type="line"
        :percentage="progress"
        :show-indicator="false"
        :height="6"
        :border-radius="3"
        :color="getProgressColor()"
        :rail-color="themes.content === ThemeEnum.DARK ? '#2d2d2d' : '#f0f0f0'" />
    </div>

    <!-- 文件详情列表（可展开） -->
    <div v-if="showDetails" class="file-details">
      <div v-for="item in queue.items" :key="item.id" class="file-item" :class="`status-${item.status}`">
        <div class="file-info">
          <n-icon :size="14" class="file-type-icon">
            <svg>
              <use :href="getFileIcon(item.type)"></use>
            </svg>
          </n-icon>
          <span class="file-name">{{ item.name }}</span>
          <span class="file-size">{{ formatFileSize(item.size) }}</span>
        </div>

        <div class="file-status">
          <n-icon v-if="item.status === 'completed'" :size="14" class="status-icon success">
            <svg>
              <use href="#check"></use>
            </svg>
          </n-icon>
          <n-icon v-else-if="item.status === 'failed'" :size="14" class="status-icon error">
            <svg>
              <use href="#close"></use>
            </svg>
          </n-icon>
          <n-spin v-else-if="item.status === 'uploading'" :size="14" class="status-spinner" />
          <span v-if="item.status === 'uploading'" class="progress-percent">{{ item.progress }}%</span>
        </div>
      </div>
    </div>

    <!-- 展开/收起按钮 -->
    <div v-if="queue.totalFiles > 1" class="toggle-details" @click="showDetails = !showDetails">
      <n-icon :size="12" class="toggle-icon" :class="{ rotated: showDetails }">
        <svg>
          <use href="#down"></use>
        </svg>
      </n-icon>
      <span class="toggle-text">
        {{ showDetails ? '收起' : '查看详情' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { ThemeEnum } from '@/enums'
import { globalFileUploadQueue } from '@/hooks/useFileUploadQueue'
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)

// 队列状态
const { queue, progress, isUploading, estimatedTimeRemaining, cancelQueue, clearQueue } = globalFileUploadQueue

// 展开状态
const showDetails = ref(false)

// 状态文本
const getStatusText = () => {
  if (queue.isActive) {
    if (isUploading.value) {
      const uploadingFile = queue.items.find((item) => item.status === 'uploading')
      return uploadingFile ? `正在上传: ${uploadingFile.name}` : '正在上传文件'
    } else {
      return '准备上传'
    }
  } else if (queue.endTime) {
    if (queue.failedFiles > 0) {
      return `上传完成 (${queue.failedFiles} 个失败)`
    } else {
      return '全部上传完成'
    }
  }
  return ''
}

// 进度条颜色
const getProgressColor = () => {
  if (queue.failedFiles > 0) {
    return '#f56c6c'
  }
  if (!queue.isActive && queue.endTime) {
    return '#67c23a'
  }
  return '#13987f'
}

// 文件图标
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return '#photo'
  if (type.startsWith('video/')) return '#video'
  if (type.startsWith('audio/')) return '#voice'
  return '#file2'
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / k ** i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化时间
const formatTime = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分钟`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${minutes}分钟`
  }
}

// 取消上传
const handleCancel = () => {
  cancelQueue()
}

// 关闭面板
const handleClose = () => {
  clearQueue()
}
</script>

<style scoped lang="scss">
.file-upload-progress {
  position: absolute;
  top: -80px; /* 悬浮在 footer 上方 */
  left: 20px;
  right: 20px;
  z-index: 1000;
  background: var(--bg-color);
  border: 1px solid var(--right-chat-footer-line-color);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &.is-completed {
    background: var(--bg-success);
    border-color: var(--border-success);
  }
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  .upload-icon {
    color: var(--primary-color);
  }

  .progress-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color);
  }

  .progress-stats {
    font-size: 12px;
    color: var(--text-color-secondary);
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
  }
}

.progress-actions {
  display: flex;
  align-items: center;
  gap: 8px;

  .time-remaining {
    font-size: 12px;
    color: var(--text-color-secondary);
  }

  .cancel-btn,
  .close-btn {
    padding: 4px;
    min-width: unset;

    &:hover {
      background: var(--bg-hover);
    }
  }
}

.main-progress {
  margin-bottom: 8px;
}

.file-details {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-light);
  }

  &.status-completed {
    opacity: 0.8;
  }

  &.status-failed {
    background: var(--bg-error-light);
    border-radius: 4px;
    padding: 6px 8px;
    margin: 2px 0;
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;

  .file-type-icon {
    color: var(--text-color-secondary);
  }

  .file-name {
    font-size: 13px;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .file-size {
    font-size: 12px;
    color: var(--text-color-secondary);
    flex-shrink: 0;
  }
}

.file-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  .status-icon {
    &.success {
      color: var(--success-color);
    }

    &.error {
      color: var(--error-color);
    }
  }

  .progress-percent {
    font-size: 12px;
    color: var(--text-color-secondary);
    min-width: 35px;
    text-align: right;
  }
}

.toggle-details {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: var(--bg-hover);
  }

  .toggle-icon {
    transition: transform 0.2s ease;

    &.rotated {
      transform: rotate(180deg);
    }
  }

  .toggle-text {
    font-size: 12px;
    color: var(--text-color-secondary);
  }
}
</style>
