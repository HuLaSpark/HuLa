<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="top" />

    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1">
      <RouterView v-slot="{ Component }">
        <Transition name="slide" appear mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'

const route = useRoute()
</script>

<style lang="scss" scoped>
/* 侧滑切换动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.1s ease;
}

.slide-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
