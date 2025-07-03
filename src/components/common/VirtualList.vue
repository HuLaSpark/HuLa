<template>
  <div
    ref="containerRef"
    class="virtual-list-container"
    :class="{ 'hide-scrollbar': hideScrollbar }"
    @scroll.passive="handleScroll"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave">
    <n-flex v-if="!isLoadingMore && isLast" justify="center" class="box-border absolute-x-center pt-10px">
      <span class="text-(12px #909090)">以下是全部消息内容</span>
    </n-flex>
    <n-flex v-if="isLoadingMore && !isLast" justify="center" class="box-border absolute-x-center pt-10px">
      <img class="size-16px" src="@/assets/img/loading.svg" alt="" />
      <span class="text-(14px #909090)">加载中</span>
    </n-flex>
    <div class="virtual-list-phantom" :style="{ height: `${totalHeight}px` }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offset}px)` }">
      <div
        v-for="item in visibleData"
        :key="item.message?.id"
        :id="`item-${item.message?.id}`"
        :data-item-index="item._index">
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
  loadMore: []
  mouseenter: []
  mouseleave: []
}>()

// 常量定义
const DEFAULT_ESTIMATED_HEIGHT = 80 // 默认预估的每项高度
const BUFFER_SIZE = props.buffer || 5 // 上下缓冲区域的数量
const OVERSCAN_SIZE = 1000 // 预渲染区域的像素高度，防止滚动时出现空白
const MAX_CACHE_SIZE = 100 // 高度缓存的最大数量
const LOADING_OFFSET = 26 // 加载中需要的偏移量(26px是加载动画的高度)
const ESTIMATED_ITEM_HEIGHT = props.estimatedItemHeight || DEFAULT_ESTIMATED_HEIGHT // 每项的预估高度
const SCROLL_THRESHOLD = 26 // 滚动到顶部的阈值，用于触发加载更多
const DOM_CLEANUP_INTERVAL = 60000 // DOM清理间隔，默认1分钟

// 响应式引用
const containerRef = ref<HTMLElement | null>(null) // 容器元素引用
const offset = ref(0) // 内容区域的偏移量
const heights = ref<Map<string, number>>(new Map()) // 存储每个项目的实际高度，key为消息ID
const visibleRange = ref({ start: 0, end: 0 }) // 当前可见区域的起始和结束索引
const isScrolling = ref(false) // 是否正在滚动中
const rafId = ref<number | null>(null) // requestAnimationFrame的ID
const lastScrollTop = ref(0) // 上次滚动位置
const consecutiveStaticFrames = ref(0) // 连续静止帧计数
const accumulatedHeights = ref<number[]>([]) // 缓存累积高度，优化二分查找
const needsHeightRecalculation = ref(true) // 标记是否需要重新计算高度缓存
const hideScrollbar = ref(true) // 滚动条显示/隐藏
const cleanupTimerId = ref<number | null>(null) // 定时清理DOM的计时器ID
const previousVisibleIds = ref<Set<string>>(new Set()) // 上一次可见的项目ID集合

// ResizeObserver 实例
const resizeObserver = ref<ResizeObserver | null>(null)

const handleMouseEnter = () => {
  emit('mouseenter')
  hideScrollbar.value = false
}

const handleMouseLeave = () => {
  emit('mouseleave')
  hideScrollbar.value = true
}

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
      // 标记需要重新计算高度缓存
      needsHeightRecalculation.value = true
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

