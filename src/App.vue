<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <div id="app">
      <router-view />
    </div>
  </NaiveProvider>
</template>
<script setup lang="ts">
import { theme } from '@/stores/theme.ts'
import { storeToRefs } from 'pinia'

const themeStore = theme()
const { THEME } = storeToRefs(themeStore)

onMounted(() => {
  document.documentElement.dataset.theme = THEME.value
  // /* 禁用浏览器默认的快捷键 */
  // window.addEventListener('keydown', (e) => {
  //   if (e.ctrlKey || e.metaKey || e.altKey) {
  //     e.preventDefault()
  //   }
  // })
  // /* 禁止右键菜单 */
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
