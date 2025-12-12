import { invoke } from '@tauri-apps/api/core'
import { appCacheDir, join } from '@tauri-apps/api/path'
import { BaseDirectory, remove, writeFile } from '@tauri-apps/plugin-fs'
import { AppException } from '@/common/exception'
import { isMobile } from '@/utils/PlatformConstants'

// 压缩缩略图至给定尺寸与质量，保持比例，返回压缩后的 File
const compressThumbnail = async (
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 150,
  quality: number = 0.6
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    img.onload = () => {
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          } else {
            reject(new AppException('缩略图压缩失败'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      reject(new AppException('缩略图加载失败'))
    }

    img.src = URL.createObjectURL(file)
  })
}

// 使用浏览器能力截取视频首帧生成缩略图，作为无 Rust 支持时的兜底方案
const getLocalVideoThumbnail = async (file: File) => {
  const url = URL.createObjectURL(file)
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.1, video.duration || 0.1)
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new AppException('生成视频缩略图失败: 无法获取画布上下文'))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blobResult) => {
            if (blobResult) {
              resolve(blobResult)
            } else {
              reject(new AppException('生成视频缩略图失败: 画布转换失败'))
            }
          },
          'image/jpeg',
          0.8
        )
      }
      video.onerror = () => reject(new AppException('生成视频缩略图失败: 无法加载视频'))
    })

    const fallbackFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
    return await compressThumbnail(fallbackFile)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// 生成视频缩略图：优先调用 Rust 获取首帧，失败或移动端则回退前端截帧
export const generateVideoThumbnail = async (file: File): Promise<File> => {
  try {
    const tempPath = `temp-video-${Date.now()}-${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.AppCache
    await writeFile(tempPath, uint8Array, { baseDir })
    const fullPath = await join(await appCacheDir(), tempPath)

    const thumbnailInfo = await invoke<{
      thumbnail_base64: string
      width: number
      height: number
      duration: number
    }>('get_video_thumbnail', {
      videoPath: fullPath,
      targetTime: 0.1
    })

    const base64Data = thumbnailInfo.thumbnail_base64
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const thumbnailBlob = new Blob([bytes], { type: 'image/jpeg' })
    const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' })

    try {
      await remove(tempPath, { baseDir })
    } catch (cleanupError) {
      console.warn('清理临时文件失败:', cleanupError)
    }

    return await compressThumbnail(thumbnailFile)
  } catch (error) {
    console.error('Rust 缩略图生成失败，尝试使用前端兜底方案:', error)
    if (isMobile() || String(error).includes('Command get_video_thumbnail not found')) {
      return await getLocalVideoThumbnail(file)
    }
    throw new AppException(`生成视频缩略图失败: ${error}`)
  }
}
