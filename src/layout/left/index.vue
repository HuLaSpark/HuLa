<template>
  <div
    class="w-60px h-full pt-10px pl-8px pr-8px pb-10px box-border flex-x-center rounded-tl-8px rounded-bl-8px select-none">
    <img
      @click="toLogin"
      class="border-rounded-50% w-34px h-34px bg-#f1f1f1 cursor-pointer"
      style="border: 1px solid #fff"
      src="/logo.png"
      alt="" />
  </div>
</template>
<script setup lang="ts">
import { delay } from 'lodash-es'
import { useWindow } from '@/hooks/useWindow.ts'

const { createWebviewWindow } = useWindow()
const toLogin = () => {
  // todo 暂时使用创建新窗口来跳转到登录页面，生产环境一般不会跳转到登录页面
  delay(async () => {
    await createWebviewWindow('login', 320, 448, 'home')
  }, 800)
}
</script>

<style scoped></style>
