<template>
  <div class="safe-area-placeholder" :style="computedStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMobileStore } from '@/stores/mobile'

const props = defineProps({
  direction: {
    type: String,
    required: true,
    validator: (value: string) => ['top', 'bottom'].includes(value)
  },
  bgColor: {
    type: String,
    default: 'transparent' // 默认透明背景
  }
})

const mobileStore = useMobileStore()
const envType = mobileStore.envType
const safeArea = computed(() => mobileStore.safeArea)

const computedStyle = computed(() => {
  const isAndroid = envType === 'android'
  const safeAreaValue = props.direction === 'top' ? safeArea.value.top : safeArea.value.bottom

  return {
    height: isAndroid ? `${safeAreaValue}px` : `env(safe-area-inset-${props.direction})`,
    width: '100%',
    backgroundColor: props.bgColor // 直接应用背景色
  }
})
</script>

<style scoped>
.safe-area-placeholder {
  flex-shrink: 0;
}
</style>
