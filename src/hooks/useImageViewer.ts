import { MsgEnum } from '@/enums'
import { useImageViewer as useImageViewerStore } from '@/stores/imageViewer'
import { useChatStore } from '@/stores/chat'
import { useWindow } from '@/hooks/useWindow'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

/**
 * 图片查看器Hook，用于处理图片和表情包的查看功能
 */
export const useImageViewer = () => {
  const chatStore = useChatStore()
  const { createWebviewWindow } = useWindow()
  const imageViewerStore = useImageViewerStore()

  /**
   * 获取当前聊天中的所有图片和表情包URL
   * @param currentUrl 当前查看的URL
   * @param includeTypes 要包含的消息类型数组
   */
  const getAllMediaFromChat = (currentUrl: string, includeTypes: MsgEnum[] = [MsgEnum.IMAGE, MsgEnum.EMOJI]) => {
    const messages = [...(chatStore.currentMessageMap?.values() || [])]
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
   */
  const openImageViewer = async (url: string, includeTypes: MsgEnum[] = [MsgEnum.IMAGE, MsgEnum.EMOJI]) => {
    if (!url) return

    try {
      const { list, index } = getAllMediaFromChat(url, includeTypes)
      // 使用重置方法，自动去重并保持顺序
      imageViewerStore.resetImageList(list, index)

      // 检查图片查看器窗口是否已存在
      const existingWindow = await WebviewWindow.getByLabel('imageViewer')

      if (existingWindow) {
        // 如果窗口已存在，更新图片内容并显示窗口
        await existingWindow.emit('update-image', { list, index }) // 发送更新事件
        await existingWindow.show()
        await existingWindow.setFocus()
        return
      }

      // 获取当前图片的宽高
      const img = new Image()
      img.src = url

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
    openImageViewer
  }
}
