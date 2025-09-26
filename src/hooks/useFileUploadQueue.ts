import { computed, reactive, readonly } from 'vue'

export type FileUploadItem = {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  startTime?: number
  endTime?: number
}

export type FileUploadQueue = {
  items: FileUploadItem[]
  totalFiles: number
  completedFiles: number
  failedFiles: number
  isActive: boolean
  startTime?: number
  endTime?: number
}

/**
 * 文件上传队列状态管理
 */
export const useFileUploadQueue = () => {
  // 队列状态
  const queue = reactive<FileUploadQueue>({
    items: [],
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    isActive: false,
    startTime: undefined,
    endTime: undefined
  })

  // 计算属性
  const progress = computed(() => {
    if (queue.totalFiles === 0) return 0
    return Math.round((queue.completedFiles / queue.totalFiles) * 100)
  })

  const isUploading = computed(() => {
    return queue.isActive && queue.items.some((item) => item.status === 'uploading')
  })

  /**
   * 初始化队列
   */
  const initQueue = (files: File[]) => {
    queue.items = files.map((file, index) => ({
      id: `${Date.now()}_${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
    }))
    queue.totalFiles = files.length
    queue.completedFiles = 0
    queue.failedFiles = 0
    queue.isActive = true
    queue.startTime = Date.now()
    queue.endTime = undefined
  }

  /**
   * 更新文件状态
   */
  const updateFileStatus = (fileId: string, status: FileUploadItem['status'], progress?: number) => {
    const item = queue.items.find((item) => item.id === fileId)
    if (!item) return

    const oldStatus = item.status
    item.status = status
    if (progress !== undefined) {
      item.progress = Math.min(100, Math.max(0, progress))
    }

    // 更新时间戳
    if (status === 'uploading' && oldStatus === 'pending') {
      item.startTime = Date.now()
    } else if ((status === 'completed' || status === 'failed') && oldStatus === 'uploading') {
      item.endTime = Date.now()
    }

    // 更新计数器
    if (status === 'completed' && oldStatus !== 'completed') {
      queue.completedFiles++
      if (oldStatus === 'failed') queue.failedFiles--
    } else if (status === 'failed' && oldStatus !== 'failed') {
      queue.failedFiles++
      if (oldStatus === 'completed') queue.completedFiles--
    }

    // 检查是否完成
    if (queue.completedFiles + queue.failedFiles >= queue.totalFiles) {
      finishQueue()
    }
  }

  /**
   * 更新文件上传进度
   */
  const updateFileProgress = (fileId: string, progress: number) => {
    const item = queue.items.find((item) => item.id === fileId)
    if (item && item.status === 'uploading') {
      item.progress = Math.min(100, Math.max(0, progress))
    }
  }

  /**
   * 完成队列
   */
  const finishQueue = () => {
    queue.isActive = false
    queue.endTime = Date.now()

    // 1秒后清理队列
    setTimeout(() => {
      clearQueue()
    }, 1000)
  }

  /**
   * 清空队列
   */
  const clearQueue = () => {
    queue.items = []
    queue.totalFiles = 0
    queue.completedFiles = 0
    queue.failedFiles = 0
    queue.isActive = false
    queue.startTime = undefined
    queue.endTime = undefined
  }

  return {
    queue: readonly(queue),
    progress,
    isUploading,
    initQueue,
    updateFileStatus,
    updateFileProgress,
    finishQueue,
    clearQueue
  }
}

// 全局单例
export const globalFileUploadQueue = useFileUploadQueue()
