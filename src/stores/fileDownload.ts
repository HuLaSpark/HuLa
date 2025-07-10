import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { getFilesMeta, getUserAbsoluteVideosDir, getUserVideosDir } from '@/utils/PathUtil'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'
import { join, resourceDir } from '@tauri-apps/api/path'
import { writeFile, exists } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { FilesMeta } from '@/services/types'

export interface FileDownloadStatus {
  /** 文件是否已下载 */
  isDownloaded: boolean
  /** 本地文件相对路径 (相对于 Resource 目录) */
  localPath?: string
  /** 本地文件绝对路径 */
  absolutePath?: string
  /** 原生路径格式 (用于文件操作) */
  nativePath?: string
  /** 显示路径格式 (规范化后) */
  displayPath?: string
  /** 下载状态 */
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  /** 下载进度 */
  progress?: number
  /** 错误信息 */
  error?: string
}

export const useFileDownloadStore = defineStore(
  StoresEnum.FILE_DOWNLOAD,
  () => {
    const userStore = useUserStore()
    const globalStore = useGlobalStore()

    // 存储文件下载状态的Map，key为文件URL，value为下载状态
    const downloadStatusMap = ref<Map<string, FileDownloadStatus>>(new Map())

    /**
     * 获取文件下载状态
     * @param fileUrl 文件URL
     */
    const getFileStatus = (fileUrl: string): FileDownloadStatus => {
      return (
        downloadStatusMap.value.get(fileUrl) || {
          isDownloaded: false,
          status: 'pending'
        }
      )
    }

    /**
     * 更新文件下载状态
     * @param fileUrl 文件URL
     * @param status 状态更新
     */
    const updateFileStatus = (fileUrl: string, status: Partial<FileDownloadStatus>) => {
      const currentStatus = getFileStatus(fileUrl)
      const newStatus = { ...currentStatus, ...status }
      downloadStatusMap.value.set(fileUrl, newStatus)
    }

    /**
     * 刷新文件消息的下载状态
     */
    const refreshFileDownloadStatus = async (options: {
      fileUrl: string
      userId: string
      roomId: string
      fileName: string
      exists?: boolean
    }) => {
      console.log('触发状态刷新：', options)
      const fileStatus = downloadStatusMap.value.get(options.fileUrl)

      const resetStatus = () => {
        if (fileStatus) {
          fileStatus.isDownloaded = false
          fileStatus.absolutePath = ''
          fileStatus.displayPath = ''
          fileStatus.localPath = ''
          fileStatus.nativePath = ''
          fileStatus.progress = 0
          fileStatus.status = 'pending'
        }
      }

      const updateSuccess = (absolutePath: string) => {
        if (fileStatus) {
          const normalizedPath = absolutePath.replace(/\\/g, '/')
          fileStatus.isDownloaded = true
          fileStatus.nativePath = absolutePath
          fileStatus.absolutePath = absolutePath
          fileStatus.displayPath = normalizedPath
        }
      }

      const resourceDirPath = await getUserAbsoluteVideosDir(options.userId, options.roomId)
      const absolutePath = await join(resourceDirPath, options.fileName)

      // 如果直接知道文件不存在，那就直接刷新，如果不知道则再做处理
      if (Object.prototype.hasOwnProperty.call(options, 'exists')) {
        if (options.exists && fileStatus?.isDownloaded) {
          console.log('匹配1')
          return
        }

        if (options.exists) {
          console.log('匹配2')
          updateSuccess(absolutePath)
          return
        }

        if (options.exists && !fileStatus?.isDownloaded) {
          console.log('匹配3')
          updateSuccess(absolutePath)
          return
        }

        if (!options.exists && fileStatus?.isDownloaded) {
          console.log('匹配4')
          resetStatus()
          return
        }

        if (!options.exists && fileStatus?.isDownloaded) {
          console.log('匹配5')
          resetStatus()
          return
        }
        console.log('匹配6')

        resetStatus()
        return
      }

      // 这是匹配未查找到exists字段的逻辑
      const result = await getFilesMeta<FilesMeta>([absolutePath || options.fileUrl])
      const fileMeta = result[0]

      if (fileMeta.exists) {
        // 把状态更新为完成
        updateSuccess(absolutePath)
        console.log('匹配7')
      } else {
        // 把状态更新为未完成
        resetStatus()
        console.log('匹配8')
      }
    }

    /**
     * 检查文件是否已下载
     * @param fileUrl 文件URL
     * @param fileName 文件名
     */
    const checkFileExists = async (fileUrl: string, fileName: string): Promise<boolean> => {
      try {
        const userUid = userStore.userInfo.uid
        const roomId = globalStore.currentSession.roomId

        if (!userUid || !roomId) return false

        const downloadsDir = await getUserVideosDir(userUid.toString(), roomId.toString())
        const filePath = await join(downloadsDir, fileName)

        const fileExists = await exists(filePath, { baseDir: BaseDirectory.Resource })

        if (fileExists) {
          // 文件存在，构建绝对路径并更新状态
          const resourceDirPath = await resourceDir()
          const absolutePath = await join(resourceDirPath, filePath)

          // 保持原生路径格式用于文件操作，规范化路径用于显示
          const normalizedPath = absolutePath.replace(/\\/g, '/')

          updateFileStatus(fileUrl, {
            isDownloaded: true,
            localPath: filePath,
            absolutePath: absolutePath, // 使用原生路径格式
            nativePath: absolutePath, // 保存原生路径
            displayPath: normalizedPath, // 保存显示路径
            status: 'completed'
          })
        }

        return fileExists
      } catch (error) {
        console.error('检查文件是否存在失败:', error)
        return false
      }
    }

    /**
     * 下载文件
     * @param fileUrl 文件URL
     * @param fileName 文件名
     */
    const downloadFile = async (fileUrl: string, fileName: string): Promise<string | null> => {
      try {
        const userUid = userStore.userInfo.uid
        const roomId = globalStore.currentSession.roomId

        if (!userUid || !roomId) {
          throw new Error('用户或房间信息不完整')
        }

        // 检查文件是否已存在
        const isExists = await checkFileExists(fileUrl, fileName)
        if (isExists) {
          const existingStatus = getFileStatus(fileUrl)
          return existingStatus.localPath || null
        }

        // 更新状态为下载中
        updateFileStatus(fileUrl, {
          status: 'downloading',
          progress: 0
        })

        // 获取下载目录
        const downloadsDir = await getUserVideosDir(userUid.toString(), roomId.toString())
        const filePath = await join(downloadsDir, fileName)

        // 下载文件
        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`下载失败: ${response.status} ${response.statusText}`)
        }

        const contentLength = response.headers.get('content-length')
        const total = contentLength ? parseInt(contentLength, 10) : 0
        let downloaded = 0

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应流')
        }

        const chunks: Uint8Array[] = []

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          downloaded += value.length

          // 更新下载进度
          if (total > 0) {
            const progress = Math.round((downloaded / total) * 100)
            updateFileStatus(fileUrl, {
              status: 'downloading',
              progress
            })
          }
        }

        // 合并所有数据块
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const fileData = new Uint8Array(totalLength)
        let offset = 0

        for (const chunk of chunks) {
          fileData.set(chunk, offset)
          offset += chunk.length
        }

        // 写入文件
        await writeFile(filePath, fileData, { baseDir: BaseDirectory.Resource })

        // 构建绝对路径
        const resourceDirPath = await resourceDir()
        const absolutePath = await join(resourceDirPath, filePath)

        // 保持原生路径格式用于文件操作，规范化路径用于显示
        const normalizedPath = absolutePath.replace(/\\/g, '/')

        // 更新状态为完成
        updateFileStatus(fileUrl, {
          isDownloaded: true,
          localPath: filePath,
          absolutePath: absolutePath, // 使用原生路径格式
          nativePath: absolutePath, // 保存原生路径
          displayPath: normalizedPath, // 保存显示路径
          status: 'completed',
          progress: 100
        })

        console.log(`文件下载成功: ${normalizedPath}`)
        return absolutePath // 返回原生路径格式
      } catch (error) {
        console.error('文件下载失败:', error)

        // 更新状态为失败
        updateFileStatus(fileUrl, {
          status: 'failed',
          error: error instanceof Error ? error.message : '下载失败'
        })

        window.$message?.error(`文件下载失败: ${error instanceof Error ? error.message : '未知错误'}`)
        return null
      }
    }

    /**
     * 获取本地文件路径
     * @param fileUrl 文件URL
     * @param absolute 是否返回绝对路径，默认为 true
     */
    const getLocalPath = (fileUrl: string, absolute: boolean = true): string | null => {
      const status = getFileStatus(fileUrl)
      if (!status.isDownloaded) return null

      return absolute ? status.absolutePath || null : status.localPath || null
    }

    /**
     * 清理下载状态
     */
    const clearDownloadStatus = () => {
      downloadStatusMap.value.clear()
    }

    /**
     * 移除特定文件的下载状态
     * @param fileUrl 文件URL
     */
    const removeFileStatus = (fileUrl: string) => {
      downloadStatusMap.value.delete(fileUrl)
    }

    /**
     * 批量检查文件状态
     * @param fileInfos 文件信息数组
     */
    const batchCheckFileStatus = async (fileInfos: Array<{ url: string; fileName: string }>) => {
      const promises = fileInfos.map(({ url, fileName }) => checkFileExists(url, fileName))

      await Promise.all(promises)
    }

    return {
      downloadStatusMap: readonly(downloadStatusMap),
      getFileStatus,
      updateFileStatus,
      checkFileExists,
      downloadFile,
      getLocalPath,
      clearDownloadStatus,
      removeFileStatus,
      batchCheckFileStatus,
      refreshFileDownloadStatus
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
