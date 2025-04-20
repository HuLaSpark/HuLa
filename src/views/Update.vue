<template>
  <n-flex
    data-tauri-drag-region
    vertical
    align="center"
    justify="center"
    style="height: 150px"
    class="update no-select">
    <n-progress size="12" type="circle" color="#d8eee2" rail-color="white" :percentage="percentage">
      <span style="text-align: center; color: #18a058">更新中<br />{{ percentage }}%</span></n-progress
    >
  </n-flex>
</template>
<script setup lang="tsx">
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

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
.update {
  background-color: #d8eee2;
}
.no-select {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
