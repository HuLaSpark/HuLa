<template>
  <div class="bg-[var(--center-bg-color)]">
    <img v-if="bgmURL" :src="bgmURL" class="object-cover absolute top-0 left-0 w-screen h-screen dark:opacity-20" />
    <div class="h-screen w-screen overflow-hidden flex flex-col relative">
      <header class="shrink-0 box-border" :class="{ 'pt-[var(--safe-area-inset-top)]': safeAreaRef }">
        <slot name="header"></slot>
      </header>
      <div class="flex-1 overflow-hidden grow-1">
        <slot name="container"></slot>
      </div>
      <footer
        class="shrink-0 footer box-border"
        :class="{ 'pb-[var(--safe-area-inset-bottom)]': slots.footer == void 0 }">
        <slot name="footer" class="pb-[var(--safe-area-inset-bottom)] box-border" />
      </footer>
    </div>
  </div>
</template>
<script setup lang="ts">
import bgImg from '@/assets/mobile/chat-home/background.webp'

const { background = true, safeArea = true } = defineProps<{
  showFooter?: boolean
  background?: string | boolean
  safeArea?: boolean
}>()

const slots = defineSlots<{
  header: () => unknown
  container: () => any
  footer: () => unknown
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

<style lang="scss" scoped>
.footer > :slotted(*) {
  padding-bottom: var(--safe-area-inset-bottom);
}
</style>
