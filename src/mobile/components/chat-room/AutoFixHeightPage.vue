<template>
  <div class="flex flex-1 flex-col">
    <!-- 页面容器 -->
    <div
      ref="pageContainer"
      :style="{ height: pageContainerHeight + 'px', maxHeight: pageContainerMaxHeight + 'px' }"
      class="flex fixed w-full items-start flex-col overflow-y-auto z-1">
      <div ref="headerRef" class="w-full">
        <slot name="header"></slot>
      </div>
      <!-- 消息内容区 -->
      <div ref="msgContainer" class="flex flex-col w-full flex-1 gap-2 overflow-y-auto msg-container">
        <div class="flex flex-col gap-2 flex-1">
          <slot name="container" :height="msgContainerHeight" :changedHeight="changedMsgContainerHeight"></slot>
        </div>
      </div>
    </div>

    <!-- 测量容器 -->
    <div ref="measureRef" class="flex flex-1 z-0"></div>

    <div v-if="props.showFooter" class="w-full min-h-25px bg-#FAFAFA flex flex-col z-2">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash-es'

const props = defineProps({
  showFooter: {
    type: Boolean,
    default: true
  }
})

const pageContainer = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement>()
const headerRef = ref<HTMLElement | null>(null)
const msgContainer = ref()

const pageContainerHeight = ref(100)
const pageContainerMaxHeight = ref(100)
const msgContainerHeight = ref(0)
const changedMsgContainerHeight = ref(0)

const setPageContainerHeight = async () => {
  if (measureRef.value && pageContainer.value) {
    const measureHeight = measureRef.value.offsetHeight
    pageContainerHeight.value = measureHeight
    pageContainerMaxHeight.value = measureHeight
  }

  await nextTick()
}

const listenerMeasureRef = () => {
  const headerHeight = headerRef.value?.offsetHeight || 0

  const setPageContainerHeight = debounce((newHeight) => {
    changedMsgContainerHeight.value = newHeight
  }, 30)

  const handler = (entries: ResizeObserverEntry[]) => {
    const newHeight = entries[0].contentRect.height - headerHeight
    // pageContainerHeight.value = newHeight
    // console.log('高度变化：', newHeight)
    msgContainerHeight.value = newHeight
    setPageContainerHeight(newHeight)
  }

  const observer = new ResizeObserver(handler)

  if (!measureRef.value) {
    return
  }

  observer.observe(measureRef.value)
}

const listenerMsgContainer = () => {
  const setChangedMsgContainerHeight = debounce((newHeight) => {
    console.log('防抖触发')
    changedMsgContainerHeight.value = newHeight
  }, 30)

  const handler = (entries: ResizeObserverEntry[]) => {
    const newHeight = entries[0].contentRect.height
    msgContainerHeight.value = newHeight

    setChangedMsgContainerHeight(newHeight)
  }

  const observer = new ResizeObserver(handler)

  if (!msgContainer.value) return

  observer.observe(msgContainer.value)
}

// 加载完成后
onMounted(() => {
  // 等待渲染完成
  nextTick()
  setPageContainerHeight()
  listenerMeasureRef()
  listenerMsgContainer()
})
</script>

<style lang="scss">
.msg-container {
  box-sizing: border-box;
  overflow-y: auto;
}
</style>
