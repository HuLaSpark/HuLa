<template>
  <div ref="containerRef" class="virtual-list-container" @scroll="handleScroll">
    <div class="virtual-list-phantom" :style="{ height: `${totalHeight}px` }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offset}px)` }">
      <div v-for="item in visibleData" :key="item.message?.id" :id="`item-${item.message?.id}`">
        <slot :item="item" :index="item._index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: any[]
  estimatedItemHeight?: number
  buffer?: number
}>()

const emit = defineEmits<{
  scroll: [event: Event]
  scrollDirectionChange: [direction: 'up' | 'down']
}>()

// 常量定义
const DEFAULT_ESTIMATED_HEIGHT = 80 // 默认预估的每项高度
const BUFFER_SIZE = props.buffer || 5 // 上下缓冲区域的数量
const OVERSCAN_SIZE = 1000 // 预渲染区域的像素高度，防止滚动时出现空白
const estimatedItemHeight = props.estimatedItemHeight || DEFAULT_ESTIMATED_HEIGHT // 每项的预估高度
const MAX_CACHE_SIZE = 1000 // 高度缓存的最大数量

// 响应式引用
const containerRef = ref<HTMLElement | null>(null) // 容器元素引用
const offset = ref(0) // 内容区域的偏移量
const heights = ref<Map<string, number>>(new Map()) // 存储每个项目的实际高度，key为消息ID
const visibleRange = ref({ start: 0, end: 0 }) // 当前可见区域的起始和结束索引
const isScrolling = ref(false) // 是否正在滚动中
const rafId = ref<number | null>(null) // requestAnimationFrame的ID
const lastScrollTop = ref(0) // 上次滚动位置
const consecutiveStaticFrames = ref(0) // 连续静止帧计数

// ResizeObserver 实例
const resizeObserver = ref<ResizeObserver | null>(null)

// 清理过期的高度缓存
const cleanupHeightCache = () => {
  if (heights.value.size > MAX_CACHE_SIZE) {
    // 获取所有键并按照最近使用时间排序
    const keys = Array.from(heights.value.keys())
    const visibleKeys = new Set(
      props.items
        .slice(Math.max(0, visibleRange.value.start - BUFFER_SIZE), visibleRange.value.end + BUFFER_SIZE + 1)
        .map((item) => item.message?.id?.toString())
        .filter(Boolean)
    )

    // 保留可见区域的缓存
    const keysToDelete = keys.filter((key) => !visibleKeys.has(key))
    const deleteCount = keysToDelete.length - MAX_CACHE_SIZE / 2

    if (deleteCount > 0) {
      for (const key of keysToDelete.slice(0, deleteCount)) {
        heights.value.delete(key)
      }
    }
  }
}

// 计算可见项目
const visibleData = computed(() => {
  // 根据可见范围切片并添加索引信息
  return props.items.slice(visibleRange.value.start, visibleRange.value.end + 1).map((item, index) => ({
    ...item,
    _index: visibleRange.value.start + index // 添加真实索引，用于渲染
  }))
})

// 计算列表总高度
const totalHeight = computed(() => {
  // 累加所有项目的高度，如果没有缓存则使用预估高度
  return props.items.reduce((total, item) => {
    return total + (heights.value.get(item.message?.id?.toString()) || estimatedItemHeight)
  }, 0)
})

// 监听列表数据变化
watch(
  () => props.items,
  (newItems, oldItems) => {
    // 如果列表完全重置，清空高度缓存
    if (newItems.length === 0 || oldItems.length === 0) {
      heights.value.clear()
    }

    // 数据变化时重新计算可见范围和更新高度
    updateVisibleRange()
    nextTick(() => {
      updateItemHeight()
    })
  },
  { deep: true }
)

// 更新项目实际高度
const updateItemHeight = () => {
  if (!containerRef.value) return

  // 遍历可见项目，测量并缓存实际高度
  for (const item of visibleData.value) {
    const id = item.message?.id?.toString()
    if (!id) continue

    const el = document.getElementById(`item-${id}`)
    if (el) {
      const height = el.getBoundingClientRect().height
      heights.value.set(id, height)
    }
  }

  // 清理过期缓存
  cleanupHeightCache()

  // 非滚动状态下更新可见范围
  if (!isScrolling.value) {
    updateVisibleRange()
  }
}

// 根据滚动位置计算起始索引
const getStartIndex = (scrollTop: number) => {
  let total = 0
  let index = 0

  // 累加高度直到超过当前滚动位置减去预渲染区域
  while (total < scrollTop - OVERSCAN_SIZE && index < props.items.length) {
    const itemHeight = heights.value.get(props.items[index].message?.id?.toString()) || estimatedItemHeight
    total += itemHeight
    index++
  }

  // 返回计算后的索引，确保留有缓冲区
  return Math.max(0, index - BUFFER_SIZE)
}

