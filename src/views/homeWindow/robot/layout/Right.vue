<template>
  <n-flex
    vertical
    :size="0"
    class="flex-1 truncate border-l-(1px solid [--line-color]) custom-shadow select-none text-[--text-color]">
    <!-- 右上角操作栏 -->
    <ActionBar class="w-full" :shrink="false" :current-label="appWindow.label" :top-win-label="appWindow.label" />

    <RouterView />
  </n-flex>
</template>
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window'
import { useWindowState } from '@/hooks/useWindowState.ts'

useWindowState(appWindow.label)
</script>
