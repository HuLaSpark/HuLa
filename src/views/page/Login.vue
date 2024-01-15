<template>
  <div class="flex-center h-full">
    <n-button @click="loginWin" secondary type="primary">登录</n-button>
  </div>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/window'

let close = (label: string) => {
  const win = WebviewWindow.getByLabel(label)
  win?.close()
}

let loginWin = async () => {
  const webview = new WebviewWindow('page', {
    url: '/',
    fullscreen: false,
    resizable: true,
    center: true,
    width: 1050,
    height: 720,
    skipTaskbar: false,
    decorations: false,
    transparent: true
  })
  await webview.once('tauri://created', function () {
    console.log('创建成功')
    close('login')
  })
  await webview.once('tauri://error', function (e) {
    console.log(e)
  })
}
</script>

<style scoped></style>
