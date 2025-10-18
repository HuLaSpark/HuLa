<template>
  <div class="h-full flex flex-col">
    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1 min-h-0">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['mobileChatMain', 'mobileGroupChatMember']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped></style>
