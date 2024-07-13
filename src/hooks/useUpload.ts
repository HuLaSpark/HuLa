import { ref } from 'vue'
import { createEventHook } from '@vueuse/core'
import apis from '@/services/apis'

/** 文件信息类型 */
export type FileInfoType = {
  name: string
  type: string
  size: number
  suffix: string
  width?: number
  height?: number
  downloadUrl?: string
  second?: number
  thumbWidth?: number
  thumbHeight?: number
  thumbUrl?: string
}

const Max = 100 // 单位M
const MAX_FILE_SIZE = Max * 1024 * 1024 // 最大上传限制

/**
 * 文件上传Hook
 */
export const useUpload = () => {
  const isUploading = ref(false) // 是否正在上传
  const progress = ref(0) // 进度
  const fileInfo = ref<FileInfoType | null>(null) // 文件信息

  const { on: onChange, trigger } = createEventHook()
  const onStart = createEventHook()

  /**
   * 上传文件
   * @param url 上传链接
   * @param file 文件
   * @param inner 是否内部调用
   */
  const upload = async (url: string, file: File, inner?: boolean) => {
    isUploading.value = true

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = function (e) {
      if (!inner) {
        progress.value = Math.round((e.loaded / e.total) * 100)
      }
    }
    xhr.onload = function () {
      isUploading.value = false
      if (inner) return
      if (xhr.status === 200) {
        trigger('success')
      } else {
        trigger('fail')
      }
    }
    xhr.send(file)
  }
  /**
   * 获取视频第一帧
   */
  const getVideoCover = (file: File) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const tempUrl = URL.createObjectURL(file)
      video.src = tempUrl
      video.crossOrigin = 'anonymous' // 视频跨域
      video.currentTime = 2 // 第2帧
      video.oncanplay = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

        // 将canvas转为图片file
        canvas.toBlob((blob) => {
          if (!blob) return
          // 时间戳生成唯一文件名
          const name = Date.now() + 'thumb.jpg'
          const thumbFile = new File([blob], name, { type: 'image/jpeg' })
          // 转成File对象 并上传
          apis.getUploadUrl({ fileName: name, scene: '1' }).then(async (res) => {
            if (res.data.uploadUrl && res.data.downloadUrl) {
              await upload(res.data.uploadUrl, thumbFile, true)
              // 等待上传完成
              const timer = setInterval(() => {
                if (!isUploading.value) {
                  clearInterval(timer)
                  resolve({
                    thumbWidth: canvas.width,
                    thumbHeight: canvas.height,
                    thumbUrl: res.data.downloadUrl,
                    thumbSize: thumbFile.size,
                    tempUrl
                  })
                }
              })
            }
          })
        })
      }
      video.onerror = function () {
        URL.revokeObjectURL(tempUrl) // 释放临时URL资源
        reject({ width: 0, height: 0, url: null })
      }
    })
  }

  /**
   * 获取图片宽高
   */
  const getImgWH = (file: File) => {
    const img = new Image()
    const tempUrl = URL.createObjectURL(file)
    img.src = tempUrl
    return new Promise((resolve, reject) => {
      img.onload = function () {
        resolve({ width: img.width, height: img.height, tempUrl })
      }
      img.onerror = function () {
        URL.revokeObjectURL(tempUrl) // 释放临时URL资源
        reject({ width: 0, height: 0, url: null })
      }
    })
  }

  /**
   * 获取音频时长
   */
  const getAudioDuration = (file: File) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const tempUrl = URL.createObjectURL(file)
      audio.src = tempUrl
      // 计算音频的时长
      const countAudioTime = async () => {
        while (isNaN(audio.duration) || audio.duration === Infinity) {
          // 防止浏览器卡死
          await new Promise((resolve) => setTimeout(resolve, 100))
          // 随机进度条位置
          audio.currentTime = 100000 * Math.random()
        }
        // 取整
        const second = Math.round(audio.duration || 0)
        resolve({ second, tempUrl })
      }
      countAudioTime()
      audio.onerror = function () {
        reject({ second: 0, tempUrl })
      }
    })
  }

  /**
   * 解析文件
   * @param file 文件
   * @param addParams 参数
   * @returns 文件大小、文件类型、文件名、文件后缀...
   */
  const parseFile = async (file: File, addParams: Record<string, any> = {}) => {
    const { name, size, type } = file
    const suffix = name.split('.').pop()?.trim().toLowerCase() || ''
    const baseInfo = { name, size, type, suffix, ...addParams }

    if (type.includes('image')) {
      const { width, height, tempUrl } = (await getImgWH(file)) as any
      return { ...baseInfo, width, height, tempUrl }
    }

    if (type.includes('audio')) {
      const { second, tempUrl } = (await getAudioDuration(file)) as any
      return { second, tempUrl, ...baseInfo }
    }
    // 如果是视频
    if (type.includes('video')) {
      const { thumbWidth, thumbHeight, tempUrl, thumbTempUrl, thumbUrl, thumbSize } = (await getVideoCover(file)) as any
      return { ...baseInfo, thumbWidth, thumbHeight, tempUrl, thumbTempUrl, thumbUrl, thumbSize }
    }

    return baseInfo
  }

  /**
   * 上传文件
   * @param file 文件
   * @param addParams 额外参数
   */
  const uploadFile = async (file: File, addParams?: Record<string, any>) => {
    if (isUploading.value || !file) return
    const info = await parseFile(file, addParams)

    // 限制文件大小
    if (info.size > MAX_FILE_SIZE) {
      window.$message.error(`文件大小不能超过 ${Max}MB`)
      return
    }

    const { downloadUrl, uploadUrl } = (await apis.getUploadUrl({ fileName: info.name, scene: '1' })).data

    if (uploadUrl && downloadUrl) {
      fileInfo.value = { ...info, downloadUrl }
      await onStart.trigger(fileInfo)
      await upload(uploadUrl, file)
    } else {
      await trigger('fail')
    }
  }

  return {
    fileInfo,
    isUploading,
    progress,
    onStart: onStart.on,
    onChange,
    uploadFile
  }
}
