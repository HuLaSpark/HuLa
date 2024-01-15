<template>
  <div class="flex-1 bg-[#f1f1f1ff] h-full rounded-tr-8px rounded-br-8px w-100vw">
    <div data-tauri-drag-region class="flex justify-end">
      <div
        id="titlebar-close"
        class="w-28px h24px flex-center cursor-pointer color-#606060 hover:bg-#c22b1c hover:color-#fff rounded-tr-6px">
        X
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window'

onMounted(() => {
  // document.getElementById('titlebar-minimize')!.addEventListener('click', () => appWindow.minimize())
  // document.getElementById('titlebar-maximize')!.addEventListener('click', () => appWindow.toggleMaximize())
  document.getElementById('titlebar-close')!.addEventListener('click', () => appWindow.close())
  console.log('onMounted------', document.getElementById('titlebar-close'))
})
</script>

<style scoped></style>
