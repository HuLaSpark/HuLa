<template>
  <n-flex data-tauri-drag-region vertical class="login-box size-full select-none !gap-0">
    <video class="w-full h-240px rounded-t-8px object-cover" autoplay loop data-tauri-drag-region>
      <source src="@/assets/video/issue.mp4" type="video/mp4" />
      <source src="@/assets/video/star.mp4" type="video/mp4" />
    </video>
    <div class="justify-center items-center flex-1" data-tauri-drag-region>
      <n-progress
        data-tauri-drag-region
        size="12"
        :border-radius="0"
        :color="changeColor('#13987f', { alpha: 0.6 })"
        :rail-color="changeColor('#13987f', { alpha: 0.2 })"
        :percentage="percentage"
        :show-indicator="false" />
      <p class="cursor-default color-#13987f text-center text-sm mt-4" data-tauri-drag-region>
        更新中 {{ percentage }}%
      </p>
    </div>
  </n-flex>
</template>
<script setup lang="tsx">
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { changeColor } from 'seemly'

const updating = ref(false)
const percentage = ref(0)
const total = ref(0)
const downloaded = ref(0)
const doUpdate = async () => {
  await check()
    .then(async (e) => {
      if (!e?.available) {
        return
      }

      await e.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total.value = event.data.contentLength ? event.data.contentLength : 0
            break
          case 'Progress':
            downloaded.value += event.data.chunkLength
            percentage.value = parseFloat(((downloaded.value / total.value) * 100 + '').substring(0, 4))
            break
          case 'Finished':
            break
        }
      })
      try {
        await relaunch()
      } catch (e) {
        console.log(e)
      }
    })
    .catch((e) => {
      console.log(e)
    })
    .finally(() => {
      updating.value = false
    })
}

onMounted(async () => {
  await doUpdate()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
</style>
