import { ref } from 'vue'
import { createEventHook } from '@vueuse/core'
import { writeFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'

export const useDownload = () => {
  const process = ref(0)
  const isDownloading = ref(false)
  const { on: onLoaded, trigger } = createEventHook()

  const downloadFile = async (url: string, savePath: string, baseDir: BaseDirectory = BaseDirectory.AppCache) => {
    try {
      isDownloading.value = true
      process.value = 0

      // 确保目录存在
      const dirPath = savePath.substring(0, savePath.lastIndexOf('/'))
      if (dirPath) {
        const dirExists = await exists(dirPath, { baseDir })
        if (!dirExists) {
          await mkdir(dirPath, { baseDir, recursive: true })
        }
      }

      const response = await fetch(url)
      if (!response.ok) {
        return window.$message.error('下载失败')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        return window.$message.error('无法读取响应内容')
      }

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

      await writeFile(savePath, allChunks, { baseDir })
      trigger('success')
    } catch (error) {
      console.error('下载失败:', error)
      trigger('fail')
      throw error
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
