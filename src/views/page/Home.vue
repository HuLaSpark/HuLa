<template>
  <form class="row">
    <input id="greet-input" v-model="name" placeholder="Enter a name..." />
    <n-button @click="dj" class="w-20% bg-#ccc" secondary type="primary">Primary</n-button>
  </form>

  <p>{{ greetMsg }}</p>
</template>
<script setup lang="ts">
// import { invoke } from "@tauri-apps/api/tauri";
const greetMsg = ref('')
const name = ref('')

const dj = () => {
  window.$message.success(name.value)
}

// async function greet() {
//   greetMsg.value = await invoke("greet", { name: name.value });
// }
</script>
