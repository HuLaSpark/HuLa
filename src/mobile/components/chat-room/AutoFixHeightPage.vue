<template>
  <div class="flex flex-1 flex-col">
    <!-- 页面容器 -->
    <div
      ref="pageContainer"
      :style="{ height: pageContainerHeight + 'px', maxHeight: pageContainerMaxHeight + 'px' }"
      class="flex fixed w-full bg-pink items-start bg-#F2F2F2 flex-col overflow-y-auto z-1">
      <div class="bg-white w-full h-auto">
        <slot name="header"></slot>
      </div>
      <!-- 消息内容区 -->
      <div ref="msgContainer" class="flex flex-col w-full flex-1 bg-yellow gap-2 overflow-y-auto msg-container">
        <div class="flex flex-col gap-2">
          <slot name="container"></slot>
        </div>
      </div>
    </div>

    <!-- 测量容器 -->
    <div ref="measureRef" class="bg-blue flex flex-1 z-0"></div>

    <div class="w-full min-h-92px bg-#FAFAFA flex flex-col z-2">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'

const pageContainer = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement>()

const pageContainerHeight = ref(100)
const pageContainerMaxHeight = ref(100)

const setPageContainerHeight = async () => {
  if (measureRef.value && pageContainer.value) {
    const measureHeight = measureRef.value.offsetHeight
    pageContainerHeight.value = measureHeight
    pageContainerMaxHeight.value = measureHeight
  }

  await nextTick()
}

const listenerMeasureRef = () => {
  const handler = (entries: ResizeObserverEntry[]) => {
    const newHeight = entries[0].contentRect.height
    pageContainerHeight.value = newHeight
  }

  const observer = new ResizeObserver(handler)

  if (!measureRef.value) {
    return
  }

  observer.observe(measureRef.value)
}

// 加载完成后
onMounted(async () => {
  // 等待渲染完成
  await nextTick()
  await setPageContainerHeight()
  listenerMeasureRef()
})
</script>

<style lang="scss">
.msg-container {
  box-sizing: border-box;
  overflow-y: auto;
}
</style>