// 计算列表总高度 - 使用记忆化缓存优化性能
const totalHeight = computed(() => {
  // 如果需要重新计算累积高度，则重置缓存
  if (needsHeightRecalculation.value) {
    updateAccumulatedHeights()
    needsHeightRecalculation.value = false
  }

  // 如果有累积高度缓存，直接使用最后一个值
  if (accumulatedHeights.value.length > 0 && accumulatedHeights.value.length === props.items.length) {
    return accumulatedHeights.value[accumulatedHeights.value.length - 1]
  }

  // 回退到原始计算方法
  return props.items.reduce((total, item) => {
    return total + (heights.value.get(item.message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT)
  }, 0)
})

// 更新累积高度缓存
const updateAccumulatedHeights = () => {
  accumulatedHeights.value = []
  let totalHeight = 0

  props.items.forEach((item) => {
    totalHeight += heights.value.get(item.message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT
    accumulatedHeights.value.push(totalHeight)
  })
}

// 监听列表数据变化
watch(
  () => props.items,
  (newItems, oldItems) => {
    // 如果列表完全重置，清空高度缓存
    if (newItems.length === 0 || oldItems.length === 0) {
      heights.value.clear()
      accumulatedHeights.value = []
      previousVisibleIds.value.clear()
    }

    // 标记需要重新计算高度缓存
    needsHeightRecalculation.value = true

    // 数据变化时重新计算可见范围和更新高度
    updateVisibleRange()
    nextTick(() => {
      updateItemHeight()
    })
  },
  { deep: false }
)

// 监听可见数据变化，更新可见项目ID集合
watch(
  () => visibleData.value,
  (newVisibleData) => {
    // 更新当前可见项目的ID集合
    const currentVisibleIds = new Set(newVisibleData.map((item) => item.message?.id?.toString()).filter(Boolean))
    previousVisibleIds.value = currentVisibleIds
  },
  { deep: false }
)

// 清理不可见的DOM节点
const cleanupInvisibleDOMNodes = () => {
  if (!containerRef.value) return
  if (!containerRef.value) return

  // 获取当前可见项目的ID集合
  const currentVisibleIds = new Set(visibleData.value.map((item) => item.message?.id?.toString()).filter(Boolean))

  // 找出不再可见的项目ID
  const invisibleIds = Array.from(previousVisibleIds.value).filter((id) => !currentVisibleIds.has(id))

  // 更新上一次可见的项目ID集合
  previousVisibleIds.value = currentVisibleIds

  // 如果没有不可见的项目，直接返回
  if (invisibleIds.length === 0) return

  // 获取虚拟列表内容区域
  const contentEl = containerRef.value.querySelector('.virtual-list-content')
  if (!contentEl) return

  // 清理不可见的DOM节点
  let removedCount = 0
  for (const id of invisibleIds) {
    const el = document.getElementById(`item-${id}`)
    if (el && !el.hasAttribute('data-preserved')) {
      // 移除DOM节点
      el.remove()
      removedCount++
    }
  }

  // 如果移除了节点，触发垃圾回收
  if (removedCount > 0 && window.gc) {
    try {
      window.gc()
    } catch (e) {
      // 忽略错误，gc可能不可用
    }
  }
}

// 定时清理DOM节点
const startDOMCleanupTimer = () => {
  if (cleanupTimerId.value !== null) {
    clearInterval(cleanupTimerId.value)
  }

  cleanupTimerId.value = window.setInterval(() => {
    cleanupInvisibleDOMNodes()
  }, DOM_CLEANUP_INTERVAL)
}

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
      const oldHeight = heights.value.get(id)

      // 只有当高度发生变化时才更新缓存并标记需要重新计算
      if (oldHeight !== height) {
        heights.value.set(id, height)
        needsHeightRecalculation.value = true
      }
    }
  }

  // 清理过期缓存
  cleanupHeightCache()

  // 非滚动状态下更新可见范围
  if (!isScrolling.value) {
    updateVisibleRange()
  }
}

