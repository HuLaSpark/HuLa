import { appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { BaseDirectory, exists } from '@tauri-apps/plugin-fs'
import { MsgEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { useVideoViewer as useVideoViewerStore } from '@/stores/videoViewer'
import { isMobile } from '@/utils/PlatformConstants'

/** 视频处理 */
export const useVideoViewer = () => {
  const { createWebviewWindow } = useWindow()
  const VideoViewerStore = useVideoViewerStore()
  const userStore = useUserStore()

  // 获取视频文件名
  const getVideoFilename = (url: string) => {
    if (!url) return 'video.mp4'
    // 从URL中提取文件名
    const urlParts = url.split('/')
    const filename = urlParts[urlParts.length - 1]
    if (filename && filename.includes('.')) {
      return filename
    }
    return 'video.mp4'
  }

  // 获取省略显示的视频文件名
  const getVideoFilenameEllipsis = (url: string, maxLength: number = 20) => {
    const filename = getVideoFilename(url)
    if (filename.length <= maxLength) {
      return filename
    }

    // 找到最后一个点的位置（文件扩展名）
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex === -1) {
      // 没有扩展名，直接截断
      return filename.substring(0, maxLength - 3) + '...'
    }

    const extension = filename.substring(lastDotIndex)
    const nameWithoutExt = filename.substring(0, lastDotIndex)

    // 计算可用于文件名主体的长度（减去扩展名和省略号的长度）
    const availableLength = maxLength - extension.length - 3

    if (availableLength <= 0) {
      // 如果扩展名太长，只显示省略号和扩展名
      return '...' + extension
    }

    return nameWithoutExt.substring(0, availableLength) + '...' + extension
  }

  // 获取本地视频路径
  const getLocalVideoPath = async (url: string) => {
    if (!url) return ''
    const filename = getVideoFilename(url)
    const videosDir = await userStore.getUserRoomDir()
    return await join(videosDir, filename)
  }

  // 检查视频是否已下载到本地
  const checkVideoDownloaded = async (url: string) => {
    if (!url) return false
    try {
      const localPath = await getLocalVideoPath(url)
      if (localPath) {
        const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
        return await exists(localPath, { baseDir })
      }
    } catch (error) {
      console.error('检查视频下载状态失败:', error)
    }
    return false
  }

  // 获取视频的实际播放路径（本地路径优先）
  const getVideoPlayPath = async (url: string) => {
    const isDownloaded = await checkVideoDownloaded(url)
    if (isDownloaded) {
      const localPath = await getLocalVideoPath(url)
      // 使用与下载时一致的基础目录
      const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
      return await join(baseDirPath, localPath)
    }
    return url
  }

  // 媒体获取（支持类型过滤和索引定位）
  const getAllMediaFromChat = (url: string, includeTypes: MsgEnum[] = [MsgEnum.VIDEO]) => {
    const chatStore = useChatStore()
    const messages = [...Object.values(chatStore.currentMessageMap || {})]
    const mediaUrls: string[] = []
    let currentIndex = -1
    messages.forEach((msg) => {
      if (includeTypes.includes(msg.message?.type) && msg.message.body?.url) {
        const isTarget = msg.message.body.url === url
        mediaUrls.push(msg.message.body.url)
        // 在添加元素后判断是否目标URL
        if (isTarget) {
          currentIndex = mediaUrls.length - 1 // 使用数组最后一位索引
        }
      }
    })
    return {
      list: mediaUrls,
      index: Math.max(currentIndex, 0)
    }
  }

  /**
   * 视频加载处理
   * @param url 视频链接
   * @param includeTypes 支持类型
   * @param customVideoList 自定义视频列表，用于聊天历史等场景
   */
  const openVideoViewer = async (
    url: string,
    includeTypes: MsgEnum[] = [MsgEnum.VIDEO],
    customVideoList?: string[]
  ) => {
    if (isMobile()) return
    if (!url) return

    let list: string[]
    let index: number

    if (customVideoList && customVideoList.length > 0) {
      // 使用自定义视频列表
      list = customVideoList
      index = customVideoList.indexOf(url)
      if (index === -1) {
        // 如果当前视频不在列表中，将其添加到列表开头
        list = [url, ...customVideoList]
        index = 0
      }
    } else {
      // 使用默认逻辑从聊天中获取
      const result = getAllMediaFromChat(url, includeTypes)
      list = result.list
      index = result.index
    }

    // 为每个视频URL检查本地下载状态，优先使用本地路径
    const processedList = await Promise.all(
      list.map(async (videoUrl) => {
        return await getVideoPlayPath(videoUrl)
      })
    )

    // 找到当前视频在处理后列表中的索引
    const currentVideoPath = await getVideoPlayPath(url)
    const processedIndex = processedList.findIndex((path) => path === currentVideoPath || path === url)
    const finalIndex = processedIndex !== -1 ? processedIndex : index

    // 统一使用列表模式，不再区分单视频模式
    VideoViewerStore.resetVideoListOptimized(processedList, finalIndex)
    VideoViewerStore.$patch({
      videoList: [...processedList],
      currentVideoIndex: finalIndex
    })

    // 检查现有窗口
    const existingWindow = await WebviewWindow.getByLabel('videoViewer')
    if (existingWindow) {
      await existingWindow.emit('video-updated', {
        list: processedList,
        index: finalIndex,
        currentVideoPath
      })
      await existingWindow.show()
      await existingWindow.setFocus()
      return
    }

    await createWebviewWindow('视频查看器', 'videoViewer', 800, 600, '', true, 800, 600)
  }

  return {
    openVideoViewer,
    getLocalVideoPath,
    checkVideoDownloaded,
    getVideoFilename,
    getVideoFilenameEllipsis
  }
}
