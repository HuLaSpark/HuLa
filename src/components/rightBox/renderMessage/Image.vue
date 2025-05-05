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
          width: `${imageStyle.width}`,
          height: `${imageStyle.height}`,
          backgroundColor: '#c8c8c833'
        }"
        class="rounded-10px">
        <img class="size-24px select-none" src="@/assets/img/loading.svg" alt="loading" />
      </n-flex>
    </template>
    <template #error>
      <n-flex v-if="isError" align="center" justify="center" class="w-200px h-150px bg-#c8c8c833 rounded-10px">
        <svg class="size-34px color-[--chat-text-color]"><use href="#error-picture"></use></svg>
      </n-flex>
    </template>
  </n-image>
</template>

<script setup lang="ts">
import type { ImageBody } from '@/services/types'
import { MsgEnum } from '@/enums/index'
import { useImageViewer } from '@/hooks/useImageViewer'

const props = defineProps<{ body: ImageBody }>()
// 图片显示相关常量
const MAX_WIDTH = 320
const MAX_HEIGHT = 240
const MIN_WIDTH = 60
const MIN_HEIGHT = 60
// 错误状态控制
const isError = ref(false)
// 使用图片查看器hook
const { openImageViewer } = useImageViewer()

// 处理图片加载错误
const handleImageError = () => {
  isError.value = true
}

// 处理打开图片查看器
const handleOpenImageViewer = () => {
  if (props.body?.url) {
    openImageViewer(props.body.url, [MsgEnum.IMAGE, MsgEnum.EMOJI])
  }
}

/**
 * 计算图片样式
 */
const imageStyle = computed(() => {
  // 如果有原始尺寸，使用原始尺寸计算
  let width = props.body?.width
  let height = props.body?.height

  // 如果没有原始尺寸，使用默认尺寸
  if (!width || !height) {
    width = MAX_WIDTH
    height = MAX_HEIGHT
  }

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

  // 向上取整避免小数导致的抖动
  return {
    width: `${Math.ceil(finalWidth)}px`,
    height: `${Math.ceil(finalHeight)}px`
  }
})
</script>
