<template>
  <div ref="containerRef" class="virtual-list-container" @scroll.passive="handleScroll">
    <n-flex v-if="!isLoadingMore && isLast" justify="center" class="box-border absolute-x-center pt-10px">
      <span class="text-(12px #909090)">以下是全部消息内容</span>
    </n-flex>
    <n-flex v-if="isLoadingMore" justify="center" class="box-border absolute-x-center pt-10px">
      <img class="size-16px" src="@/assets/img/loading.svg" alt="" />
      <span class="text-(14px #909090)">加载中</span>
    </n-flex>
    <div class="virtual-list-phantom" :style="{ height: `${totalHeight}px` }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offset}px)` }">
      <div v-for="item in visibleData" :key="item.message?.id" :id="`item-${item.message?.id}`">
        <slot :item="item" :index="item._index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

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

// 常量定义
const DEFAULT_ESTIMATED_HEIGHT = 90 // 默认预估的每项高度
const BUFFER_SIZE = props.buffer || 10 // 上下缓冲区域的数量
const OVERSCAN_SIZE = 1000 // 预渲染区域的像素高度，防止滚动时出现空白
const LOADING_OFFSET = 26 // 加载中需要的偏移量(26px是加载动画的高度)
const ESTIMATED_ITEM_HEIGHT = props.estimatedItemHeight || DEFAULT_ESTIMATED_HEIGHT // 每项的预估高度
const SCROLL_THROTTLE_DELAY = 16 // 滚动节流延迟时间(约60fps)

// 响应式引用
const containerRef = ref<HTMLElement | null>(null) // 容器元素引用
const offset = ref(0) // 内容区域的偏移量
const heights = ref<Map<string, number>>(new Map()) // 存储每个项目的实际高度，key为消息ID
const visibleRange = ref({ start: 0, end: 0 }) // 当前可见区域的起始和结束索引
const isScrolling = ref(false) // 是否正在滚动中
const rafId = ref<number | null>(null) // requestAnimationFrame的ID
const lastScrollTop = ref(0) // 上次滚动位置
const consecutiveStaticFrames = ref(0) // 连续静止帧计数
const accumulatedHeights = ref<number[]>([]) // 缓存累积高度数组

// ResizeObserver 实例
const resizeObserver = ref<ResizeObserver | null>(null)

// 缓存上一次的可见数据，用于加载更多时保持稳定
const lastVisibleData = ref<any[]>([])

// 计算可见项目
const visibleData = computed(() => {
  // 如果正在加载更多，保持当前可见项目不变
  if (props.isLoadingMore) {
    return lastVisibleData.value
  }

  // 根据可见范围切片并添加索引信息
  const data = props.items.slice(visibleRange.value.start, visibleRange.value.end + 1).map((item, index) => ({
    ...item,
    _index: visibleRange.value.start + index // 添加真实索引，用于渲染
  }))

  // 缓存最后一次的可见数据
  lastVisibleData.value = data
  return data
})

