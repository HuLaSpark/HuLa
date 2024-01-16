<template>
  <div
    class="w-60px bg-#AA5757FF h-full pt-10px pl-8px pr-8px pb-10px box-border flex-x-center rounded-tl-8px rounded-bl-8px">
    <img
      @click="toLogin"
      class="border-rounded-50% w-34px h-34px bg-#f1f1f1 cursor-pointer"
      style="border: 1px solid #fff"
      src="/logo.png"
      alt="" />
  </div>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/window'
import { autoCloseWindow } from '@/common/WindowEvent.ts'

const toLogin = async () => {
  // todo 暂时使用创建新窗口来跳转到登录页面，生产环境一般不会跳转到登录页面
  const webview = new WebviewWindow('login', {
    url: '/login',
    fullscreen: false,
    resizable: false,
    center: true,
    width: 320,
    height: 448,
    skipTaskbar: false,
    decorations: false,
    transparent: true
  })
  await webview.once('tauri://created', function () {
    console.log('创建成功')
    autoCloseWindow('home')
  })
  await webview.once('tauri://error', function (e) {
    console.log(e)
  })
}
</script>

<style scoped></style>
