<template>
  <n-flex
    vertical
    :size="0"
    class="flex-1 truncate border-l-(1px solid [--line-color]) custom-shadow select-none text-[--text-color]">
    <!-- 右上角操作栏 -->
    <ActionBar
      :shrink="false"
      :current-label="WebviewWindow.getCurrent().label"
      :top-win-label="WebviewWindow.getCurrent().label" />

    <!-- ✅ 使用 keep-alive 缓存 Chat.vue，避免重复挂载 -->
    <RouterView v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </RouterView>
  </n-flex>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
</script>
