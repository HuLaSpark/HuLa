import { convertFileSrc } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { MsgEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow'
import { useChatStore } from '@/stores/chat'
import { useFileDownloadStore } from '@/stores/fileDownload'
import { useImageViewer as useImageViewerStore } from '@/stores/imageViewer'
import type { FilesMeta } from '@/services/types'
import { extractFileName } from '@/utils/Formatting'
import { getFilesMeta } from '@/utils/PathUtil'

type WorkerResponse = {
  success: boolean
  url: string
  buffer?: ArrayBuffer
  error?: string
}

type WorkerRequest = {
  resolve: (value: string | null) => void
  reject: (reason?: unknown) => void
  fileName: string
}

const workerRequests = new Map<string, WorkerRequest>()
let imageDownloadWorker: Worker | null = null
const imageDownloaderWorkerUrl = new URL('../workers/imageDownloader.ts', import.meta.url)

const ensureWorker = () => {
  if (imageDownloadWorker || typeof window === 'undefined') return
  imageDownloadWorker = new Worker(imageDownloaderWorkerUrl, { type: 'module' })
  imageDownloadWorker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
    const { success, url, buffer, error } = event.data
    const request = workerRequests.get(url)
    if (!request) {
      return
    }
    workerRequests.delete(url)

    if (!success || !buffer) {
      request.reject(new Error(error || '下载失败'))
      return
    }

    try {
      const fileDownloadStore = useFileDownloadStore()
      const absolutePath = await fileDownloadStore.saveFileFromBytes(url, request.fileName, new Uint8Array(buffer))
      request.resolve(absolutePath)
    } catch (err) {
      request.reject(err)
    }
  }
}

const downloadImageWithWorker = (url: string, fileName: string) => {
  ensureWorker()
  if (!imageDownloadWorker) {
    return Promise.reject(new Error('Web Worker 不可用'))
  }

  const existing = workerRequests.get(url)
  if (existing) {
    return new Promise<string | null>((resolve, reject) => {
      const prevResolve = existing.resolve
      const prevReject = existing.reject
      existing.resolve = (value) => {
        prevResolve(value)
        resolve(value)
      }
      existing.reject = (reason) => {
        prevReject(reason)
        reject(reason)
      }
    })
  }

  const promise = new Promise<string | null>((resolve, reject) => {
    workerRequests.set(url, { resolve, reject, fileName })
    imageDownloadWorker!.postMessage({ url })
  })

  return promise
}

const deduplicateList = (list: string[]) => {
  const uniqueList: string[] = []
  const seen = new Set<string>()
  list.forEach((url) => {
    if (url && !seen.has(url)) {
      seen.add(url)
      uniqueList.push(url)
    }
  })
  return uniqueList
}

/**
 * 图片查看器Hook，用于处理图片和表情包的查看功能
 */
