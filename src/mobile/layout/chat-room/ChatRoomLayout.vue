<template>
  <div class="h-full flex flex-col">
    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['mobileChatMain', 'mobileGroupChatMember']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
// .page-view {
//   flex: 1;
//   // 进入时的动画
//   animation: fade-slide-in 0.3s ease;
// }

// @keyframes fade-slide-in {
//   from {
//     transform: translateX(20px);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
</style>
