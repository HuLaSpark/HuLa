<template>
  <div ref="containerRef" class="list-container" @scroll="handleScroll">
    <n-flex v-if="!isLoadingMore && isLast" justify="center" class="box-border absolute-x-center pt-10px">
      <span class="text-(12px #909090)">以下是全部消息内容</span>
    </n-flex>
    <n-flex v-if="isLoadingMore" justify="center" class="box-border absolute-x-center pt-10px loading-indicator">
      <img class="size-16px" src="@/assets/img/loading.svg" alt="" />
      <span class="text-(14px #909090)">加载中</span>
    </n-flex>
    <div class="list-content pt-26px">
      <div v-for="(item, index) in items" :key="item.message?.id" :id="`item-${item.message?.id}`">
        <slot :item="item" :index="index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: any[]
  estimatedItemHeight?: number
  buffer?: number
  isLoadingMore?: boolean
  isLast?: boolean
}>()

const emit = defineEmits<{
  scroll: [event: Event]
  scrollDirectionChange: [direction: 'up' | 'down']
}>()

// 容器元素引用
const containerRef = ref<HTMLElement | null>(null)
// 上次滚动位置
const lastScrollTop = ref(0)

// 滚动事件处理
const handleScroll = (event: Event) => {
  emit('scroll', event)

  if (!containerRef.value) return

  const currentScrollTop = containerRef.value.scrollTop

  // 发出滚动方向变化事件
  if (currentScrollTop < lastScrollTop.value) {
    emit('scrollDirectionChange', 'up')
  } else if (currentScrollTop > lastScrollTop.value) {
    emit('scrollDirectionChange', 'down')
  }

  lastScrollTop.value = currentScrollTop
}

// 类型定义
export type MessageListExpose = {
  scrollTo: (options: { index?: number; position?: 'top' | 'bottom'; behavior?: ScrollBehavior }) => void
  getContainer: () => HTMLElement | null
}

// 暴露方法和引用
defineExpose<MessageListExpose>({
  scrollTo: (options: { index?: number; position?: 'top' | 'bottom'; behavior?: ScrollBehavior }) => {
    if (!containerRef.value) return

    const executeScroll = () => {
      if (!containerRef.value) return

      if (options.position === 'bottom') {
        // 滚动到底部
        containerRef.value.scrollTo({
          top: containerRef.value.scrollHeight,
          behavior: options.behavior || 'auto'
        })
      } else if (options.position === 'top') {
        // 滚动到顶部
        containerRef.value.scrollTo({
          top: 0,
          behavior: options.behavior || 'auto'
        })
      } else if (typeof options.index === 'number' && options.index >= 0 && options.index < props.items.length) {
        // 滚动到指定索引位置
        const element = document.getElementById(`item-${props.items[options.index].message?.id}`)
        if (element) {
          element.scrollIntoView({
            behavior: options.behavior || 'auto',
            block: 'start'
          })
        }
      }
    }

    // 立即执行一次，并在短暂延迟后再次执行以确保内容已完全加载
    executeScroll()
    setTimeout(executeScroll, 100)
  },
  getContainer: () => containerRef.value
})
</script>

<style scoped>
.list-container {
  position: relative;
  overflow-y: auto;
  height: 100%;
}

.list-container::-webkit-scrollbar {
  width: 6px;
}

.list-container::-webkit-scrollbar-thumb {
  background-color: rgba(144, 144, 144, 0.3);
  border-radius: 3px;
  transition: background-color 0.3s;
  min-height: 75px;
  z-index: 999;
}

.list-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(144, 144, 144, 0.5);
}

.list-container::-webkit-scrollbar-track {
  background: transparent;
}

.list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  will-change: transform;
}

.loading-indicator {
  transition: opacity 0.3s ease;
  padding: 8px 0;
}
</style>
