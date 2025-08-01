<template>
  <div class="safe-area-placeholder" :style="computedStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMobileStore } from '@/stores/mobile'

const props = defineProps<{
  direction: 'top' | 'bottom' | 'left' | 'right'
  bgColor?: string
}>()

const mobileStore = useMobileStore()

const computedStyle = computed(() => {
  const direction = props.direction

  const safeAreaDirectionValue = mobileStore.safeArea[direction]
  const height = direction === 'top' || direction === 'bottom' ? safeAreaDirectionValue + 'px' : '100vh'
  const width = direction === 'top' || direction === 'bottom' ? '100vw' : safeAreaDirectionValue + 'px'

  return {
    height,
    width,
    backgroundColor: props.bgColor // 直接应用背景色
  }
})
</script>

<style>
.safe-area-placeholder {
  flex-shrink: 0;
}
</style>
