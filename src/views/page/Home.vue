<template>
  <n-space :size="10">
    <n-input v-model:value="name" placeholder="Enter a name..." />
    <n-button @click="dj" secondary type="primary">Primary</n-button>
    <GlobalTheme />
  </n-space>
</template>
<script setup lang="ts">
// import { invoke } from "@tauri-apps/api/tauri";
const name = ref('')

const dj = () => {
  window.$message.success(name.value)
}

// async function greet() {
//   greetMsg.value = await invoke("greet", { name: name.value });
// }
</script>
