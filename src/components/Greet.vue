<template>
  <form class="row">
    <input id="greet-input" v-model="name" placeholder="Enter a name..." />
    <n-button @click="dj" style="width: 20%;border-radius: 8px" secondary type="primary">Primary</n-button>
  </form>

  <p>{{ greetMsg }}</p>
</template>
<script setup lang="ts">
// import { invoke } from "@tauri-apps/api/tauri";

/*在layout中挂载需要挂载全局的hook*/
window.$message = useMessage()
const greetMsg = ref("");
const name = ref("");

const dj = () => {
  window.$message.success(name.value)
}

// async function greet() {
//   greetMsg.value = await invoke("greet", { name: name.value });
// }
</script>