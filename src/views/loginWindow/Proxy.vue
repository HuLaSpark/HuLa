<template>
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy data-tauri-drag-region />

    <n-flex vertical :size="25" align="center" class="pt-30px">
      <span class="text-(16px #70938c) font-bold textFont">网络代理设置</span>
      <p>敬请期待</p>
      <p @click="router.push('/login')" class="text-(14px #13987f) cursor-pointer">返回</p>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import router from '@/router'
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
.textFont {
  font-family: AliFangYuan, sans-serif !important;
}
</style>
