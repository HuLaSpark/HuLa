<template>
  <main class="login-box wh-full select-none">
    <ActionBar :shrink="false" :max-w="false" />

    <n-space vertical align="center" :size="30" class="pt-60px">
      <img class="w-120px h-120px rounded-50%" src="/logo.png" alt="" />

      <n-space vertical align="center" :size="20">
        <n-flex justify="center" class="text-28px color-#059669 mt-25px font-1000">HuLA</n-flex>
        <span class="text-15px">版本: &nbsp; {{ _pkg.version }}(64位)</span>
        <n-space vertical class="text-13px text-#909090" :size="8" align="center">
          <span>Copyright © 2023-2024 nongyehong</span>
          <span>All Rights Reserved.</span>
        </n-space>
      </n-space>
    </n-space>
  </main>
</template>
<script setup lang="ts">
import pkg from '~/package.json'

const _pkg = reactive({
  version: pkg.version
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
:deep(.hover-box) {
  @apply w-28px h24px flex-center hover:bg-#e7e7e7;
  svg {
    color: #404040;
  }
}
:deep(.action-close) {
  svg {
    color: #404040;
  }
}
</style>
