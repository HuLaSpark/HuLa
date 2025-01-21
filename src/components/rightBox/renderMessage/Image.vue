<template>
  <n-image
    v-if="body?.url"
    class="select-none"
    :img-props="{ style: { height: getImageHeight + 'px' } }"
    show-toolbar-tooltip
    style="border-radius: 8px"
    :fallback-src="'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
    :src="body?.url"></n-image>
</template>
<script setup lang="ts">
import type { ImageBody } from '@/services/types'
import { formatImage } from '@/utils/Formatting.ts'

const props = defineProps<{ body: ImageBody }>()

/**
 * 核心就是的到高度，产生明确占位防止图片加载时页面抖动
 * @param width 宽度
 * @param height 高度
 */
const getImageHeight = computed(() => {
  const { width, height } = props.body
  return formatImage(width, height)
})

// 没有图片的情况下计算出按比例的宽度
// const getWidthStyle = () => {
//   const { width, height } = props.body
//   return `width: ${(getImageHeight.value / height) * width}px`
// }
</script>
