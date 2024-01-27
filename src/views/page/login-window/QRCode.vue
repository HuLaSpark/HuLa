<template>
  <div data-tauri-drag-region class="login-box wh-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <n-flex justify="center" class="font-size-28px color-#189f57 mt-25px">HuLA</n-flex>

    <!-- 二维码 -->
    <n-flex justify="center" class="mt-35px">
      <n-skeleton v-if="loading" style="border-radius: 12px" :width="204" :height="204" :sharp="false" size="medium" />
      <n-qr-code
        v-else
        :size="180"
        class="rounded-12px"
        :value="QRCode"
        icon-src="/logo.png"
        error-correction-level="H" />
    </n-flex>

    <n-flex justify="center" class="mt-15px font-size-14px color-#808080">{{ loadText }}</n-flex>

    <!-- 顶部操作栏 -->
    <n-flex justify="center" class="font-size-14px mt-60px">
      <div class="color-#189f57 cursor-pointer" @click="toLogin">账密登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div class="color-#189f57 cursor-pointer">注册账号</div>
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import router from '@/router'
import { delay } from 'lodash-es'

const loading = ref(true)
const loadText = ref('加载中...')
const QRCode = ref('HuLa-IM-Tauri')

const toLogin = () => {
  router.push('/login')
}
// TODO 做一个二维码过期时间重新刷新二维码的功能 (nyh -> 2024-01-27 00:37:18)
onMounted(() => {
  delay(() => {
    loading.value = false
    loadText.value = '请使用HuLaApp扫码登录'
  }, 1000)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
</style>
