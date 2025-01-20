<template>
  <div
    ref="containerRef"
    class="pull-refresh relative overflow-auto"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd">
    <!-- 下拉指示器 -->
    <div
      class="refresh-indicator absolute left-0 right-0 z-10 w-full flex-center transform transition-transform duration-300 bg-white/80 backdrop-blur-sm"
      :class="[isRefreshing ? 'text-primary-500' : 'text-gray-400', { 'opacity-0': distance === 0 }]"
      :style="{
        top: '0',
        height: `${indicatorHeight}px`,
        transform: `translateY(-${indicatorHeight - distance}px)`
      }">
      <template v-if="isRefreshing">
        <n-spin size="small" />
        <span class="ml-2 text-sm">正在刷新...</span>
      </template>
      <template v-else>
        <div class="flex-center flex-col">
          <svg
            :class="[
              'color-#333 size-14px transition-transform duration-300',
              { 'rotate-180': distance >= threshold }
            ]">
            <use href="#arrow-down"></use>
          </svg>

          <span class="text-xs mt-1">
            {{ distance >= threshold ? '释放立即刷新' : '下拉可以刷新' }}
          </span>
        </div>
      </template>
    </div>

    <!-- 内容区域 -->
    <div
      ref="contentRef"
      class="transform transition-transform duration-300"
      :style="{
        transform: `translateY(${distance}px)`,
        minHeight: '100%'
      }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

type Props = {
  threshold?: number // 触发刷新的阈值
  indicatorHeight?: number // 指示器高度
  disabled?: boolean // 是否禁用下拉刷新
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 60,
  indicatorHeight: 50,
  disabled: false
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const containerRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const distance = ref(0)
const startY = ref(0)
const isRefreshing = ref(false)

// 处理触摸开始
const handleTouchStart = (e: TouchEvent) => {
  if (props.disabled || isRefreshing.value) return

  const scrollTop = containerRef.value?.scrollTop ?? 0
  // 只有在顶部才能下拉
  if (scrollTop <= 0) {
    startY.value = e.touches[0].clientY
  }
}

// 处理触摸移动
const handleTouchMove = (e: TouchEvent) => {
  if (props.disabled || !startY.value || isRefreshing.value) return

  const scrollTop = containerRef.value?.scrollTop ?? 0
  if (scrollTop > 0) return

  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value

  if (diff > 0) {
    e.preventDefault()
    // 使用阻尼系数让下拉变得越来越困难
    distance.value = Math.min(diff * 0.4, props.threshold * 1.5)
  }
}

// 处理触摸结束
const handleTouchEnd = () => {
  if (props.disabled || !startY.value) return

  if (distance.value >= props.threshold) {
    isRefreshing.value = true
    distance.value = props.indicatorHeight
    emit('refresh')
  } else {
    distance.value = 0
  }
  startY.value = 0
}

// 完成刷新
const finishRefresh = () => {
  isRefreshing.value = false
  distance.value = 0
}

// 暴露方法给父组件
defineExpose({
  finishRefresh
})

// 防止iOS橡皮筋效果
onMounted(() => {
  useEventListener(
    containerRef.value,
    'touchmove',
    (e: TouchEvent) => {
      if (!containerRef.value) return
      if (containerRef.value?.scrollTop <= 0 && e.touches[0].clientY > startY.value) {
        e.preventDefault()
      }
    },
    { passive: false }
  )
})
</script>

<style scoped>
.pull-refresh {
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.flex-center {
  @apply flex items-center justify-center;
}

.refresh-indicator {
  pointer-events: none;
}
</style>
