<template>
  <div class="wh-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="currentWindowLabel" />

    <p>邮箱</p>
  </div>
</template>
<script setup lang="ts">
import { appWindow, WebviewWindow } from '@tauri-apps/api/window'
import { sendMsg } from '@/common/CrossTabMsg.ts'
// 获取当前窗口的标签
const currentWindowLabel = computed(() => {
  return appWindow.label
})
const win = WebviewWindow.getByLabel(currentWindowLabel.value)
// TODO 可以尝试使用win.emit来取代自定义封装的跨标签页通信 (nyh -> 2024-03-05 07:15:42)

watchEffect(() => {
  win?.listen('windowsClose', (e) => {
    sendMsg('windowsShow', e)
  })
})

onMounted(async () => {
  const isShow = await win?.isVisible()
  if (isShow) {
    sendMsg('windowsShow', currentWindowLabel.value)
  }
})
</script>

<style scoped></style>
