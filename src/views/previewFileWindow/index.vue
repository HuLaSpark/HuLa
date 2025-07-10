<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />
    <n-scrollbar
      style="max-height: calc(100vh)"
      class="w-full box-border bg-[--center-bg-color] rounded-b-8px border-(solid 1px [--line-color])">
      <div class="flex flex-col gap-4 bg-#808080">
        <VueOfficeDocx v-if="isShowWord" :src="resourceSrc" style="height: 100vh" />

        <VueOfficePdf v-else-if="isShowPdf" :src="resourceSrc" style="height: 95vh" />

        <VueOfficeExcel v-else-if="isShowExcel" :src="resourceSrc" style="height: 95vh" />

        <VueOfficePptx v-else-if="isShowPpt" :src="resourceSrc" style="height: 95vh" />

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
import { FileTypeResult } from 'file-type'
import '@vue-office/docx/lib/v3/index.css'
import '@vue-office/excel/lib/v3/index.css'
import { getFile } from '@/utils/PathUtil'
import { useWindow } from '@/hooks/useWindow'
import merge from 'lodash-es/merge'
import { computed } from 'vue'

type PayloadData = {
  userId: string
  roomId: string
  messageId: string
  resourceFile: {
    fileName: string
    absolutePath: string | undefined
    nativePath: string | undefined
    url: string
    type: FileTypeResult | undefined
    localExists: boolean
  }
}

const uiData = reactive({
  payload: {
    messageId: '',
    userId: '',
    roomId: '',
    resourceFile: {
      fileName: '',
      absolutePath: '',
      nativePath: '',
      url: '',
      localExists: false,
      type: {
        ext: '',
        mime: ''
      }
    }
  } as PayloadData,

  file: new File([], ''), // 只有在找到本地文件时才用它
  fileBuffer: [] as unknown as ArrayBuffer,
  fileLoading: false
})

const resourceSrc = computed(() => {
  const { resourceFile } = uiData.payload
  const { localExists, url } = resourceFile

  // 优先使用本地已加载的文件 buffer
  if (localExists && uiData.fileBuffer) {
    return uiData.fileBuffer
  }

  // 否则使用远程地址
  return url
})

const fileExt = computed(() => uiData.payload.resourceFile.type?.ext || '')
const localExists = computed(() => uiData.payload.resourceFile.localExists)

const isShowWord = computed(() => {
  const match = ['doc', 'docx', 'cfb'].includes(fileExt.value)
  return match && (localExists.value ? uiData.fileLoading : true)
})

const isShowPdf = computed(() => {
  const match = fileExt.value === 'pdf'
  return match && (localExists.value ? uiData.fileLoading : true)
})

const isShowExcel = computed(() => {
  const match = fileExt.value === 'xlsx'
  return match && (localExists.value ? uiData.fileLoading : true)
})

const isShowPpt = computed(() => {
  const match = fileExt.value === 'pptx'
  return match && (localExists.value ? uiData.fileLoading : true)
})

const updateFile = async (absolutePath: string, exists: boolean) => {
  try {
    if (exists) {
      uiData.fileLoading = false // 初始设为 false，确保状态干净

      // 文件存在本地就更新
      const file = await getFile(absolutePath)
      uiData.file = file.file

      const buffer = await file.file.arrayBuffer()
      uiData.fileBuffer = buffer

      uiData.fileLoading = true // 文件加载完毕，准备好渲染
      console.log('已更新本地文件 ', file.file.size, uiData.file.size)
    } else {
      // 网络文件默认标记为可加载
      uiData.fileLoading = true
    }
  } catch (error) {
    console.error('读取文件时出错：', error)
    uiData.fileLoading = false // 读取失败也应标记为 false
  }
}

const { getWindowPayload, getWindowPayloadListener } = useWindow()

let unListen: (() => void) | null = null

onMounted(async () => {
  const webviewWindow = getCurrentWebviewWindow()
  const label = webviewWindow.label

  unListen = await getWindowPayloadListener(label, (event: any) => {
    const payload: PayloadData = event.payload.payload
    console.log('payload更新：', payload)

    merge(uiData.payload, payload)

    updateFile(payload.resourceFile.absolutePath || '', payload.resourceFile.localExists)
  })

  try {
    const payload = await getWindowPayload<PayloadData>(label)
    console.log('获取的载荷信息：', payload)

    merge(uiData.payload, payload)

    updateFile(payload.resourceFile.absolutePath || '', payload.resourceFile.localExists)
  } catch (error) {
    console.log('获取错误：', error)
  }

  await webviewWindow.show()
})

onBeforeUnmount(async () => {
  if (unListen) {
    unListen()
  }
})
</script>

<style scoped lang="scss"></style>
