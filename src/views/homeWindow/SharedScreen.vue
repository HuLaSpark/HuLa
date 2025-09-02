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
import { emit } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useTauriListener } from '@/hooks/useTauriListener'

const appWindow = WebviewWindow.getCurrent()
const { addListener } = useTauriListener()
const video = ref<HTMLVideoElement>()
const peerConnection = new RTCPeerConnection()

peerConnection.ontrack = (event) => {
  if (video.value) {
    video.value.srcObject = event.streams[0]
  }
}

onBeforeUnmount(async () => {
  await addListener(
    appWindow.listen('offer', async (event) => {
      console.log(event.payload)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(event.payload as RTCSessionDescriptionInit))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      // 在这里，你需要将应答发送给发送方
      // 你可以使用信令服务器来发送应答，或者将应答复制粘贴到发送方页面
      console.log(JSON.stringify(answer))
    })
  )
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await emit('SharedScreenWin')
})
</script>

<style scoped lang="scss"></style>
