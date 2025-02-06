<template>
  <n-image
    v-if="body?.url"
    class="select-none cursor-pointer"
    :img-props="{ style: { height: getImageHeight + 'px' } }"
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
import { formatImage } from '@/utils/Formatting.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { useChatStore } from '@/stores/chat'
import { MsgEnum } from '@/enums/index'
import { useImageViewer } from '@/stores/imageViewer.ts'

const props = defineProps<{ body: ImageBody }>()
const chatStore = useChatStore()
const { createWebviewWindow } = useWindow()
const imageViewerStore = useImageViewer()

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

    await createWebviewWindow('图片查看', 'imageViewer', 630, 660, '', true, 630, 660)
  } catch (error) {
    console.error('打开图片查看器失败:', error)
  }
}

// 默认宽高
const DEFAULT_WIDTH = 200
const DEFAULT_HEIGHT = 150

/**
 * 核心就是的到高度，产生明确占位防止图片加载时页面抖动
 * @param width 宽度
 * @param height 高度
 */
const getImageHeight = computed(() => {
  // 使用可选链和空值合并运算符设置默认值
  const width = props.body?.width ?? DEFAULT_WIDTH
  const height = props.body?.height ?? DEFAULT_HEIGHT
  return formatImage(width, height)
})
</script>
