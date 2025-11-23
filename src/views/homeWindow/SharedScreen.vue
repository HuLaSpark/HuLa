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
  // 保证监听在挂载阶段注册，卸载时由 useTauriListener 自动清理
  await getCurrentWebviewWindow().show()
  await emit('SharedScreenWin')
})

onMounted(async () => {
  await addListener(
    appWindow.listen('offer', async (event) => {
      console.log(event.payload)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(event.payload as RTCSessionDescriptionInit))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      console.log(JSON.stringify(answer))
    }),
    'shared-screen-offer'
  )
})
</script>

<style scoped lang="scss"></style>