// 计算列表总高度（优化版）
const totalHeight = computed(() => {
  // 使用缓存的累积高度数组的最后一个值
  if (accumulatedHeights.value.length > 0) {
    return accumulatedHeights.value[accumulatedHeights.value.length - 1]
  }

  // 如果没有缓存，才进行完整计算
  return props.items.reduce((total, item) => {
    return total + (heights.value.get(item.message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT)
  }, 0)
})

// 计算累积高度（仅在数据变化时更新）
const updateAccumulatedHeights = () => {
  let totalHeight = 0
  accumulatedHeights.value = props.items.map((item) => {
    totalHeight += heights.value.get(item.message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT
    return totalHeight
  })
}

// 根据滚动位置计算起始索引（优化版）
const getStartIndex = (scrollTop: number) => {
  const target = scrollTop - OVERSCAN_SIZE
  let left = 0
  let right = accumulatedHeights.value.length - 1

  // 使用缓存的累积高度进行二分查找
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (accumulatedHeights.value[mid] < target) {
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return Math.max(0, left - BUFFER_SIZE)
}

// 计算指定索引的偏移量（优化版）
const getOffsetForIndex = (index: number) => {
  if (index <= 0) return 0
  if (index >= accumulatedHeights.value.length) return accumulatedHeights.value[accumulatedHeights.value.length - 1]
  return accumulatedHeights.value[index - 1] || 0
}

// 更新可见范围的节流版本
const updateVisibleRangeThrottled = useDebounceFn(() => {
  if (!containerRef.value) return

  const scrollTop = containerRef.value.scrollTop
  const clientHeight = containerRef.value.clientHeight

  // 计算起始索引
  const start = getStartIndex(scrollTop)
  let total = 0
  let end = start

  // 累加高度直到超过可视区域加上预渲染区域
  while (total < clientHeight + OVERSCAN_SIZE * 2 && end < props.items.length) {
    const itemHeight = heights.value.get(props.items[end].message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT
    total += itemHeight
    end++
  }

  // 确保结束索引不超出范围，并添加缓冲区
  end = Math.min(props.items.length - 1, end + BUFFER_SIZE)

  // 更新可见范围和偏移量
  visibleRange.value = { start, end }
  offset.value = getOffsetForIndex(start) + LOADING_OFFSET
}, SCROLL_THROTTLE_DELAY)

// 更新可见范围
const updateVisibleRange = () => {
  updateVisibleRangeThrottled()
}

// 批量更新函数
const batchUpdate = () => {
  // 更新累积高度缓存
  updateAccumulatedHeights()
  // 更新可见范围
  updateVisibleRange()
  // 更新实际高度
  nextTick(() => {
    updateItemHeight()
  })
}

// 监听列表数据变化（优化版）
watch(
  () => props.items,
  (newItems, oldItems) => {
    // 如果是加载更多，使用优化的更新策略
    if (props.isLoadingMore) {
      // 只更新累积高度缓存，其他更新推迟到加载完成后
      updateAccumulatedHeights()
      return
    }

    // 如果是完全重置或其他情况，执行完整更新
    if (newItems.length === 0 || oldItems.length === 0) {
      heights.value.clear()
    }

    // 使用批量更新
    batchUpdate()
  },
  { deep: false } // 移除深度监听，提高性能
)

// 监听加载状态变化
watch(
  () => props.isLoadingMore,
  (isLoading) => {
    if (!isLoading) {
      // 加载完成后执行一次完整的批量更新
      nextTick(() => {
        batchUpdate()
      })
    }
  },
  { deep: false }
)

// 更新项目实际高度（优化版）
const updateItemHeight = () => {
  if (!containerRef.value || props.isLoadingMore) return

  let heightsUpdated = false
  const updatedHeights = new Map()

  // 批量收集高度更新
  for (const item of visibleData.value) {
    const id = item.message?.id?.toString()
    if (!id) continue

    const el = document.getElementById(`item-${id}`)
    if (el) {
      const height = el.getBoundingClientRect().height
      if (heights.value.get(id) !== height) {
        updatedHeights.set(id, height)
        heightsUpdated = true
      }
    }
  }

  // 如果有高度更新，批量应用更新
  if (heightsUpdated) {
    // 批量更新高度缓存
    updatedHeights.forEach((height, id) => {
      heights.value.set(id, height)
    })

    // 更新累积高度缓存
    updateAccumulatedHeights()

    // 非滚动状态下更新可见范围
    if (!isScrolling.value) {
      updateVisibleRange()
    }
  }
}

// 更新可见范围的帧动画处理（优化版）
const updateFrame = () => {
  if (!containerRef.value || props.isLoadingMore) return

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
    // 使用节流的可见范围更新
    updateVisibleRangeThrottled()
    lastScrollTop.value = currentScrollTop
  } else {
    // 滚动位置未变化，增加静止帧计数
    consecutiveStaticFrames.value++

    // 如果连续3帧未发生滚动，认为滚动已结束
    if (consecutiveStaticFrames.value >= 3) {
      // 滚动结束，更新高度并停止动画
      isScrolling.value = false
      if (!props.isLoadingMore) {
        updateItemHeight()
      }
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
const handleScroll = useDebounceFn((event: Event) => {
  emit('scroll', event)

  // 标记滚动状态并开始帧动画
  if (!isScrolling.value) {
    isScrolling.value = true
    consecutiveStaticFrames.value = 0
    if (rafId.value === null) {
      rafId.value = requestAnimationFrame(updateFrame)
    }
  }
}, SCROLL_THROTTLE_DELAY)

onMounted(() => {
  // 初始化累积高度缓存
  updateAccumulatedHeights()
  // 初始化可见范围
  updateVisibleRange()

  // 使用 ResizeObserver 监听容器大小变化
  if (containerRef.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateAccumulatedHeights()
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
  -webkit-overflow-scrolling: touch; /* 在iOS上提供平滑滚动 */
}

.virtual-list-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background-color: rgba(144, 144, 144, 0.3);
  border-radius: 3px;
  transition: background-color 0.3s;
  min-height: 75px;
  z-index: 999;
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
  transform: translateZ(0); /* 启用GPU加速 */
  backface-visibility: hidden; /* 防止闪烁 */
  perspective: 1000; /* 增强3D效果 */
}
</style>
