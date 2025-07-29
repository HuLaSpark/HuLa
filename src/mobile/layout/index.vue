<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <!-- <SafeAreaPlaceholder direction="top" /> -->

    <!-- 页面全部内容 -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      <div class="flex flex-1 overflow-y-auto">
        <RouterView />
      </div>
      <div class="flex">
        <TabBar
          ref="tabBarElement"
          :style="envType === 'android' ? { bottom: safeArea.bottom + 'px !important' } : {}" />
      </div>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder v-if="uiViewData.isShowSafeArea" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash-es'
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
import type TabBar from '@/mobile/layout/tabBar/index.vue'
import { useMobileStore } from '@/stores/mobile'
import { calculateElementPosition } from '@/utils/DomCalculate'

const mobileStore = useMobileStore()

const envType = mobileStore.envType
const safeArea = computed(() => mobileStore.safeArea)
const uiViewData = ref({
  isShowSafeArea: true
})

const tabBarElement = ref<InstanceType<typeof TabBar>>()

const initTabBarPositionStore = async () => {
  try {
    const rect = await calculateElementPosition(tabBarElement)

    if (!rect) {
      return
    }

    mobileStore.updateTabBarPosition({
      newPosition: rect,
      isInit: true
    })

    // console.log('初始化位置：', rect)
    // console.log('初始位置状态：', mobileStore.initBottomTabBarPosition.top)
    // console.log('当前位置状态：', mobileStore.bottomTabBarPosition.top)
  } catch (error) {
    console.error(error)
  }
}

const updateSafeAreaState = (initTopPosition: number, newTopPosition: number) => {
  // console.log('初始位置：', initTopPosition)
  // console.log('新位置：', newTopPosition)
  // console.log('位置计算结果：', Math.abs(initTopPosition - newTopPosition))

  // 这个判断程序可能是以小窗口启动，然后放大到全屏，这时差距变化会非常的大

  if (newTopPosition > initTopPosition) {
    uiViewData.value.isShowSafeArea = true
  } else {
    uiViewData.value.isShowSafeArea = false
  }
}

const updateTabBarPositionStore = async () => {
  try {
    const rect = await calculateElementPosition(tabBarElement)

    if (!rect) {
      return
    }

    updateSafeAreaState(mobileStore.initBottomTabBarPosition.top, rect.top)

    mobileStore.updateTabBarPosition({
      newPosition: rect,
      isInit: false
    })
  } catch (error) {
    console.error(error)
  }
}

const debouncedUpdateCalculate = debounce(updateTabBarPositionStore, 150)

/**
 * 启动TabBar组件的位置监听，并且首次加载时计算其所在位置，并保存到缓存中
 */
const startTabBarPositionListener = () => {
  initTabBarPositionStore()
  window.addEventListener('resize', debouncedUpdateCalculate)
  window.visualViewport?.addEventListener('resize', debouncedUpdateCalculate)
}

const stopTabBarPositionListener = () => {
  debouncedUpdateCalculate.cancel()
  window.removeEventListener('resize', debouncedUpdateCalculate)
}

onMounted(() => {
  startTabBarPositionListener()
})

onUnmounted(() => {
  stopTabBarPositionListener()
})
</script>

<style lang="scss"></style>
