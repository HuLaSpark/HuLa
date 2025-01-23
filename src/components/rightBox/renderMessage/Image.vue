<template>
  <n-image
    v-if="body?.url"
    class="select-none"
    :img-props="{ style: { height: getImageHeight + 'px' } }"
    show-toolbar-tooltip
    style="border-radius: 8px"
    :src="body?.url">
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

const props = defineProps<{ body: ImageBody }>()

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
