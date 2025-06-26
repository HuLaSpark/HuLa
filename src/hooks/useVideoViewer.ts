import { MsgEnum } from '@/enums'
import { useVideoViewer as useVideoViewerStore } from '@/stores/videoViewer'
import { useChatStore } from '@/stores/chat'
import { useWindow } from '@/hooks/useWindow'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getUserVideosDir } from '@/utils/PathUtil'
import { exists } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { join, resourceDir } from '@tauri-apps/api/path'
import { useCommon } from '@/hooks/useCommon.ts'
import { useGlobalStore } from '@/stores/global'

/** 视频处理 */
export const useVideoViewer = () => {
  const { createWebviewWindow } = useWindow()
  const VideoViewerStore = useVideoViewerStore()
  const { userUid } = useCommon()
  const globalStore = useGlobalStore()

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
    const roomId = globalStore.currentSession?.roomId
    if (!userUid.value || !roomId) return ''
    const videosDir = await getUserVideosDir(userUid.value, roomId)
    return await join(videosDir, filename)
  }

  // 检查视频是否已下载到本地
  const checkVideoDownloaded = async (url: string) => {
    if (!url) return false
    try {
      const localPath = await getLocalVideoPath(url)
      if (localPath) {
        return await exists(localPath, { baseDir: BaseDirectory.Resource })
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
      const resourceDirPath = await resourceDir()
      return await join(resourceDirPath, localPath)
    }
    return url
  }

  // 媒体获取（支持类型过滤和索引定位）
  const getAllMediaFromChat = (url: string, includeTypes: MsgEnum[] = [MsgEnum.VIDEO]) => {
    const chatStore = useChatStore()
    const messages = [...(chatStore.currentMessageMap?.values() || [])]
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
   */
  const openVideoViewer = async (url: string, includeTypes: MsgEnum[] = [MsgEnum.VIDEO]) => {
    if (!url) return

    const { list, index } = getAllMediaFromChat(url, includeTypes)

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

    VideoViewerStore.resetVideoListOptimized(processedList, finalIndex)
    VideoViewerStore.$patch({
      videoList: [...processedList],
      currentIndex: finalIndex,
      isSingleMode: processedList.length <= 1
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
