<template>
  <n-tabs @update:value="onUpdate" :default-value="props.activeTabName" animated>
    <n-tab-pane display-directive="show:lazy" v-for="i in props.options" :key="i.name" :name="i.name" :tab="i.tab">
      <!-- 这里高度写死并不影响下面的高度修正，写高度超过TabBar以防用户手机卡顿看到突然的高度修正的效果视差 -->
      <div
        :ref="bindDynamicAreaRef(i.name)"
        :style="{ height: props.customHeight ? customHeight + 'px' : defaultHeight }"
        @scroll="handleScroll"
        class="flex flex-col gap-4 overflow-y-auto">
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

const defaultHeight = ref('90vh')

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

<style scoped></style>
