import { defineStore } from 'pinia'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import { StoresEnum } from '@/enums'
import { isMobile } from '@/utils/PlatformConstants'

/**
 * 文件信息接口
 */
export interface FileInfo {
  /** 文件ID（消息ID） */
  id: string
  /** 房间ID */
  roomId: string
  /** 文件名 */
  fileName: string
  /** 文件类型 */
  type: 'file' | 'image' | 'video' | 'voice'
  /** 文件URL */
  url: string
  /** 文件后缀 */
  suffix?: string
  /** MIME类型 */
  mimeType?: string
}

export const useFileStore = defineStore(
  StoresEnum.FILE,
  () => {
    // ==================== 状态定义 ====================

    /** 所有房间的文件数据 Map<roomId, Map<fileId, FileInfo>> */
    const roomFilesMap = reactive<Record<string, Record<string, FileInfo>>>({})

    // ==================== 计算属性 ====================

    /** 获取指定房间的所有文件 */
    const getRoomFiles = computed(() => (roomId: string) => {
      return roomFilesMap[roomId] ? Object.values(roomFilesMap[roomId]) : []
    })

    /** 获取指定房间的所有文件，转换为 img 标签可用的格式 */
    const getRoomFilesForDisplay = async (roomId: string) => {
      const files = roomFilesMap[roomId] ? Object.values(roomFilesMap[roomId]) : []

      const processedFiles = await Promise.all(
        files.map(async (file) => {
          let displayUrl: string

          if (file.url.startsWith('http')) {
            // HTTP URL 直接使用
            displayUrl = file.url
          } else {
            // 相对路径需要拼接 BaseDirectory.AppData 的绝对路径
            const baseDirPath = isMobile() ? await appDataDir() : await appDataDir()
            const absolutePath = await join(baseDirPath, file.url)
            displayUrl = convertFileSrc(absolutePath)
          }

          return {
            ...file,
            // 将 URL 转换为可用于前端显示的格式
            displayUrl,
            // 保留原始 URL
            originalUrl: file.url
          }
        })
      )

      return processedFiles
    }

    /** 获取指定房间的文件总数 */
    const getRoomFileCount = computed(() => (roomId: string) => {
      return roomFilesMap[roomId] ? Object.keys(roomFilesMap[roomId]).length : 0
    })

    // ==================== 操作方法 ====================

    /**
     * 添加文件到指定房间
     */
    const addFile = (fileInfo: FileInfo) => {
      const { roomId, id } = fileInfo

      if (!roomFilesMap[roomId]) {
        roomFilesMap[roomId] = {}
      }

      roomFilesMap[roomId][id] = fileInfo
    }

    /**
     * 移除指定房间的文件
     */
    const removeFile = (roomId: string, fileId: string) => {
      if (roomFilesMap[roomId] && roomFilesMap[roomId][fileId]) {
        delete roomFilesMap[roomId][fileId]
      }
    }

    /**
     * 清空指定房间的所有文件
     */
    const clearRoomFiles = (roomId: string) => {
      if (roomFilesMap[roomId]) {
        roomFilesMap[roomId] = {}
      }
    }

    /**
     * 获取指定文件信息
     */
    const getFile = (roomId: string, fileId: string): FileInfo | undefined => {
      return roomFilesMap[roomId]?.[fileId]
    }

    return {
      // 状态
      roomFilesMap: readonly(roomFilesMap),

      // 计算属性
      getRoomFiles,
      getRoomFileCount,

      // 方法
      addFile,
      removeFile,
      clearRoomFiles,
      getFile,
      getRoomFilesForDisplay
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
