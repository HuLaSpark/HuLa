import type { UnlistenFn } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'
import { appCacheDir } from '@tauri-apps/api/path'
import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { ErrorType, invokeSilently, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'
import { getUserDataRootAbsoluteDir } from '@/utils/PathUtil'

type DirectoryScanProgress = {
  current_path: string
  files_processed: number
  total_size: number
  elapsed_time: number
  elapsed_seconds: number
  progress_percentage: number
}

type DirectoryInfo = {
  path: string
  total_size: number
  disk_mount_point: string
  disk_total_space: number
  disk_used_space: number
  disk_usage_percentage: number
  usage_percentage: number
}
/**
 * 扫描器状态管理
 * 负责管理扫描器的状态、配置和事件监听
 * 提供扫描、取消扫描、清理资源等功能
 */
export const useScannerStore = defineStore(StoresEnum.SCANNER, () => {
  const pathType = ref<'default' | 'custom'>('default')
  const defaultDirectory = ref<string>('')
  const customDirectory = ref<string>('')
  const scanning = ref<boolean>(false)
  const scanComplete = ref<boolean>(false)
  const showDiskUsage = ref<boolean>(false)
  const totalSize = ref<number>(0)
  const diskInfo = ref<DirectoryInfo | null>(null)
  const scanProgress = ref<DirectoryScanProgress>({
    current_path: '',
    files_processed: 0,
    total_size: 0,
    elapsed_time: 0,
    elapsed_seconds: 0,
    progress_percentage: 0
  })
  const isInitialized = ref<boolean>(false)
  const listeners = ref<UnlistenFn[]>([])

  const currentDirectory = computed(() => {
    return pathType.value === 'default' ? defaultDirectory.value : customDirectory.value
  })

  const scanFilesUsagePercentage = computed(() => {
    if (!diskInfo.value || !scanProgress.value.total_size) return 0
    const percentage = (scanProgress.value.total_size / diskInfo.value.disk_total_space) * 100
    return Math.min(percentage, 1000)
  })

  const scanningProgress = computed(() => {
    if (!scanning.value && !scanComplete.value) return 0
    if (scanComplete.value && !showDiskUsage.value) return 100
    return scanProgress.value.progress_percentage || 0
  })

  // 方法
  const setupEventListeners = async () => {
    // 监听进度更新
    const progressListener = await listen<DirectoryScanProgress>('directory-scan-progress', (event) => {
      scanProgress.value = event.payload
    })
    listeners.value.push(progressListener)

    // 监听扫描完成
    const completeListener = await listen<DirectoryScanProgress>('directory-scan-complete', (event) => {
      scanProgress.value = event.payload
      scanComplete.value = true
      scanning.value = false

      // 扫描完成后切换到磁盘占比显示
      setTimeout(() => {
        showDiskUsage.value = true
      }, 300)
    })
    listeners.value.push(completeListener)

    // 监听扫描取消
    const cancelListener = await listen('directory-scan-cancelled', () => {
      console.log('收到扫描取消事件')
      scanning.value = false
      scanComplete.value = false
      showDiskUsage.value = false
    })
    listeners.value.push(cancelListener)
  }

  const initializeScanner = async () => {
    if (isInitialized.value) return

    try {
      // 获取默认目录
      await setDefaultDirectory()

      // 设置事件监听器
      await setupEventListeners()

      isInitialized.value = true

      // 如果有当前目录，自动开始扫描
      if (currentDirectory.value) {
        await startScan()
      }
    } catch (error) {
      console.error('初始化扫描器失败:', error)
      window.$message?.error('初始化扫描器失败')
    }
  }

  const setDefaultDirectory = async () => {
    try {
      defaultDirectory.value = await getUserDataRootAbsoluteDir()
    } catch (error) {
      console.error('获取 userData 根目录失败，回退到 appCacheDir:', error)
      defaultDirectory.value = await appCacheDir()
    }
  }

  const setPathType = (type: 'default' | 'custom') => {
    pathType.value = type
  }

  const setCustomDirectory = (path: string) => {
    customDirectory.value = path
  }

  const startScan = async () => {
    if (!currentDirectory.value) {
      window.$message?.warning('请先选择目录')
      return
    }

    scanning.value = true
    scanComplete.value = false
    showDiskUsage.value = false
    totalSize.value = 0
    diskInfo.value = null

    // 重置进度
    scanProgress.value = {
      current_path: '开始扫描...',
      files_processed: 0,
      total_size: 0,
      elapsed_time: 0,
      elapsed_seconds: 0,
      progress_percentage: 0
    }

    try {
      const result = await invokeWithErrorHandler<DirectoryInfo>(
        'get_directory_usage_info_with_progress',
        {
          directoryPath: currentDirectory.value
        },
        {
          customErrorMessage: '获取目录信息失败',
          errorType: ErrorType.Client
        }
      )

      diskInfo.value = result
      totalSize.value = result.total_size
      scanComplete.value = true
      scanning.value = false
    } catch (error) {
      console.error('扫描失败:', error)
      scanning.value = false
    }
  }

  const cancelScan = async () => {
    try {
      await invokeSilently('cancel_directory_scan')
      console.log('扫描已取消')
    } catch (error) {
      console.error('取消扫描失败:', error)
    }
  }

  const resetState = () => {
    // 重置所有状态到初始值
    pathType.value = 'default'
    customDirectory.value = ''
    scanning.value = false
    scanComplete.value = false
    showDiskUsage.value = false
    totalSize.value = 0
    diskInfo.value = null
    isInitialized.value = false
    scanProgress.value = {
      current_path: '',
      files_processed: 0,
      total_size: 0,
      elapsed_time: 0,
      elapsed_seconds: 0,
      progress_percentage: 0
    }
  }

  const cleanup = async () => {
    // 取消正在进行的扫描
    if (scanning.value) {
      await cancelScan()
    }

    // 清理事件监听器
    listeners.value.forEach((unlisten) => {
      try {
        unlisten()
      } catch (error) {
        console.warn('清理监听器失败:', error)
      }
    })
    listeners.value = []

    // 重置状态
    isInitialized.value = false
    scanning.value = false
    scanComplete.value = false
    showDiskUsage.value = false
  }

  return {
    pathType,
    defaultDirectory,
    customDirectory,
    scanning,
    scanComplete,
    showDiskUsage,
    totalSize,
    diskInfo,
    scanProgress,
    isInitialized,
    listeners,
    currentDirectory,
    scanFilesUsagePercentage,
    scanningProgress,
    initializeScanner,
    setPathType,
    setCustomDirectory,
    startScan,
    cancelScan,
    resetState,
    cleanup
  }
})
