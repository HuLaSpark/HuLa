<template>
  <n-config-provider :theme="lightTheme" class="login-box flex-col-center gap-40px h-100vh">
    <img src="@/assets/logo/hula.png" class="w-65%" alt="" />
  </n-config-provider>
</template>

<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import router from '../router'

onMounted(() => {
  setTimeout(() => {
    const token = localStorage.getItem('TOKEN')
    // 已登录用户访问登录页时重定向到首页
    if (token) {
      router.replace('/mobile/home')
    } else {
      router.replace('/mobile/login')
    }
  }, 2000)
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/login';
@use '@/styles/scss/global/login-bg';

body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