// 根据滚动位置计算起始索引 - 使用缓存优化二分查找
const getStartIndex = (scrollTop: number) => {
  // 如果需要重新计算累积高度，则更新缓存
  if (needsHeightRecalculation.value) {
    updateAccumulatedHeights()
    needsHeightRecalculation.value = false
  }

  // 二分查找 O(log n)
  let left = 0
  let right = accumulatedHeights.value.length - 1
  const target = scrollTop - OVERSCAN_SIZE

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

// 计算指定索引的偏移量 - 使用累积高度缓存优化
const getOffsetForIndex = (index: number) => {
  // 如果需要重新计算累积高度，则更新缓存
  if (needsHeightRecalculation.value) {
    updateAccumulatedHeights()
    needsHeightRecalculation.value = false
  }

  // 如果索引在缓存范围内，直接使用缓存值
  if (index > 0 && index < accumulatedHeights.value.length) {
    return accumulatedHeights.value[index - 1]
  }

  // 回退到原始计算方法
  let total = 0
  for (let i = 0; i < index; i++) {
    const itemHeight = heights.value.get(props.items[i].message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT
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
    const itemHeight = heights.value.get(props.items[end].message?.id?.toString()) || ESTIMATED_ITEM_HEIGHT
    total += itemHeight
    end++
  }

  // 确保结束索引不超出范围，并添加缓冲区
  end = Math.min(props.items.length - 1, end + BUFFER_SIZE)

  // 更新可见范围和偏移量
  visibleRange.value = { start, end }
  // 加上加载中需要的偏移量
  offset.value = getOffsetForIndex(start) + LOADING_OFFSET
}

// 更新可见范围的帧动画处理
const updateFrame = () => {
  if (!containerRef.value) return

  const currentScrollTop = containerRef.value.scrollTop

  // 检查是否需要加载更多
  if (currentScrollTop < SCROLL_THRESHOLD && !props.isLoadingMore && !props.isLast) {
    emit('loadMore')
  }

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

// 使用防抖处理滚动事件
const debouncedEmitScroll = useDebounceFn((event: Event) => {
  emit('scroll', event)
}, 16) // 约60fps的频率

// 滚动事件处理
const handleScroll = (event: Event) => {
  // 使用防抖发出滚动事件
  debouncedEmitScroll(event)

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
    // 使用防抖优化 ResizeObserver 回调
    const debouncedResize = useDebounceFn(() => {
      updateVisibleRange()
      nextTick(() => {
        updateItemHeight()
      })
    }, 100)

    resizeObserver.value = new ResizeObserver(() => {
      debouncedResize()
    })
    resizeObserver.value.observe(containerRef.value)
  }

  // 初始化高度计算
  nextTick(() => {
    updateItemHeight()
    // 初始化累积高度缓存
    updateAccumulatedHeights()
  })

  // 启动DOM清理定时器
  startDOMCleanupTimer()
})

onUnmounted(() => {
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

  // 清理定时器
  if (cleanupTimerId.value !== null) {
    clearInterval(cleanupTimerId.value)
    cleanupTimerId.value = null
  }

  // 清理缓存
  heights.value.clear()
  accumulatedHeights.value = []
  previousVisibleIds.value.clear()
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
          // 确保累积高度已更新
          if (needsHeightRecalculation.value) {
            updateAccumulatedHeights()
            needsHeightRecalculation.value = false
          }
          nextTick(() => {
            if (containerRef.value) {
              // 使用 scrollTo 代替直接设置 scrollTop，提高兼容性
              containerRef.value.scrollTo({
                top: totalHeight.value,
                behavior: options.behavior || 'auto'
              })
            }
          })
        })
      } else if (options.position === 'top') {
        // 滚动到顶部
        containerRef.value.scrollTo({
          top: 0,
          behavior: options.behavior || 'auto'
        })
      } else if (typeof options.index === 'number') {
        // 滚动到指定索引位置
        // 确保累积高度已更新
        if (needsHeightRecalculation.value) {
          updateAccumulatedHeights()
          needsHeightRecalculation.value = false
        }
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

<style scoped lang="scss">
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  height: 100%;
  -webkit-overflow-scrolling: touch; /* 在iOS上提供平滑滚动 */
  overscroll-behavior: contain; /* 防止滚动传播到父元素 */
  box-sizing: border-box;
  /* 始终保留滚动条空间 */
  scrollbar-gutter: stable;
  /* 为滚动条预留空间 */
  padding-right: 6px;
  /* 兼容性写法，确保在各种浏览器中都有一致的滚动条空间 */
  overflow-y: scroll;
  overscroll-behavior: none; /* 禁止mac的“触底反弹”效果 */

  /* 滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
    transition-property: opacity;
    transition-duration: 0.3s;
    transition-timing-function: ease;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 144, 144, 0.3);
    border-radius: 3px;
    transition-property: opacity, background-color;
    transition-duration: 0.3s;
    transition-timing-function: ease;
    min-height: 75px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 144, 144, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  /* 使用WebKit兼容的方式隐藏滚动条 */
  &.hide-scrollbar {
    /* 保持滚动功能但隐藏滚动条 */
    &::-webkit-scrollbar {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: transparent;
    }
    /* 为了保持布局稳定 */
    margin-right: 0;
    padding-right: 12px; /* 6px原始 + 6px补偿 */
  }

  &.show-scrollbar {
    scrollbar-gutter: auto;
  }
}

.virtual-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 6px; /* 为滚动条预留空间 */
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  left: 0;
  right: 6px; /* 为滚动条预留空间 */
  top: 0;
  will-change: transform;
  transform: translateZ(0); /* 启用GPU加速 */
  backface-visibility: hidden; /* 防止闪烁 */
  perspective: 1000; /* 增强3D效果 */
}
</style>
