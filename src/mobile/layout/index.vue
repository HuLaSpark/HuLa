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
        <TabBar ref="tabBarElement" />
      </div>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
import type { default as TabBarType } from '@/mobile/layout/tabBar/index.vue'
import TabBar from '@/mobile/layout/tabBar/index.vue'
import { useMobileStore } from '@/stores/mobile'
import { calculateElementPosition } from '@/utils/DomCalculate'

const mobileStore = useMobileStore()
const tabBarElement = ref<InstanceType<typeof TabBarType>>()

const updateTabBarPosition = async (isInit: boolean) => {
  // 等待渲染完成
  await nextTick()

  // 渲染完成后下一帧开始前计算其位置信息
  requestAnimationFrame(async () => {
    const tabBarRect = await calculateElementPosition(tabBarElement)
    if (!tabBarRect) {
      throw new Error('[updateTabBarPosition] 无法获取tabBarRect位置和高度信息')
    }

    mobileStore.updateTabBarPosition({
      newPosition: tabBarRect,
      isInit: isInit
    })
  })
}

onMounted(async () => {
  await updateTabBarPosition(true)
})

// 这里要明确等待加载后再监听，不能写在全局作用域，如果窗口大小改变，则该参数会改变，所以需要监听
watch(
  () => mobileStore.safeArea,
  (newData) => {
    // 改变后需要更新tabbar的位置
    console.log('[layout watch] 安全区域改变了', newData)
    updateTabBarPosition(false)
  },
  {
    immediate: false
  }
)
</script>

<style lang="scss"></style>
