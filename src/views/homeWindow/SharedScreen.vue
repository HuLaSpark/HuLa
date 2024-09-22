<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />

    <div class="flex flex-col gap-4 text-center">
      <div>
        <video ref="video" muted autoplay controls class="size-full" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit, listen } from '@tauri-apps/api/event'

const video = ref<HTMLVideoElement>()
let peerConnection = new RTCPeerConnection()

// TODO 需要建立信令服务器 (nyh -> 2024-04-01 18:05:58)
watchEffect(() => {
  listen('offer', async (event) => {
    console.log(event.payload)
    await peerConnection.setRemoteDescription(new RTCSessionDescription(event.payload as RTCSessionDescriptionInit))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    // 在这里，你需要将应答发送给发送方
    // 你可以使用信令服务器来发送应答，或者将应答复制粘贴到发送方页面
    console.log(JSON.stringify(answer))
  })
})

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
