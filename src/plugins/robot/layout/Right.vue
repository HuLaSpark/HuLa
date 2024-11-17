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

    <RouterView />
  </n-flex>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowState } from '@/hooks/useWindowState.ts'

useWindowState(WebviewWindow.getCurrent().label)
</script>
