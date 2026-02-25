<template>
  <div class="flex flex-col flex-1 min-h-0 relative">
    <img v-if="bgmURL" :src="bgmURL" class="absolute fixed top-0 left-0 w-full h-full z-0 dark:opacity-20" />
    <!-- 页面容器 -->
    <div class="flex w-full items-start flex-col flex-1 min-h-0 z-1">
      <div class="w-full" :class="{ 'pt-[var(--safe-area-inset-top)]': safeAreaRef }">
        <slot name="header"></slot>
      </div>
      <!-- 消息内容区 -->
      <div class="w-full flex-1 overflow-y-hidden min-h-0">
        <slot name="container"></slot>
      </div>
    </div>

    <slot v-if="showFooter" name="footer" class="z-1"></slot>
  </div>
</template>

<script setup lang="ts">
import bgImg from '@/assets/mobile/chat-home/background.webp'

const {
  showFooter = true,
  background = true,
  safeArea = true
} = defineProps<{
  showFooter?: boolean
  background?: string | boolean
  safeArea?: boolean
}>()

const bgmURL = computed(() => {
  return typeof background === 'boolean' && background ? bgImg : background
})

const safeAreaRef = useSafeArea(() => safeArea)

function useSafeArea(getter: () => boolean) {
  const safeArea = ref(true)
  // 移除脚手架提供的安全区域样式，交由组件自己控制
  const removeSafeArea = () => {
    safeArea.value = false
  }
  provide('removeSafeArea', removeSafeArea)
  return computed(() => safeArea.value && getter())
}
</script>

<style lang="scss"></style>