// 计算指定索引的偏移量
const getOffsetForIndex = (index: number) => {
  let total = 0
  // 累加到目标索引前的所有项目高度
  for (let i = 0; i < index; i++) {
    const itemHeight = heights.value.get(props.items[i].message?.id?.toString()) || estimatedItemHeight
    total += itemHeight
  }
  return total
}

// 更新可见范围
const updateVisibleRange = () => {
  if (!containerRef.value) return

  const scrollTop = containerRef.value.scrollTop
  const clientHeight = containerRef.value.clientHeight

  // 计算起始索引
  const start = getStartIndex(scrollTop)
  let total = 0
  let end = start

  // 累加高度直到超过可视区域加上预渲染区域
  while (total < clientHeight + OVERSCAN_SIZE * 2 && end < props.items.length) {
    const itemHeight = heights.value.get(props.items[end].message?.id?.toString()) || estimatedItemHeight
    total += itemHeight
    end++
  }

  // 确保结束索引不超出范围，并添加缓冲区
  end = Math.min(props.items.length - 1, end + BUFFER_SIZE)

  // 更新可见范围和偏移量
  visibleRange.value = { start, end }
  offset.value = getOffsetForIndex(start)
}

// 更新可见范围的帧动画处理
const updateFrame = () => {
  if (!containerRef.value) return

  const currentScrollTop = containerRef.value.scrollTop

  // 检查滚动位置是否变化
  if (currentScrollTop !== lastScrollTop.value) {
    // 发生滚动，重置静止帧计数
    consecutiveStaticFrames.value = 0
    // 发出滚动方向变化事件
    if (currentScrollTop < lastScrollTop.value) {
      emit('scrollDirectionChange', 'up')
    } else if (currentScrollTop > lastScrollTop.value) {
      emit('scrollDirectionChange', 'down')
    }
    updateVisibleRange()
    lastScrollTop.value = currentScrollTop
  } else {
    // 滚动位置未变化，增加静止帧计数
    consecutiveStaticFrames.value++

    // 如果连续3帧未发生滚动，认为滚动已结束
    if (consecutiveStaticFrames.value >= 3) {
      // 滚动结束，更新高度并停止动画
      isScrolling.value = false
      updateItemHeight()
      if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value)
        rafId.value = null
      }
      return
    }
  }

  // 继续下一帧
  rafId.value = requestAnimationFrame(updateFrame)
}

// 滚动事件处理
const handleScroll = (event: Event) => {
  emit('scroll', event)

  // 标记滚动状态并开始帧动画
  if (!isScrolling.value) {
    isScrolling.value = true
    consecutiveStaticFrames.value = 0
    if (rafId.value === null) {
      rafId.value = requestAnimationFrame(updateFrame)
    }
  }
}

onMounted(() => {
  // 初始化可见范围
  updateVisibleRange()

  // 使用 ResizeObserver 监听容器大小变化
  if (containerRef.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateVisibleRange()
      nextTick(() => {
        updateItemHeight()
      })
    })
    resizeObserver.value.observe(containerRef.value)
  }

  // 初始化高度计算
  nextTick(() => {
    updateItemHeight()
  })
})

onBeforeUnmount(() => {
  // 清理动画
  if (rafId.value !== null) {
    cancelAnimationFrame(rafId.value)
    rafId.value = null
  }

  // 清理 ResizeObserver
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = null
  }

  // 清理缓存
  heights.value.clear()
})

// 类型定义
export type VirtualListExpose = {
  scrollTo: (options: { index?: number; position?: 'top' | 'bottom'; behavior?: ScrollBehavior }) => void
  getContainer: () => HTMLElement | null
}

// 暴露方法和引用
defineExpose<VirtualListExpose>({
  scrollTo: (options: { index?: number; position?: 'top' | 'bottom'; behavior?: ScrollBehavior }) => {
    if (!containerRef.value) return

    const executeScroll = () => {
      if (!containerRef.value) return

      if (options.position === 'bottom') {
        // 滚动到底部前确保高度已更新
        nextTick(() => {
          updateItemHeight()
          nextTick(() => {
            if (containerRef.value) {
              containerRef.value.scrollTop = totalHeight.value
            }
          })
        })
      } else if (options.position === 'top') {
        // 滚动到顶部
        containerRef.value.scrollTop = 0
      } else if (typeof options.index === 'number') {
        // 滚动到指定索引位置
        const offset = getOffsetForIndex(options.index)
        containerRef.value.scrollTo({
          top: offset,
          behavior: options.behavior || 'auto'
        })
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
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  height: 100%;
}

.virtual-list-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background-color: rgba(144, 144, 144, 0.3);
  border-radius: 3px;
  transition: background-color 0.3s;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(144, 144, 144, 0.5);
}

.virtual-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.virtual-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  will-change: transform;
}
</style>
