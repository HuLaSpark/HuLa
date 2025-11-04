<template>
  <MobileLayout :safeAreaTop="true" :safeAreaBottom="true">
    <div class="flex flex-col h-full bg-gradient-to-b from-#f8f9fa to-#ffffff">
      <!-- 顶部导航栏 -->
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        :enable-shadow="false"
        :hidden-right="true"
        room-name="动态详情" />

      <!-- 动态详情内容 -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden w-full">
        <DynamicDetail :feed-id="feedId" mode="mobile" @preview-image="previewImage" @video-play="handleVideoPlay" />
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DynamicDetail from '@/components/common/DynamicDetail.vue'

const route = useRoute()

// 获取动态ID（使用 computed 使其响应式）
const feedId = computed(() => route.params.id as string)

// 图片预览
const previewImage = (images: string[], index: number) => {
  console.log('预览图片:', images, index)
  // TODO: 实现图片预览功能
}

// 视频播放
const handleVideoPlay = (url: string) => {
  console.log('播放视频:', url)
  // TODO: 实现视频播放功能
}
</script>

<style scoped>
/* 空样式，全部使用 UnoCSS */
</style>
