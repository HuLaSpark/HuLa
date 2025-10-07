import { save } from '@tauri-apps/plugin-dialog'
import type { useDownload } from '@/hooks/useDownload'
import { extractFileName } from './Formatting'

const VIDEO_FILE_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'] as const

type DownloadFileFn = ReturnType<typeof useDownload>['downloadFile']

type SaveAttachmentOptions = {
  url?: string
  downloadFile: DownloadFileFn
  defaultFileName?: string
  filters?: Array<{ name: string; extensions: string[] }>
  successMessage?: string
  errorMessage?: string
}

const normalizeSavePath = (path: string) => path.replace(/\\/g, '/')

const saveAttachmentAs = async ({
  url,
  downloadFile,
  defaultFileName,
  filters,
  successMessage,
  errorMessage
}: SaveAttachmentOptions) => {
  if (!url) {
    window.$message.error('未找到下载链接')
    return
  }

  const filename = defaultFileName || extractFileName(url)

  try {
    const savePath = await save({
      defaultPath: filename,
      filters
    })

    if (!savePath) return

    const normalizedPath = normalizeSavePath(savePath)
    await downloadFile(url, normalizedPath)

    if (successMessage) {
      window.$message.success(successMessage)
    }
  } catch (error) {
    console.error(errorMessage || '保存文件失败:', error)
    if (errorMessage) {
      window.$message.error(errorMessage)
    }
  }
}

export const saveVideoAttachmentAs = async (options: SaveAttachmentOptions) => {
  await saveAttachmentAs({
    filters: options.filters || [
      {
        name: 'Video',
        extensions: [...VIDEO_FILE_EXTENSIONS]
      }
    ],
    successMessage: options.successMessage || '视频保存成功',
    errorMessage: options.errorMessage || '保存视频失败',
    ...options
  })
}

export const saveFileAttachmentAs = async (options: SaveAttachmentOptions) => {
  await saveAttachmentAs({
    successMessage: options.successMessage || '文件下载成功',
    errorMessage: options.errorMessage || '保存文件失败',
    ...options
  })
}
