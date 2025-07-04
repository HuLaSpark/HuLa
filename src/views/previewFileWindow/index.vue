<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />
    <div class="flex flex-col gap-4">
      <VueOfficeDocx />
      12312
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit } from '@tauri-apps/api/event'
import VueOfficeDocx from '@vue-office/docx'

const video = ref<HTMLVideoElement>()
let peerConnection = new RTCPeerConnection()

peerConnection.ontrack = function (event) {
  if (video.value) {
    video.value.srcObject = event.streams[0]
  }
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await emit('SharedScreenWin')
})
</script>

<style scoped lang="scss"></style>
