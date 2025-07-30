<template>
  <n-config-provider :theme="lightTheme" class="launch-page h-100vh">
    <img src="/Mobile/4.png" class="w-300px h-200px mb-140px" alt="hula" />

    <div class="flex-center gap-16px absolute bottom--40px">
      <img src="/Mobile/3.png" class="size-50px rounded-14px" alt="hula" />
      <img src="/Mobile/1.png" class="w-78px h-40px" alt="hula" />
    </div>
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
      nextTick(() => {
        router.replace('/mobile/message')
      })
    } else {
      router.replace('/mobile/login')
    }
  }, 2000)
})
</script>

<style scoped lang="scss">
.launch-page {
  background-image: url('/Mobile/2.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

body {
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
}
</style>
