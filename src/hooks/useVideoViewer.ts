import { MsgEnum } from '@/enums'
import { useVideoViewer as useVideoViewerStore } from '@/stores/videoViewer'
import { useChatStore } from '@/stores/chat'
import { useWindow } from '@/hooks/useWindow'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

/** 视频处理 */
export const useVideoViewer = () => {
  const { createWebviewWindow } = useWindow()
  const VideoViewerStore = useVideoViewerStore()

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

  // 异步加载视频元数据
  const loadVideoMetaData = async (url: string) => {
    try {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'metadata'
      video.src = url

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
        setTimeout(() => reject(new Error('元数据加载超时')), 3000)
      })

      return {
        width: video.videoWidth || 800,
        height: video.videoHeight || 600
      }
    } catch {
      return { width: 800, height: 600 }
    }
  }

  /**
   * 视频加载处理
   * @param url 视频链接
   * @param includeTypes 支持类型
   */
  const openVideoViewer = async (url: string, includeTypes: MsgEnum[] = [MsgEnum.VIDEO]) => {
    if (!url) return
    try {
      const { list, index } = getAllMediaFromChat(url, includeTypes)

      VideoViewerStore.resetVideoListOptimized(list, index)
      VideoViewerStore.$patch({
        videoList: [...list],
        currentIndex: index,
        isSingleMode: list.length <= 1
      })

      // 检查现有窗口
      const existingWindow = await WebviewWindow.getByLabel('videoViewer')
      if (existingWindow) {
        await existingWindow.emit('video-updated', { list, index })
        await existingWindow.show()
        await existingWindow.setFocus()
        return
      }

      // 获取当前视频URL
      const currentVideoUrl = list[index]
      await createWebviewWindow('视频查看器', 'videoViewer', 800, 600, '', true, 800, 600)

      // 后台异步加载视频元数据以优化尺寸（不阻塞窗口创建）
      loadVideoMetaData(currentVideoUrl)
        .then((metadata) => {
          // 可以在这里发送事件来调整窗口大小
          console.log('视频元数据加载完成:', metadata)
        })
        .catch((error) => {
          console.warn('视频元数据加载失败:', error)
        })
    } catch (error) {
      console.error('视频查看器初始化失败:', error)
    }
  }

  return {
    openVideoViewer
  }
}
