<template>
  <n-image
    v-if="body?.url"
    class="select-none cursor-pointer"
    :img-props="{
      style: {
        ...imageStyle
      }
    }"
    object-fit="cover"
    show-toolbar-tooltip
    preview-disabled
    style="border-radius: 8px"
    :src="body?.url"
    @dblclick="openImageViewer">
    <template #error>
      <n-flex align="center" justify="center" class="w-200px h-150px bg-#c8c8c833 rounded-10px">
        <svg class="size-34px color-[--chat-text-color]"><use href="#error-picture"></use></svg>
      </n-flex>
    </template>
  </n-image>
</template>

<script setup lang="ts">
import type { ImageBody } from '@/services/types'
import { useWindow } from '@/hooks/useWindow.ts'
import { useChatStore } from '@/stores/chat'
import { MsgEnum } from '@/enums/index'
import { useImageViewer } from '@/stores/imageViewer.ts'

const props = defineProps<{ body: ImageBody }>()
const chatStore = useChatStore()
const { createWebviewWindow } = useWindow()
const imageViewerStore = useImageViewer()
// 图片显示相关常量
const MAX_WIDTH = 320
const MAX_HEIGHT = 240
const MIN_WIDTH = 60
const MIN_HEIGHT = 60

// 获取当前聊天中的所有图片URL
const getAllImagesFromChat = () => {
  const messages = [...(chatStore.currentMessageMap?.values() || [])]
  const imageUrls: string[] = []
  let currentIndex = 0

  messages.forEach((msg) => {
    if (msg.message?.type === MsgEnum.IMAGE && msg.message.body?.url) {
      imageUrls.push(msg.message.body.url)
      // 找到当前图片的索引
      if (msg.message.body.url === props.body?.url) {
        currentIndex = imageUrls.length - 1
      }
    }
  })

  return {
    list: imageUrls,
    index: currentIndex
  }
}

// 打开图片查看器
const openImageViewer = async () => {
  if (!props.body?.url) return

  try {
    const { list, index } = getAllImagesFromChat()
    // 使用新的重置方法,自动去重并保持顺序
    imageViewerStore.resetImageList(list, index)

    // 获取当前图片的宽高
    const img = new Image()
    img.src = props.body.url

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

/**
 * 计算图片样式
 */
const imageStyle = computed(() => {
  const width = props.body?.width ?? MAX_WIDTH
  const height = props.body?.height ?? MAX_HEIGHT
  const aspectRatio = width / height

  let finalWidth = width
  let finalHeight = height

  // 如果图片太大,需要等比缩放
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    if (width / height > MAX_WIDTH / MAX_HEIGHT) {
      // 宽度超出更多,以最大宽度为基准缩放
      finalWidth = MAX_WIDTH
      finalHeight = MAX_WIDTH / aspectRatio
    } else {
      // 高度超出更多,以最大高度为基准缩放
      finalHeight = MAX_HEIGHT
      finalWidth = MAX_HEIGHT * aspectRatio
    }
  }

  // 确保不小于最小尺寸
  finalWidth = Math.max(finalWidth, MIN_WIDTH)
  finalHeight = Math.max(finalHeight, MIN_HEIGHT)

  return {
    width: `${finalWidth}px`,
    height: `${finalHeight}px`
  }
})
</script>
