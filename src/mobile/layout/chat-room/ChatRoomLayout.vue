<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="top" />

    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1">
      <RouterView />
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
</script>

<style scoped></style>
