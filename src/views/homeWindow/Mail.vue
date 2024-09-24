<template>
  <div class="size-full rounded-8px bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />

    <n-alert title="公告" type="warning"> 此功能有待开发中，请联系开发者 </n-alert>
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowState } from '@/hooks/useWindowState.ts'

useWindowState(WebviewWindow.getCurrent().label)

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>
