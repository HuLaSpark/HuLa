<template>
  <n-image
    v-if="body?.url"
    class="select-none cursor-pointer"
    :img-props="{
      style: {
        maxWidth: '120px',
        maxHeight: '120px',
        objectFit: 'contain'
      }
    }"
    show-toolbar-tooltip
    preview-disabled
    style="border-radius: 8px; cursor: pointer !important"
    :src="body?.url"
    @dblclick="handleOpenImageViewer"
    @error="handleImageError">
    <template #placeholder>
      <n-flex
        v-if="!isError"
        align="center"
        justify="center"
        :style="{
          width: '120px',
          height: '120px',
          backgroundColor: '#c8c8c833'
        }"
        class="rounded-10px">
        <img class="size-24px select-none" src="@/assets/img/loading.svg" alt="loading" />
      </n-flex>
    </template>
    <template #error>
      <n-flex v-if="isError" align="center" justify="center" class="w-150px h-150px bg-#c8c8c833 rounded-10px">
        <svg class="size-34px color-[--chat-text-color]"><use href="#error-picture"></use></svg>
      </n-flex>
    </template>
  </n-image>
</template>

<script setup lang="ts">
import { MsgEnum } from '@/enums/index'
import { useImageViewer } from '@/hooks/useImageViewer'
import type { EmojiBody } from '@/services/types'

const props = defineProps<{
  body: EmojiBody
  onImageClick?: (url: string) => void
}>()
const isError = ref(false)
// 使用图片查看器hook
const { openImageViewer } = useImageViewer()

// 处理图片加载错误
const handleImageError = () => {
  isError.value = true
  console.error('表情包加载失败:', props.body.url)
}

// 处理打开图片查看器
const handleOpenImageViewer = () => {
  if (props.body?.url) {
    // 如果有自定义点击处理函数，使用它；否则使用默认逻辑
    if (props.onImageClick) {
      props.onImageClick(props.body.url)
    } else {
      openImageViewer(props.body.url, [MsgEnum.IMAGE, MsgEnum.EMOJI])
    }
  }
}
</script>
