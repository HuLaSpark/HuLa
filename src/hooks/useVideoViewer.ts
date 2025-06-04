import { MsgEnum } from '@/enums'
import { useVideoViewer as useVideoViewerStore } from '@/stores/videoViewer'
import { useChatStore } from '@/stores/chat'
import { useWindow } from '@/hooks/useWindow'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

// 增强型媒体获取（支持类型过滤和索引定位）
const getAllMediaFromChat = (url: string, includeTypes: MsgEnum[] = [MsgEnum.VIDEO]) => {
  const chatStore = useChatStore()
  const messages = [...(chatStore.currentMessageMap?.values() || [])]
  const mediaUrls: string[] = []
  let currentIndex = -1
  messages.forEach((msg) => {
    if (includeTypes.includes(msg.message?.type) && msg.message.body?.url) {
      const isTarget = msg.message.body.url === url
      mediaUrls.push(msg.message.body.url)
      // 修正点：在添加元素后判断是否目标URL
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
const openVideoViewer = async (url: string, includeTypes: MsgEnum[] = [MsgEnum.VIDEO]) => {
  if (!url) return
  try {
    const VideoViewerStore = useVideoViewerStore()
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
      await existingWindow.emit('video-updated', {
        payload: {
          list,
          index,
          timestamp: Date.now() // 添加时间戳防止缓存
        },
        callback: () => existingWindow.setFocus()
      })
      return
    }
    // 创建视频元素并配置自动播放
    const video = document.createElement('video')
    video.muted = true // 关键修复点：绕过macOS自动播放限制
    video.preload = 'auto'
    video.src = url

    // 增强型加载检测
    const loadCheck = Promise.race([
      new Promise((resolve) => (video.onloadeddata = resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('视频加载超时')), 5000))
    ])

    await loadCheck

    // 尺寸计算与窗口配置
    const [sizeResult] = await Promise.all([
      // 使用默认尺寸快速创建窗口
      Promise.resolve({
        windowWidth: 800,
        windowHeight: 600
      }),
      // 后台加载视频元数据（可选）
      loadVideoMetaData(url)
    ])

    const { createWebviewWindow } = useWindow()

    await createWebviewWindow(
      '视频查看器',
      'videoViewer',
      sizeResult.windowWidth,
      sizeResult.windowHeight,
      '',
      true,
      sizeResult.windowWidth,
      sizeResult.windowHeight
    )
  } catch (error) {
    console.error('视频查看器初始化失败:', error)
    handleVideoError(error) // 统一错误处理
  }
}

// 统一错误处理器
const handleVideoError = (error: unknown) => {
  const errorMsg = error instanceof Error ? error.message : '未知错误'
  const alertStr = `视频加载失败: ${errorMsg} [错误码: VID-${Date.now()}]`
  console.error(alertStr)
}
async function loadVideoMetaData(url: string) {
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
export const useVideoViewer = () => ({
  openVideoViewer
})
