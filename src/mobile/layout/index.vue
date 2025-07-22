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
        <TabBar :style="envType === 'android' ? { bottom: safeArea.bottom + 'px !important' } : {}" />
      </div>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
import TabBar from './tabBar/index.vue'
import { useMobileStore } from '@/stores/mobile'
const mobileStore = useMobileStore()

const envType = mobileStore.envType
const safeArea = computed(() => mobileStore.safeArea)
</script>

<style lang="scss"></style>
