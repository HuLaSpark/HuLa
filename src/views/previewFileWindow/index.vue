<template>
  <div class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />
    <n-scrollbar
      style="max-height: calc(100vh)"
      class="w-full box-border bg-[--center-bg-color] rounded-b-8px border-(solid 1px [--line-color])">
      <div class="flex flex-col gap-4 bg-#808080">
        <!-- <VueOfficeDocx
          v-if="uiData.resourceFile.type?.ext === 'docx' || uiData.resourceFile.type?.ext === 'doc'"
          :src="uiData.resourceFile.url" /> -->
        <VueOfficeDocx v-if="shouldRenderWord" :src="uiData.resourceFile.url" style="height: 100vh" />
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
import { FileTypeResult } from 'file-type'
import '@vue-office/docx/lib/v3/index.css'
import '@vue-office/excel/lib/v3/index.css'
import { getFile, getUserAbsoluteVideosDir } from '@/utils/PathUtil'
import { BaseDirectory, join } from '@tauri-apps/api/path'
import { exists } from '@tauri-apps/plugin-fs'
import { useWindow } from '@/hooks/useWindow'

type ResourceFile = {
  fileName: string
  absolutePath: string | undefined
  nativePath: string | undefined
  url: string
  type: FileTypeResult | undefined
  localExists: boolean
}

type PayloadData = {
  userId: string
  roomId: string
  messageId: string
  resourceFile: ResourceFile
}

const uiData = ref({
  resourceFile: {} as ResourceFile,
  userId: '',
  roomId: ''
})

const shouldRenderWord = computed(() => {
  const ext = uiData.value.resourceFile.type?.ext?.toLowerCase()
  if (ext) {
    return ['docx', 'doc', 'cfb'].includes(ext)
  }
  return false
})

// PDF 渲染完成回调
function onPdfRendered() {
  console.log('✅ PDF 渲染完成')
}

// PDF 渲染失败回调
function onPdfError(error: any) {
  console.error('❌ PDF 渲染失败', error)
}

const { getWindowPayload, getWindowPayloadListener } = useWindow()

async function initResourceFile(payload: PayloadData) {
  const absolutePath = await join(
    await getUserAbsoluteVideosDir(payload.userId, payload.roomId),
    payload.resourceFile.fileName
  )

  console.log('文件本地绝对路径：', absolutePath)

  const fileExists = await exists(absolutePath, { baseDir: BaseDirectory.AppCache })

  if (fileExists) {
    const result = await getFile(absolutePath)
    console.log('✅ 使用本地文件渲染：', absolutePath)

    uiData.value.resourceFile = {
      ...payload.resourceFile,
      absolutePath,
      localExists: true,
      url: URL.createObjectURL(result.file),
      type: {
        ext: result.meta.file_type,
        mime: result.meta.mime_type
      }
    }
  } else {
    console.log('⚠️ 本地文件不存在，使用远程链接：', payload.resourceFile.url)

    uiData.value.resourceFile = {
      ...payload.resourceFile,
      absolutePath,
      localExists: false
    }
  }
}

let unListen: (() => void) | null = null

onMounted(async () => {
  const webviewWindow = getCurrentWebviewWindow()
  const label = webviewWindow.label

  unListen = await getWindowPayloadListener(label, (event: any) => {
    const payload = event.payload
    console.log('payload更新：', payload)

    uiData.value.userId = payload.userId
    uiData.value.roomId = payload.roomId

    initResourceFile(payload)
  })

  try {
    const result = await getWindowPayload<PayloadData>(label)

    console.log('获取的载荷信息：', result)

    uiData.value.userId = result.userId
    uiData.value.roomId = result.roomId

    await initResourceFile(result)

    console.log('获取完成：', result)
  } catch (error) {
    console.log('获取错误：', error)
  }

  await webviewWindow.show()
})

onBeforeUnmount(async () => {
  if (uiData.value.resourceFile.localExists && uiData.value.resourceFile.url?.startsWith('blob:')) {
    URL.revokeObjectURL(uiData.value.resourceFile.url)
  }

  if (unListen) {
    await unListen()
  }
})
</script>

<style scoped lang="scss"></style>
