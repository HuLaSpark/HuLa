<template>
  <div class="size-full rounded-8px bg-[--chat-right-bg]">
    <n-flex class="size-full" :size="0">
      <!-- 左边侧边栏 -->
      <Left />
      <!--  右边主体  -->
      <Right />
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import Left from './layout/Left.vue'
import Right from './layout/Right.vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>
