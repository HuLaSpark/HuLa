<template>
  <div class="image" :style="{ height: getImageHeight + 'px' }">
    <template>
      <img v-if="body?.url" :src="body?.url" draggable="false" @error="handleError" :alt="body?.url" />
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ImageBody } from '@/services/types'
import { formatImage } from '@/utils/Formatting.ts'

const props = defineProps<{ body: ImageBody }>()

const hasLoadError = ref(false)
const isLoading = ref(true)

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

const handleError = () => {
  isLoading.value = false
  hasLoadError.value = true
}
</script>
