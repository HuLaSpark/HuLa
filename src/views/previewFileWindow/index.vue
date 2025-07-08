<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />
    <n-scrollbar
      style="max-height: calc(100vh)"
      class="w-full box-border bg-[--center-bg-color] rounded-b-8px border-(solid 1px [--line-color])">
      <div class="flex flex-col gap-4">
        <VueOfficeDocx
          v-if="uiData.resourceFile.type?.ext === 'docx' || uiData.resourceFile.type?.ext === 'doc'"
          :src="uiData.resourceFile.url" />
        <VueOfficePdf
          v-else-if="uiData.resourceFile.type?.ext === 'pdf'"
          :src="uiData.resourceFile.url"
          style="height: 95vh"
          @rendered="onPdfRendered"
          @error="onPdfError" />
        <VueOfficeExcel
          v-else-if="uiData.resourceFile.type?.ext === 'xlsx'"
          :src="uiData.resourceFile.url"
          style="height: 95vh" />
        <VueOfficePptx
          v-else-if="uiData.resourceFile.type?.ext === 'pptx'"
          :src="uiData.resourceFile.url"
          style="height: 95vh" />
        <div v-else class="text-gray-500">📄 暂无文档可预览</div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import VueOfficeDocx from '@vue-office/docx/lib/v3/vue-office-docx.mjs'
import VueOfficePdf from '@vue-office/pdf/lib/v3/vue-office-pdf.mjs'
import VueOfficeExcel from '@vue-office/excel/lib/v3/vue-office-excel.mjs'
import VueOfficePptx from '@vue-office/pptx/lib/v3/vue-office-pptx.mjs'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { FileTypeResult } from 'file-type'
import '@vue-office/docx/lib/v3/index.css'
import '@vue-office/excel/lib/v3/index.css'
import { getFile, getUserAbsoluteVideosDir } from '@/utils/PathUtil'
import { BaseDirectory, join } from '@tauri-apps/api/path'
import { exists } from '@tauri-apps/plugin-fs'

type ResourceFile = {
  fileName: string
  url: string | File
  type: FileTypeResult | undefined
}

const uiData = ref({
  resourceFile: {} as ResourceFile,
  userId: '',
  roomId: ''
})

const video = ref<HTMLVideoElement>()
let peerConnection = new RTCPeerConnection()

peerConnection.ontrack = function (event) {
  if (video.value) {
    video.value.srcObject = event.streams[0]
  }
}

type PayloadData = {
  userId: string
  roomId: string
  messageId: string
  resourceFile: ResourceFile
}

// PDF 渲染完成回调
function onPdfRendered() {
  console.log('✅ PDF 渲染完成')
}

// PDF 渲染失败回调
function onPdfError(error: any) {
  console.error('❌ PDF 渲染失败', error)
}

async function initResourceFile(payload: PayloadData) {
  const absolutePath = await join(
    await getUserAbsoluteVideosDir(payload.userId, payload.roomId),
    payload.resourceFile.fileName
  )

  const fileExists = await exists(absolutePath, { baseDir: BaseDirectory.AppCache })

  if (fileExists) {
    const result = await getFile(absolutePath)
    console.log('✅ 使用本地文件渲染：', absolutePath)
    uiData.value.resourceFile = {
      ...payload.resourceFile,
      url: URL.createObjectURL(result.file), // 替换为 blob URL
      type: {
        ext: result.meta.file_type,
        mime: result.meta.mime_type
      }
    }
  } else {
    console.log('⚠️ 本地文件不存在，使用远程链接：', payload.resourceFile.url)
    uiData.value.resourceFile = payload.resourceFile
  }
}

let unListen: any = null

onMounted(async () => {
  const webviewWindow = getCurrentWebviewWindow()
  const label = webviewWindow.label
  const listenLabel = `${label}:update`

  // 窗口完成加载后监听更新
  unListen = await listen<PayloadData>(listenLabel, (event) => {
    const payload = event.payload
    uiData.value.resourceFile = payload.resourceFile
    uiData.value.userId = payload.userId
    uiData.value.roomId = payload.roomId
    console.log('payload更新：', payload)
  })

  try {
    // 窗口初次加载时调用
    const result: PayloadData = await invoke('get_window_payload', {
      label
    })

    uiData.value.resourceFile = result.resourceFile
    uiData.value.userId = result.userId
    uiData.value.roomId = result.roomId

    initResourceFile(result)

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
