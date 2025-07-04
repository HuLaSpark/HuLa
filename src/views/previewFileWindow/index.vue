<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />
    <div class="flex flex-col gap-4">
      <VueOfficeDocx v-if="uiData.resourceSrc" :src="uiData.resourceSrc" style="height: 80vh" />
      <div v-else class="text-gray-500">📄 暂无文档可预览</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import VueOfficeDocx from '@vue-office/docx'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

const uiData = ref({
  resourceSrc: ''
})

const video = ref<HTMLVideoElement>()
let peerConnection = new RTCPeerConnection()

peerConnection.ontrack = function (event) {
  if (video.value) {
    video.value.srcObject = event.streams[0]
  }
}

type PayloadData = {
  fileName: string
  messageId: string
  remoteUrl: string
  roomId: string
  userId: string
}

let unListen: any = null

onMounted(async () => {
  const webviewWindow = getCurrentWebviewWindow()
  const label = webviewWindow.label
  const listenLabel = `${label}:update`

  // 窗口完成加载后监听更新
  unListen = await listen<PayloadData>(listenLabel, (event) => {
    const payload = event.payload
    uiData.value.resourceSrc = payload.remoteUrl
    console.log('payload更新：', payload)
  })

  try {
    // 窗口初次加载时调用
    const result: PayloadData = await invoke('get_window_payload', {
      label
    })

    uiData.value.resourceSrc = result.remoteUrl

    console.log('获取完成：', result)
  } catch (error) {
    console.log('获取错误：', error)
  }

  await getCurrentWebviewWindow().show()
  // await emit('SharedScreenWin')
})

onBeforeUnmount(async () => {
  await unListen()
})
</script>

<style scoped lang="scss"></style>
