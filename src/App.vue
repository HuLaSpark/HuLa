<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <div id="app">
      <router-view />
    </div>
  </NaiveProvider>
</template>
<script setup lang="ts">
onMounted(() => {
  // window.addEventListener('contextmenu', (e) => e.preventDefault(), false)
})

onUnmounted(() => {
  window.removeEventListener('contextmenu', (e) => e.preventDefault(), false)
})
</script>
<style lang="scss">
#app {
  min-height: 100vh;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  transition: all 0.9s ease;
  border-radius: 10px;
}
</style>
