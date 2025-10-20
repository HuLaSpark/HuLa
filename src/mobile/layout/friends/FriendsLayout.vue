<template>
  <MobileLayout :safeAreaTop="true" :safeAreaBottom="true">
    <div class="h-full flex flex-col">
      <!-- 页面全部内容 -->
      <div class="flex flex-col flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="slide" appear mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style lang="scss" scoped>
/* 侧滑切换动画 */
// .slide-enter-active,
// .slide-leave-active {
//   transition: all 0.1s ease;
// }

// .slide-enter-from {
//   transform: translateX(-30px);
//   opacity: 0;
// }

// .slide-leave-to {
//   transform: translateX(30px);
//   opacity: 0;
// }
</style>
