<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <div id="app">
      <Home />
    </div>
  </NaiveProvider>
</template>
<script setup lang="ts">
import { theme } from '@/stores/theme.ts'
import { storeToRefs } from 'pinia'
import Home from '@/views/page/Home.vue'

const themeStore = theme()
const { BGC } = storeToRefs(themeStore)
</script>
<style scoped>
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
  background-color: v-bind(BGC);
}
</style>
