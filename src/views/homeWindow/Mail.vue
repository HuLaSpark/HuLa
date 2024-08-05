<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="appWindow.label" />

    <n-alert title="公告" type="warning"> 此功能有待开发中，请联系开发者 </n-alert>
  </div>
</template>
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window'
import { useWindowState } from '@/hooks/useWindowState.ts'

useWindowState(appWindow.label)
</script>
