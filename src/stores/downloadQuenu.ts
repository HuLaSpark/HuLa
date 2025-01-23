import { defineStore } from 'pinia'
import { useDownload } from '@/hooks/useDownload.ts'
import { save } from '@tauri-apps/plugin-dialog'

type DownloadObjType = {
  url: string
  isDownloading: boolean
  process: number | undefined
}

// 定义一个下载队列的 store
export const useDownloadQuenuStore = defineStore('downloadQuenu', () => {
  // 最多可同时执行下载的任务数量
  const maxDownloadCount = 1
  // 下载队列
  const quenu = reactive<string[]>([])
  // 下载对象
  const downloadObjMap = reactive<Map<string, DownloadObjType>>(new Map())

  // 添加到下载队列
  const addQuenuAction = (url: string) => {
    quenu.push(url)
  }

  // 从下载队列中移除
  const removeQuenuAction = (url: string) => {
    const index = quenu.indexOf(url)
    if (index > -1) {
      quenu.splice(index, 1)
    }
  }

  // 出队列
  const dequeue = () => {
    if (!quenu.length || downloadObjMap.size >= maxDownloadCount) {
      return
    }
    const url = quenu.shift()
    if (url) {
      downloadAction(url)
    }
  }

  // 下载
  const downloadAction = async (url: string) => {
    const { downloadFile, isDownloading, process, onLoaded } = useDownload()

    try {
      // 让用户选择保存路径
      const savePath = (await save({
        filters: [
          {
            name: '所有文件',
            extensions: ['*']
          }
        ]
      })) as string // 确保savePath是string类型

      if (!savePath) {
        // 用户取消了保存对话框
        removeQuenuAction(url)
        return
      }

      const stopWatcher = watch(process, () => {
        // 更新下载进度
        downloadObjMap.set(url, { url, isDownloading: isDownloading.value, process: process.value })
      })

      onLoaded(() => {
        stopWatcher() // 清除watcher
        downloadObjMap.delete(url) // 下载完成后 删除下载对象
        dequeue()
      })

      await downloadFile(url, savePath)
    } catch (error) {
      console.error('保存失败:', error)
      window.$message.error('保存失败')
      removeQuenuAction(url)
    }
  }

  const download = (url: string) => {
    addQuenuAction(url)
    dequeue()
  }

  // 取消下载
  const cancelDownload = (url: string) => {
    if (quenu.includes(url)) {
      removeQuenuAction(url)
    }
  }

  return {
    quenu,
    addQuenuAction,
    removeQuenuAction,
    dequeue,
    downloadObjMap,
    download,
    cancelDownload
  }
})
