<template>
  <div class="float-block-container select-none" ref="containerRef">
    <n-virtual-list
      ref="virtualListRef"
      :style="{ maxHeight: maxHeight }"
      :items="dataSource"
      :item-size="itemHeight"
      :item-resize-observer="true"
      :key-field="itemKey || 'index'"
      @scroll="handleScroll">
      <template #default="{ item, index }">
        <div
          class="float-block"
          :data-index="index"
          :style="{ height: `${itemHeight}px` }"
          @mouseenter="handleItemMouseEnter(index)">
          <slot name="item" :item="item" :index="index">
            <!-- 默认渲染内容 -->
            <div class="p-[8px_10px] rounded-lg">{{ item }}</div>
          </slot>
        </div>
      </template>
    </n-virtual-list>
    <!-- 悬浮效果层 -->
    <div
      v-show="hoverPosition !== null"
      class="hover-effect"
      :style="{
        height: `${itemHeight}px`,
        opacity: props.hoverOpacity,
        top: `${hoverPosition}px`,
        display: isHoverPositionValid ? 'block' : 'none'
      }"></div>
  </div>
</template>

<script setup lang="ts">
// 定义组件的属性
const props = defineProps({
  // 数据源
  dataSource: {
    type: Array as () => any[],
    required: true
  },
  // 数据项唯一标识字段名
  itemKey: {
    type: String,
    default: ''
  },
  // 项目高度
  itemHeight: {
    type: Number,
    default: 64
  },
  // 最大高度
  maxHeight: {
    type: String,
    default: 'calc(100vh - 132px)'
  },
  // 悬浮项的透明度
  hoverOpacity: {
    type: Number,
    default: 0.06
  }
})

// 引用和状态
const containerRef = ref<HTMLElement | null>(null)
const virtualListRef = ref<any>(null)
const hoverPosition = ref<number | null>(null)
const currentHoverIndex = ref<number | null>(null)
const containerHeight = ref<number>(0)

// 计算属性：判断悬浮位置是否有效（是否在容器范围内）
const isHoverPositionValid = computed(() => {
  if (hoverPosition.value === null) return false

  // 确保悬浮位置 + 项目高度不超过容器高度
  return hoverPosition.value >= 0 && hoverPosition.value + props.itemHeight <= containerHeight.value
})

// 更新容器高度
const updateContainerHeight = () => {
  if (virtualListRef.value?.$el) {
    containerHeight.value = virtualListRef.value.$el.clientHeight
  }
}

// 处理滚动事件
const handleScroll = () => {
  // 更新容器高度
  updateContainerHeight()

  // 如果当前有悬浮项，更新其位置
  if (currentHoverIndex.value !== null) {
    updateHoverPositionByIndex(currentHoverIndex.value)
  }
}

// 处理列表项的鼠标进入事件
const handleItemMouseEnter = (index: number) => {
  // 设置当前悬停的索引
  currentHoverIndex.value = index

  // 获取当前悬停项的DOM元素
  const item =
    document.activeElement?.closest('.float-block') || (event?.target as HTMLElement)?.closest('.float-block')

  if (item) {
    // 获取元素相对于列表容器的位置
    const listEl = virtualListRef.value?.$el
    if (!listEl) return

    const itemRect = item.getBoundingClientRect()
    const listRect = listEl.getBoundingClientRect()

    // 设置悬浮效果的位置
    hoverPosition.value = itemRect.top - listRect.top

    // 更新容器高度
    updateContainerHeight()
  } else {
    // 如果找不到DOM元素，使用索引计算位置
    updateHoverPositionByIndex(index)
  }
}

// 根据索引获取实际渲染的DOM元素并更新悬浮效果位置
const updateHoverPositionByIndex = (index: number) => {
  if (!virtualListRef.value?.$el) return

  // 获取所有渲染的列表项元素
  const items = virtualListRef.value.$el.querySelectorAll('.float-block')
  if (!items.length) return

  // 获取虚拟列表的起始索引
  const startIndex = virtualListRef.value?.getOffset?.() || 0

  // 计算目标项在当前可视区域中的相对位置
  const relativeIndex = index - startIndex

  // 确保索引在可视范围内
  if (relativeIndex < 0 || relativeIndex >= items.length) {
    // 如果不在可视范围内，隐藏悬浮效果
    hoverPosition.value = null
    return
  }

  // 获取目标元素
  const targetItem = items[relativeIndex]
  if (!targetItem) {
    hoverPosition.value = null
    return
  }

  // 获取目标元素相对于虚拟列表容器的位置
  const listContainer = virtualListRef.value.$el
  const targetRect = targetItem.getBoundingClientRect()
  const listRect = listContainer.getBoundingClientRect()

  // 计算目标元素相对于列表容器的顶部偏移量
  hoverPosition.value = targetRect.top - listRect.top

  // 更新容器高度
  updateContainerHeight()
}

// 处理容器的鼠标离开事件
const handleMouseLeave = () => {
  hoverPosition.value = null
  currentHoverIndex.value = null
}

// 在组件挂载时添加事件监听
onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('mouseleave', handleMouseLeave)
  }

  // 初始化容器高度
  updateContainerHeight()

  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerHeight)
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('mouseleave', handleMouseLeave)
  }

  // 移除窗口大小变化监听
  window.removeEventListener('resize', updateContainerHeight)
})

// 暴露滚动到顶部/底部方法
defineExpose({
  scrollToTop: () => {
    if (virtualListRef.value) {
      virtualListRef.value.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  scrollToBottom: () => {
    if (virtualListRef.value && virtualListRef.value.$el) {
      const scrollContainer = virtualListRef.value.$el
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight
        virtualListRef.value.scrollTo({ top: scrollHeight, behavior: 'smooth' })
      }
    }
  }
})
</script>

<style scoped lang="scss">
.float-block-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.float-block {
  width: 100%;
  cursor: pointer;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

.hover-effect {
  position: absolute;
  left: 0;
  width: 100%;
  background: var(--float-block-hover-color, rgba(0, 0, 0, 0.1));
  pointer-events: none;
  transition: top 0.2s ease-in-out;
  z-index: 0;
}
</style>
