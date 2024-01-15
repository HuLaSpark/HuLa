<template>
  <!-- 加上data-tauri-drag-region就可以拖动-->
  <div class="bg-#ccc w-full h-20px" data-tauri-drag-region></div>
  <n-space :size="10">
    <n-input v-model:value="name" placeholder="Enter a name..." />
    <n-button @click="dj" secondary type="primary">Primary</n-button>
    <GlobalTheme />
  </n-space>
</template>
<script setup lang="ts">
const name = ref('')

const dj = () => {
  window.$message.success(name.value)
}
</script>
