<template>
  <main class="flex-1 bg-[--right-bg-color] h-full w-100vw">
    <ActionBar :shrink="false" :current-label="appWindow.label" />

    <ChatBox />
  </main>
</template>
<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { EventEnum } from '@/enums'

// 监听窗口关闭事件,当窗口是非正常关闭的时候触发
appWindow.onCloseRequested(async (e) => {
  await emit(EventEnum.WIN_CLOSE, e.windowLabel)
})

onMounted(async () => {
  await emit('window-ready')
})
</script>