export const useImageViewer = () => {
  const chatStore = useChatStore()
  const { createWebviewWindow } = useWindow()
  const imageViewerStore = useImageViewerStore()
  const fileDownloadStore = useFileDownloadStore()

  const ensureLocalFileExists = async (url: string) => {
    if (!url) return null
    const status = fileDownloadStore.getFileStatus(url)
    const validatePath = async (absolutePath: string | undefined | null) => {
      if (!absolutePath) {
        return null
      }
      try {
        const [meta] = await getFilesMeta<FilesMeta>([absolutePath])
        if (meta?.exists) {
          return absolutePath
        }
        return null
      } catch (error) {
        console.error('检查本地图片失败:', error)
        return null
      }
    }

    if (status?.isDownloaded) {
      const validPath = await validatePath(status.absolutePath)
      if (validPath) {
        return validPath
      }

      fileDownloadStore.updateFileStatus(url, {
        isDownloaded: false,
        absolutePath: '',
        localPath: '',
        nativePath: '',
        displayPath: '',
        status: 'pending',
        progress: 0
      })
    }

    const fileName = extractFileName(url)
    if (!fileName) {
      return null
    }

    try {
      const exists = await fileDownloadStore.checkFileExists(url, fileName)
      if (!exists) {
        return null
      }

      const refreshedStatus = fileDownloadStore.getFileStatus(url)
      return await validatePath(refreshedStatus.absolutePath)
    } catch (error) {
      console.error('重新检查本地图片失败:', error)
      return null
    }
  }

  const getDisplayUrl = async (url: string) => {
    const localPath = await ensureLocalFileExists(url)
    if (localPath) {
      try {
        return convertFileSrc(localPath)
      } catch (error) {
        console.error('转换本地图片路径失败:', error)
      }
    }
    return url
  }

  const getLocalMediaPathFromChat = (url: string, includeTypes: MsgEnum[]) => {
    const messages = Object.values(chatStore.currentMessageMap || {})
    for (const msg of messages) {
      if (!includeTypes.includes(msg.message?.type)) continue
      if (msg.message.body?.url !== url) continue
      if (msg.message.body?.localPath) {
        return msg.message.body.localPath as string
      }
    }
    return null
  }

  const resolveDisplayUrl = async (url: string, includeTypes: MsgEnum[]) => {
    const localPath = getLocalMediaPathFromChat(url, includeTypes)
    if (localPath) {
      try {
        return convertFileSrc(localPath)
      } catch (error) {
        console.error('转换本地媒体路径失败:', error)
      }
    }
    return await getDisplayUrl(url)
  }

  const replaceImageWithLocalPath = (originalUrl: string, absolutePath: string) => {
    const index = imageViewerStore.originalImageList.indexOf(originalUrl)
    if (index === -1) {
      return
    }
    try {
      const displayUrl = convertFileSrc(absolutePath)
      imageViewerStore.updateImageAt(index, displayUrl)
      imageViewerStore.updateSingleImageSource(displayUrl)
    } catch (error) {
      console.error('替换本地图片路径失败:', error)
    }
  }

  const scheduleDownload = (originalUrl: string) => {
    const fileName = extractFileName(originalUrl) || `image-${Date.now()}.png`
    downloadImageWithWorker(originalUrl, fileName)
      .then((absolutePath) => {
        if (absolutePath) {
          replaceImageWithLocalPath(originalUrl, absolutePath)
        }
      })
      .catch((error) => {
        console.error('图片下载失败:', error)
      })
  }

  const downloadOriginalByIndex = (index: number) => {
    if (index < 0) {
      return
    }
    const originalUrl = imageViewerStore.originalImageList[index]
    if (!originalUrl) {
      return
    }
    const displayUrl = imageViewerStore.imageList[index]
    if (!displayUrl || displayUrl !== originalUrl) {
      return
    }
    scheduleDownload(originalUrl)
  }

  /**
   * 获取当前聊天中的所有图片和表情包URL
   * @param currentUrl 当前查看的URL
   * @param includeTypes 要包含的消息类型数组
   */
  const getAllMediaFromChat = (currentUrl: string, includeTypes: MsgEnum[] = [MsgEnum.IMAGE, MsgEnum.EMOJI]) => {
    const messages = [...Object.values(chatStore.currentMessageMap || {})]
    const mediaUrls: string[] = []
    let currentIndex = 0

    messages.forEach((msg) => {
      // 收集指定类型的媒体URL
      if (includeTypes.includes(msg.message?.type) && msg.message.body?.url) {
        mediaUrls.push(msg.message.body.url)
        // 找到当前媒体的索引
        if (msg.message.body.url === currentUrl) {
          currentIndex = mediaUrls.length - 1
        }
      }
    })

    return {
      list: mediaUrls,
      index: currentIndex
    }
  }

  /**
   * 打开图片查看器
   * @param url 要查看的URL
   * @param includeTypes 要包含在查看器中的消息类型
   * @param customImageList 自定义图片列表，用于聊天历史等场景
   */
  const openImageViewer = async (
    url: string,
    includeTypes: MsgEnum[] = [MsgEnum.IMAGE, MsgEnum.EMOJI],
    customImageList?: string[]
  ) => {
    if (!url) return

    try {
      let list: string[]
      let index: number

      if (customImageList && customImageList.length > 0) {
        // 使用自定义图片列表
        list = customImageList
        index = customImageList.indexOf(url)
        if (index === -1) {
          // 如果当前图片不在列表中，将其添加到列表开头
          list = [url, ...customImageList]
          index = 0
        }
      } else {
        // 使用默认逻辑从聊天中获取
        const result = getAllMediaFromChat(url, includeTypes)
        list = result.list
        index = result.index
      }

      const dedupedList = deduplicateList(list)
      const resolvedList = await Promise.all(dedupedList.map((item) => resolveDisplayUrl(item, includeTypes)))

      const targetIndex = dedupedList.indexOf(url)
      const resolvedIndex = targetIndex === -1 ? (index >= 0 ? index : 0) : targetIndex

      imageViewerStore.resetImageList(resolvedList, resolvedIndex, dedupedList)

      // 检查图片查看器窗口是否已存在
      const existingWindow = await WebviewWindow.getByLabel('imageViewer')

      if (existingWindow) {
        // 如果窗口已存在，更新图片内容并显示窗口
        await existingWindow.emit('update-image', { list: resolvedList, index: resolvedIndex })
        await existingWindow.show()
        await existingWindow.setFocus()
        return
      }

      const img = new Image()
      img.src = resolvedList[resolvedIndex] || url

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // 默认窗口尺寸（最小尺寸）
      const MIN_WINDOW_WIDTH = 630
      const MIN_WINDOW_HEIGHT = 660
      // 计算实际窗口尺寸（保留一定边距）
      const MARGIN = 100 // 窗口边距
      let windowWidth = MIN_WINDOW_WIDTH
      let windowHeight = MIN_WINDOW_HEIGHT

      // 获取屏幕尺寸
      const { width: screenWidth, height: screenHeight } = window.screen

      // 计算最大可用尺寸（考虑边距）
      const maxWidth = screenWidth - MARGIN * 2
      const maxHeight = screenHeight - MARGIN * 2

      // 保持图片比例计算窗口尺寸
      const imageRatio = img.width / img.height

      // 计算实际窗口尺寸
      if (img.width > MIN_WINDOW_WIDTH || img.height > MIN_WINDOW_HEIGHT) {
        if (imageRatio > maxWidth / maxHeight) {
          // 以宽度为基准
          windowWidth = Math.min(img.width + MARGIN, maxWidth)
          windowHeight = Math.max(windowWidth / imageRatio + MARGIN, MIN_WINDOW_HEIGHT)
        } else {
          // 以高度为基准
          windowHeight = Math.min(img.height + MARGIN, maxHeight)
          windowWidth = Math.max(windowHeight * imageRatio + MARGIN, MIN_WINDOW_WIDTH)
        }
      }

      // 创建窗口，使用计算后的尺寸
      await createWebviewWindow(
        '图片查看',
        'imageViewer',
        Math.round(windowWidth),
        Math.round(windowHeight),
        '',
        true,
        Math.round(windowWidth),
        Math.round(windowHeight)
      )
    } catch (error) {
      console.error('打开图片查看器失败:', error)
    }
  }

  return {
    getAllMediaFromChat,
    openImageViewer,
    downloadOriginalByIndex
  }
}
