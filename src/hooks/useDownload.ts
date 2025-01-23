import { ref } from 'vue'
import { createEventHook } from '@vueuse/core'
import { writeFile } from '@tauri-apps/plugin-fs'

export const useDownload = () => {
  const process = ref(0)
  const isDownloading = ref(false)
  const { on: onLoaded, trigger } = createEventHook()

  const downloadFile = async (url: string, savePath: string) => {
    try {
      isDownloading.value = true
      process.value = 0

      const response = await fetch(url)
      if (!response.ok) throw new Error('下载失败')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应内容')

      const contentLength = Number(response.headers.get('Content-Length')) || 0
      const chunks: Uint8Array[] = []
      let receivedLength = 0

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedLength += value.length

        if (contentLength) {
          process.value = Math.floor((receivedLength / contentLength) * 100)
        }
      }

      const allChunks = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        allChunks.set(chunk, position)
        position += chunk.length
      }

      await writeFile(savePath, allChunks)
      trigger('success')
      window.$message.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      window.$message.error('保存失败')
      trigger('fail')
    } finally {
      isDownloading.value = false
      process.value = 0
    }
  }

  return {
    onLoaded,
    downloadFile,
    process,
    isDownloading
  }
}
