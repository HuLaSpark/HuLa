<template>
  <n-tabs @update:value="onUpdate" :default-value="props.activeTabName" animated>
    <n-tab-pane display-directive="show:lazy" v-for="i in props.options" :key="i.name" :name="i.name" :tab="i.tab">
      <!-- 这里高度写死并不影响下面的高度修正，写高度超过TabBar以防用户手机卡顿看到突然的高度修正的效果视差 -->
      <div
        :ref="bindDynamicAreaRef(i.name)"
        :style="{ height: computedHeight }"
        class="flex flex-col gap-4 overflow-y-auto">
        <!-- 动态消息 -->
        <slot :name="i.name"></slot>
        <!-- 占位元素，避免最后一个动态消息紧贴tabbar -->
        <div class="w-full bg-pink" style="height: 1px"></div>
      </div>
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { ref, type PropType, type VNodeRef } from 'vue'
import { calculateElementPosition } from '@/utils/DomCalculate'
import { useMobileStore } from '@/stores/mobile'

const emit = defineEmits(['update'])

const defaultHeight = '90vh'

const computedHeight = computed(() => {
  return defaultHeight
})

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
  }
})

const currentTab = ref<string>(props.activeTabName)

const onUpdate = (newTab: string) => {
  console.log('组件内已触发 →', newTab)

  currentTab.value = newTab
  emit('update', newTab) // 通知父组件
  requestAnimationFrame(() => {
    adjustDynamicArea(newTab) // 重新计算 tab 内容高度
  })
}

const mobileStore = useMobileStore()

const setDefaultHeight = (el: HTMLDivElement) => {
  // 设置默认高度
  const defaultHeight = '90vh'
  el.style.height = defaultHeight
}

const getDynamicAreaRef = (refName: string): HTMLDivElement => {
  const el = dynamicAreaRefs.value[refName]
  if (!el) {
    throw new Error(`[adjustDynamicArea] 未找到 ${refName} 的动态区域`)
  }

  return el
}

const updateElementHeight = (el: HTMLDivElement, elRect: DOMRect) => {
  let willSetHeight = 0
  const inputElementHeight = el.offsetHeight
  const inputElementBottomPosition = elRect.bottom
  const tabBarTop = mobileStore.bottomTabBarPosition.top
  const computedOffsetHeight = inputElementBottomPosition - tabBarTop
  const absOffsetHeight = Math.abs(computedOffsetHeight)

  // 如果它们误差在2个像素内，表示它们紧贴在一起，可以不做处理
  if (absOffsetHeight <= 2) {
    return
  }

  // 如果它们误差超过2个像素，表示它们存在比较明显的位置和高度偏差
  if (absOffsetHeight > 2) {
    // 这里就表示它高度已经穿透tabbar区域
    willSetHeight = willSetHeight + inputElementHeight - computedOffsetHeight //元素本身的高度减去多余的高度
  } else {
    // 如果没有，那就表示它tabbar比的位置要隔更远，中间有空隙
    willSetHeight = willSetHeight + absOffsetHeight + inputElementHeight //加上空隙和元素本身的高度
  }

  // console.log('传入的组件的高度：', inputElementHeight)
  // console.log('传入的组件的底部位置：', inputElementBottomPosition)
  // console.log('tabbar的顶部位置：', tabBarTop)
  // console.log('计算的差值：', computedOffsetHeight)
  // console.log('修正代高度：', willSetHeight)

  el.style.height = willSetHeight + 'px'
}

const adjustDynamicArea = async (name: string) => {
  const el = getDynamicAreaRef(name)

  setDefaultHeight(el) // 设置默认高度，准备用于重新修正高度

  await nextTick() // 等待布局稳定后重新计算真实高度

  const elRef = ref<HTMLDivElement | null>(el) //把DOM转成响应式

  requestAnimationFrame(async () => {
    const rect = await calculateElementPosition(elRef) // 计算响应式组件的位置高度等信息

    if (!rect) {
      throw new Error(`[adjustDynamicArea] rect 获取失败 → ${name}`)
    }

    updateElementHeight(el, rect)
  })
}

onMounted(async () => {
  await nextTick()
  adjustDynamicArea(props.activeTabName)
})

watch(
  () => mobileStore.bottomTabBarPosition,
  () => {
    requestAnimationFrame(() => {
      adjustDynamicArea(currentTab.value)
    })
  }
)
</script>

<style scoped></style>
