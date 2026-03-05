<template>
  <n-tabs @update:value="onUpdate" :default-value="props.activeTabName" animated class="h-full overflow-hidden tab">
    <n-tab-pane display-directive="show:lazy" v-for="i in props.options" :key="i.name" :name="i.name" :tab="i.tab">
      <div :ref="bindDynamicAreaRef(i.name)" @scroll="handleScroll" class="flex flex-col gap-4">
        <!-- 动态消息 -->
        <slot :name="i.name"></slot>
        <!-- 占位元素，避免最后一个动态消息紧贴tabbar -->
        <div class="w-full" style="height: 1px"></div>
      </div>
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { type PropType, ref, type VNodeRef } from 'vue'

const emit = defineEmits(['update', 'scroll'])

const handleScroll = (event: any) => {
  emit('scroll', event)
}

type DynamicRefs = Record<string, HTMLDivElement | null>
const dynamicAreaRefs = ref<DynamicRefs>({})

/** 用于绑定每个 tab 的 DOM 元素 */
const bindDynamicAreaRef = (name: string) => {
  return ((el: Element | ComponentPublicInstance | null) => {
    if (el instanceof Element) {
      dynamicAreaRefs.value[name] = el as HTMLDivElement
    } else {
      dynamicAreaRefs.value[name] = null // 或者做更复杂的处理
    }
  }) as VNodeRef
}

const props = defineProps({
  options: {
    type: Array as PropType<Array<{ name: string; tab: string }>>,
    required: false
  },
  activeTabName: {
    type: String,
    required: true
  },
  customHeight: {
    type: Number,
    required: false
  }
})

const currentTab = ref<string>(props.activeTabName)

const onUpdate = (newTab: string) => {
  console.log('组件内已触发 →', newTab)

  currentTab.value = newTab
  emit('update', newTab) // 通知父组件
}
</script>

<style scoped>
.tab :deep(.n-tabs-pane-wrapper) {
  flex-grow: 1;
  overflow-y: auto;
}
</style>
