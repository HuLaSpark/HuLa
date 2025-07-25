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
    <SafeAreaPlaceholder direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
import TabBar from '@/mobile/layout/tabBar/index.vue'
import { useMobileStore } from '@/stores/mobile'
import { debounce } from 'lodash-es'
import { calculateElementPosition } from '@/utils/DomCalculate'

const mobileStore = useMobileStore()

const tabBarElement = ref<InstanceType<typeof TabBar>>()

/**
 * 更新TabBar位置信息，用于可能出现的组件位置计算需求
 */
const updateTabBarPositionStore = async () => {
  try {
    const rect = await calculateElementPosition(tabBarElement)
    if (rect) {
      console.log('TabBar位置:', rect)
      mobileStore.updateBottomTabBarPosition(rect)
    }
  } catch (error) {
    console.error(error)
  }
}

const debouncedCalculate = debounce(updateTabBarPositionStore, 200)

/**
 * 启动TabBar组件的位置监听，并且首次加载时计算其所在位置，并保存到缓存中
 */
const startTabBarPositionListener = () => {
  updateTabBarPositionStore()
  window.addEventListener('resize', debouncedCalculate)
}

const stopTabBarPositionListener = () => {
  window.removeEventListener('resize', debouncedCalculate)
}

onMounted(() => {
  startTabBarPositionListener()
})

onUnmounted(() => {
  stopTabBarPositionListener()
})

const envType = mobileStore.envType
const safeArea = computed(() => mobileStore.safeArea)
</script>

<style lang="scss"></style>
