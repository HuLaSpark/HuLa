<template>
  <div
    ref="safeAreaRef"
    :class="[props.type === 'layout' ? 'safe-area-placeholder-layout' : 'safe-area-placeholder-keyboard']"
    :style="computedStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMobileStore } from '@/stores/mobile'

const props = defineProps<{
  type: 'layout' | 'keyboard'
  direction: 'top' | 'bottom' | 'left' | 'right'
  bgColor?: string
}>()

const mobileStore = useMobileStore()

const computedStyle = computed(() => {
  const direction = props.direction

  const safeAreaDirectionValue = mobileStore.safeArea[direction]
  const layoutHeight = direction === 'top' || direction === 'bottom' ? safeAreaDirectionValue + 'px' : '100vh'
  const layoutWidth = direction === 'top' || direction === 'bottom' ? '100vw' : safeAreaDirectionValue + 'px'

  const keyboardHeight = mobileStore.keyboardDetail.height - safeAreaDirectionValue + 'px'

  return {
    height:
      props.type === 'layout' ? layoutHeight : mobileStore.keyboardDetail.keyboardVisible ? keyboardHeight : '0px', // 0px的保底参数很重要，不能改
    width: layoutWidth, // 这个不用管是什么类型
    backgroundColor: props.bgColor // 直接应用背景色
  }
})

const emit = defineEmits(['rectUpdate'])

const safeAreaRef = ref()

defineExpose({
  blurInput: () => {
    const activeElement = document.activeElement as HTMLElement | null
    if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
      activeElement.blur()
    }
  }
})
</script>

<style>
.safe-area-placeholder-layout {
  flex-shrink: 0;
}

.safe-area-placeholder-keyboard {
  flex-shrink: 0;
  transition: height 0.15s ease;
}
</style>
