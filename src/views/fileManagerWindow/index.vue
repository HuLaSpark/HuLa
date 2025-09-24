<template>
  <div class="size-full rounded-8px bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>
