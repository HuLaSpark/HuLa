<template>
  <nav class="safe-area-nav">
    <div class="flex items-center justify-between px-16px h-46px">
      <!-- 左侧返回按钮 -->
      <div v-if="showBack" class="flex items-center justify-center w-8 h-8 -ml-2 cursor-pointer" @click="handleBack">
        <svg
          class="w-5 h-5 text-gray-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </div>
      <div v-else class="w-8"></div>

      <!-- 标题 -->
      <h1 class="text-center text-base font-medium text-gray-800 flex-1 truncate px-2">
        {{ title }}
      </h1>

      <!-- 右侧插槽 -->
      <div class="w-8">
        <slot name="right"></slot>
      </div>
    </div>
  </nav>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'

interface NavBarProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
}

const props = withDefaults(defineProps<NavBarProps>(), {
  title: '',
  showBack: true
})

const emit = defineEmits<{
  (event: 'back'): void
}>()

const router = useRouter()

const handleBack = (): void => {
  if (props.onBack) {
    props.onBack()
  } else {
    emit('back')
    router.back()
  }
}
</script>
<style scoped lang="scss">
.safe-area-nav {
  @apply z-99999 fixed top-0 w-full bg-#e3e3e396 backdrop-blur-md;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: env(safe-area-inset-top);
  height: 44px;
}
</style>
