<template>
  <div class="float-block-container">
    <n-scrollbar ref="scrollbarRef" :style="{ maxHeight: maxHeight }" @scroll="handleScroll($event)">
      <n-flex vertical :size="0" class="z-10 box-border w-full">
        <div
          v-for="(item, index) in dataSource"
          :key="itemKey ? item[itemKey] : index"
          class="float-block"
          :style="{ height: `${itemHeight}px` }">
          <slot name="item" :item="item" :index="index">
            <!-- 默认渲染内容 -->
            <div class="p-[8px_10px] rounded-lg">{{ item }}</div>
          </slot>
        </div>
      </n-flex>
    </n-scrollbar>
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
    default: 68
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
  },
  // 样式表ID，避免冲突
  styleId: {
    type: String,
    default: 'float-hover-classes'
  }
})

// 滚动位置
const scrollTop = ref(0)
const scrollbarRef = ref<any>(null)

// 处理滚动事件
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
  updateHoverClasses()
}

// 更新悬浮样式
const updateHoverClasses = () => {
  const itemCount = props.dataSource.length
  if (itemCount === 0) return

  let styleStr = ''

  // 为每个项目创建悬浮样式规则
  for (let i = 0; i < itemCount - 1; i++) {
    styleStr += `
      .float-block:nth-child(${i + 1}):hover~.float-block:last-child::before {
        --y: calc(var(--height) * ${i} - ${scrollTop.value}px);
      }
    `
  }

  // 为最后一个项目添加样式规则
  styleStr += `.float-block:nth-child(${itemCount}):hover::before {
    --y: calc(var(--height) * ${itemCount - 1} - ${scrollTop.value}px);
    opacity: ${props.hoverOpacity};
  }`

  // 更新或创建样式标签
  const styleTag = document.getElementById(props.styleId)
  if (styleTag) styleTag.remove()

  const style = document.createElement('style')
  style.id = props.styleId
  style.innerHTML = styleStr
  document.head.appendChild(style)
}

// 更新数据源时更新悬浮效果
watch(
  () => props.dataSource,
  () => {
    nextTick(() => {
      updateHoverClasses()
    })
  },
  { deep: true }
)

// 监听高度变化
watch(
  () => props.itemHeight,
  () => {
    const container = document.querySelector('.float-block-container')
    const styleTag = container?.querySelector('style')
    if (styleTag) {
      styleTag.innerHTML = `.float-block { --height: ${props.itemHeight}px; }`
    }
    updateHoverClasses()
  }
)

// 在组件挂载时初始化
onMounted(() => {
  // 添加高度样式
  const styleTag = document.createElement('style')
  styleTag.innerHTML = `.float-block { --height: ${props.itemHeight}px; }`
  const container = document.querySelector('.float-block-container')
  if (container) {
    container.appendChild(styleTag)
  }

  // 初始化悬浮效果
  nextTick(() => {
    updateHoverClasses()
  })
})

// 组件卸载时清理
onUnmounted(() => {
  const styleTag = document.getElementById(props.styleId)
  if (styleTag) styleTag.remove()
})

// 暴露滚动到顶部/底部方法
defineExpose({
  scrollToTop: () => {
    if (scrollbarRef.value) {
      scrollbarRef.value.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  scrollToBottom: () => {
    if (scrollbarRef.value && scrollbarRef.value.$el) {
      const scrollContainer = scrollbarRef.value.$el.querySelector('.n-scrollbar-container')
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight
        scrollbarRef.value.scrollTo({ top: scrollHeight, behavior: 'smooth' })
      }
    }
  }
})
</script>

<style scoped lang="scss">
.float-block-container {
  position: relative;
  width: 100%;
}

.float-block {
  --y: 0;
  /* --height 在JS中设置 */
  --surface-2: var(--float-block-hover-color);

  width: 100%;
  cursor: pointer;
  box-sizing: border-box;
}

.float-block:last-child::before {
  content: '';
  display: block;
  position: absolute;
  background: var(--surface-2);
  opacity: 0;
  width: 100%;
  transform: translateY(var(--y));
  top: 0;
  left: 0;
  height: var(--height);
  pointer-events: none;
  transition: all 0.5s cubic-bezier(0.2, 1, 0.2, 1);
}

.float-block:hover ~ .float-block:last-child:before {
  opacity: v-bind('props.hoverOpacity');
}
</style>
