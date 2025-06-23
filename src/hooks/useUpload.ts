import { createEventHook } from '@vueuse/core'
import apis from '@/services/apis'
import { UploadSceneEnum } from '@/enums'
import { fetch } from '@tauri-apps/plugin-http'
import { BaseDirectory, readFile } from '@tauri-apps/plugin-fs'
import { useConfigStore } from '@/stores/config'
import { MD5, lib } from 'crypto-js'
import { useUserStore } from '@/stores/user'
import { getImageDimensions } from '@/utils/ImageUtils'

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

/** 上传方式 */
export enum UploadProviderEnum {
  /** 默认上传方式 */
  DEFAULT = 'default',
  /** 七牛云上传 */
  QINIU = 'qiniu'
}

/** 上传配置 */
export interface UploadOptions {
  /** 上传方式 */
  provider?: UploadProviderEnum
  /** 上传场景 */
  scene?: UploadSceneEnum
  /** 是否使用分片上传（仅对七牛云有效） */
  useChunks?: boolean
  /** 分片大小（单位：字节，默认4MB） */
  chunkSize?: number
  /** 是否启用文件去重（使用文件哈希作为文件名） */
  enableDeduplication?: boolean
}

/** 分片上传进度信息 */
interface ChunkProgressInfo {
  uploadedChunks: number
  totalChunks: number
  currentChunkProgress: number
}

const Max = 100 // 单位M
const MAX_FILE_SIZE = Max * 1024 * 1024 // 最大上传限制
const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024 // 默认分片大小：4MB

/**
 * 文件上传Hook
 */
export const useUpload = () => {
  // 获取configStore配置中的ossDomain
  const configStore = useConfigStore()
  const userStore = useUserStore()
  const isUploading = ref(false) // 是否正在上传
  const progress = ref(0) // 进度
  const fileInfo = ref<FileInfoType | null>(null) // 文件信息
  const currentProvider = ref<UploadProviderEnum>(UploadProviderEnum.DEFAULT) // 当前上传方式

  const { on: onChange, trigger } = createEventHook()
  const onStart = createEventHook()

  /**
   * 计算文件的MD5哈希值
   * @param file 文件
   * @returns MD5哈希值
   */
  const calculateFileHash = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      // 将ArrayBuffer转换为WordArray
      const wordArray = lib.WordArray.create(arrayBuffer as any)
      // 计算MD5
      return MD5(wordArray).toString()
    } catch (error) {
      console.error('计算文件哈希值失败:', error)
      // 如果计算失败，返回时间戳作为备用方案
      return Date.now().toString()
    }
  }

  /**
   * 根据文件名获取文件类型
   * @param fileName 文件名
   */
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      case 'gif':
        return 'image/gif'
      case 'mp4':
        return 'video/mp4'
      case 'mp3':
        return 'audio/mp3'
      default:
        return 'application/octet-stream' // 默认类型
    }
  }

  /**
   * 生成文件哈希
   * @param options 上传配置
   * @param fileObj 文件对象
   * @param fileName 文件名
   * @returns 文件哈希
   */
  const generateHashKey = async (
    options: { scene: UploadSceneEnum; enableDeduplication: boolean },
    fileObj: File,
    fileName: string
  ) => {
    let key: string

    if (options.enableDeduplication) {
      // 使用文件哈希作为文件名的一部分，实现去重
      const fileHash = await calculateFileHash(fileObj)
      const fileSuffix = fileName.split('.').pop() || ''
      // 获取当前登录用户的account
      const account = userStore.userInfo.account
      key = `${options.scene}/${account}/${fileHash}.${fileSuffix}`
      console.log('使用文件去重模式，文件哈希:', fileHash)
    } else {
      // 使用时间戳生成唯一的文件名
      key = `${options.scene}/${Date.now()}_${fileName}`
    }
    return key
  }

  /**
   * 上传文件到默认存储
   * @param url 上传链接
   * @param file 文件
   */
  const uploadToDefault = async (url: string, file: File) => {
    isUploading.value = true

    try {
      // 将File对象转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // 使用fetch API进行上传
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: arrayBuffer,
        duplex: 'half'
      } as RequestInit)

      isUploading.value = false

      if (response.ok) {
        trigger('success')
      } else {
        trigger('fail')
      }
    } catch (error) {
      isUploading.value = false
      console.error('Upload failed:', error)
    }
  }

  /**
   * 上传文件到七牛云
   * @param file 文件
   * @param qiniuConfig 七牛云配置
   * @param enableDeduplication 是否启用文件去重
   */
  const uploadToQiniu = async (
    file: File,
    scene: UploadSceneEnum,
    qiniuConfig: { token: string; domain: string; storagePrefix: string; region?: string },
    enableDeduplication: boolean = true
  ) => {
    isUploading.value = true
    progress.value = 0

    try {
      // 创建FormData对象
      const formData = new FormData()

      // 生成文件名
      const key = await generateHashKey({ scene, enableDeduplication }, file, file.name)

      // 添加七牛云上传所需参数
      formData.append('token', qiniuConfig.token)
      formData.append('key', key)
      formData.append('file', file)

      // 使用fetch API进行上传
      const response = await fetch(qiniuConfig.domain, {
        method: 'POST',
        body: formData
      })

      isUploading.value = false

      if (response.ok) {
        const result = await response.json()
        const downloadUrl = `${configStore.config.qiNiu.ossDomain}/${result.key || key}`
        trigger('success')
        return { downloadUrl, key }
      } else {
        trigger('fail')
        return { error: 'Upload failed' }
      }
    } catch (error) {
      isUploading.value = false
      console.error('Qiniu upload failed:', error)
      return { error: 'Upload failed' }
    }
  }

  /**
   * 将文件分片并上传到七牛云
   * @param file 文件
   * @param qiniuConfig 七牛云配置
   * @param chunkSize 分片大小（字节）
   * @param inner 是否内部调用
   */
  const uploadToQiniuWithChunks = async (
    file: File,
    qiniuConfig: { token: string; domain: string; storagePrefix: string; region?: string },
    chunkSize: number = DEFAULT_CHUNK_SIZE,
    inner?: boolean
  ) => {
    isUploading.value = true
    progress.value = 0

    try {
      // 生成唯一的文件名
      const key = `${qiniuConfig.storagePrefix}/${Date.now()}_${file.name}`

      // 计算分片数量
      const totalSize = file.size
      const totalChunks = Math.ceil(totalSize / chunkSize)

      // 创建进度跟踪对象
      const progressInfo: ChunkProgressInfo = {
        uploadedChunks: 0,
        totalChunks,
        currentChunkProgress: 0
      }

      console.log('开始七牛云分片上传:', {
        fileName: file.name,
        fileSize: totalSize,
        chunkSize,
        totalChunks,
        token: qiniuConfig.token.substring(0, 10) + '...',
        domain: qiniuConfig.domain
      })

      // 初始化上传
      const initResponse = await fetch(`${qiniuConfig.domain}/mkblk/${totalSize}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `UpToken ${qiniuConfig.token}`
        },
        body: await file.slice(0, Math.min(chunkSize, totalSize)).arrayBuffer()
      })

      if (!initResponse.ok) {
        throw new Error(`初始化分片上传失败: ${initResponse.statusText}`)
      }

      const initResult = await initResponse.json()
      progressInfo.uploadedChunks = 1
      progress.value = Math.floor((progressInfo.uploadedChunks / progressInfo.totalChunks) * 100)

      console.log('初始化分片上传成功:', {
        ctx: initResult.ctx.substring(0, 10) + '...',
        nextChunkOffset: initResult.offset,
        uploadedChunks: progressInfo.uploadedChunks,
        totalChunks: progressInfo.totalChunks
      })

      // 上传剩余分片
      let context = initResult.ctx
      let offset = initResult.offset

      for (let i = 1; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, totalSize)
        const chunkData = await file.slice(start, end).arrayBuffer()

        const chunkResponse = await fetch(`${qiniuConfig.domain}/bput/${context}/${offset}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `UpToken ${qiniuConfig.token}`
          },
          body: chunkData
        })

        if (!chunkResponse.ok) {
          throw new Error(`上传分片 ${i + 1}/${totalChunks} 失败: ${chunkResponse.statusText}`)
        }

        const chunkResult = await chunkResponse.json()
        context = chunkResult.ctx
        offset = chunkResult.offset
        progressInfo.uploadedChunks++

        progress.value = Math.floor((progressInfo.uploadedChunks / progressInfo.totalChunks) * 100)

        console.log(`上传分片 ${progressInfo.uploadedChunks}/${progressInfo.totalChunks} 成功:`, {
          ctx: context.substring(0, 10) + '...',
          nextChunkOffset: offset,
          progress: progress.value + '%'
        })
      }

      // 完成上传
      const completeResponse = await fetch(`${qiniuConfig.domain}/mkfile/${totalSize}/key/${btoa(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `UpToken ${qiniuConfig.token}`
        },
        body: context
      })

      if (!completeResponse.ok) {
        throw new Error(`完成分片上传失败: ${completeResponse.statusText}`)
      }

      const completeResult = await completeResponse.json()
      console.log('完成分片上传:', completeResult)

      isUploading.value = false
      progress.value = 100

      if (inner) return { key, domain: qiniuConfig.domain }

      const downloadUrl = `${qiniuConfig.domain}/${completeResult.key || key}`
      trigger('success')
      return { downloadUrl, key }
    } catch (error) {
      isUploading.value = false
      if (!inner) {
        trigger('fail')
      }
      console.error('七牛云分片上传失败:', error)
      return { error: 'Upload failed' }
    }
  }

  /**
   * 获取视频第十帧
   */
  const getVideoCover = async (file: File, scene: UploadSceneEnum) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const tempUrl = URL.createObjectURL(file)
      video.src = tempUrl
      video.crossOrigin = 'anonymous' // 视频跨域
      video.currentTime = 10 // 第10帧
      video.oncanplay = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

        // 将canvas转为图片file
        canvas.toBlob(async (blob) => {
          if (!blob) return
          // 时间戳生成唯一文件名
          const name = Date.now() + 'thumb.jpg'
          const thumbFile = new File([blob], name, { type: 'image/jpeg' })

          if (currentProvider.value === UploadProviderEnum.QINIU) {
            try {
              // 获取七牛云token
              const qiniuConfig = await apis.getQiniuToken()
              const result = (await uploadToQiniu(thumbFile, scene, qiniuConfig)) as any
              if (result && result.key) {
                const thumbUrl = `${result.domain}/${result.key}`
                resolve({
                  thumbWidth: canvas.width,
                  thumbHeight: canvas.height,
                  thumbUrl: thumbUrl,
                  thumbSize: thumbFile.size,
                  tempUrl
                })
              }
            } catch (error) {
              console.error('获取七牛云token失败:', error)
              reject(error)
            }
          } else {
            // 使用默认上传方式
            try {
              const res = await apis.getUploadUrl({ fileName: name, scene: UploadSceneEnum.CHAT })
              if (res.uploadUrl && res.downloadUrl) {
                await uploadToDefault(res.uploadUrl, thumbFile)
                // 等待上传完成
                const timer = setInterval(() => {
                  if (!isUploading.value) {
                    clearInterval(timer)
                    resolve({
                      thumbWidth: canvas.width,
                      thumbHeight: canvas.height,
                      thumbUrl: res.downloadUrl,
                      thumbSize: thumbFile.size,
                      tempUrl
                    })
                  }
                })
              }
            } catch (error) {
              console.error('获取上传链接失败:', error)
              reject(error)
            }
          }
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
  const getImgWH = async (file: File) => {
    try {
      const result = await getImageDimensions(file, { includePreviewUrl: true })
      return {
        width: result.width,
        height: result.height,
        tempUrl: result.previewUrl!
      }
    } catch (error) {
      return { width: 0, height: 0, url: null }
    }
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
      const { thumbWidth, thumbHeight, tempUrl, thumbTempUrl, thumbUrl, thumbSize } = (await getVideoCover(
        file,
        addParams.scene
      )) as any
      return { ...baseInfo, thumbWidth, thumbHeight, tempUrl, thumbTempUrl, thumbUrl, thumbSize }
    }

    return baseInfo
  }

  /**
   * 上传文件
   * @param file 文件
   * @param options 上传选项
   */
  const uploadFile = async (file: File, options?: UploadOptions) => {
    if (isUploading.value || !file) return

    // 设置当前上传方式
    if (options?.provider) {
      currentProvider.value = options.provider
    }

    const info = await parseFile(file, options)

    // 限制文件大小
    if (info.size > MAX_FILE_SIZE) {
      window.$message.error(`文件大小不能超过 ${Max}MB`)
      return
    }

    // 根据上传方式选择不同的上传逻辑
    if (currentProvider.value === UploadProviderEnum.QINIU) {
      try {
        // 获取七牛云token
        const qiniuConfig = await apis.getQiniuToken()
        fileInfo.value = { ...info }
        await onStart.trigger(fileInfo)

        // 判断是否使用分片上传
        if (options?.useChunks && file.size > (options?.chunkSize || DEFAULT_CHUNK_SIZE)) {
          const result = (await uploadToQiniuWithChunks(
            file,
            qiniuConfig,
            options?.chunkSize || DEFAULT_CHUNK_SIZE
          )) as any
          if (result && result.downloadUrl) {
            fileInfo.value = { ...info, downloadUrl: result.downloadUrl }
          }
          return result
        } else {
          const result = await uploadToQiniu(
            file,
            options?.scene || UploadSceneEnum.CHAT,
            qiniuConfig,
            options?.enableDeduplication || true
          )
          if (result && result.downloadUrl) {
            fileInfo.value = { ...info, downloadUrl: result.downloadUrl }
          }
          return result
        }
      } catch (error) {
        console.error('获取七牛云token失败:', error)
        await trigger('fail')
      }
    } else {
      // 使用默认上传方式
      try {
        const scene = options?.scene || UploadSceneEnum.CHAT
        const { downloadUrl, uploadUrl } = await apis.getUploadUrl({ fileName: info.name, scene })

        if (uploadUrl && downloadUrl) {
          fileInfo.value = { ...info, downloadUrl }
          await onStart.trigger(fileInfo)
          await uploadToDefault(uploadUrl, file)
          return { downloadUrl }
        } else {
          await trigger('fail')
        }
      } catch (error) {
        console.error('获取上传链接失败:', error)
        await trigger('fail')
      }
    }
  }

  /**
   * 获取上传和下载URL
   * 如果是默认上传方式，获取上传和下载URL，执行上传
   * 如果是七牛云上传方式，获取七牛云token，不执行上传
   * @param path 文件路径
   * @param options 上传选项
   */
  const getUploadAndDownloadUrl = async (
    path: string,
    options?: UploadOptions
  ): Promise<{ uploadUrl: string; downloadUrl: string; config?: any }> => {
    // 设置当前上传方式
    if (options?.provider) {
      currentProvider.value = options.provider
    }

    // 根据上传方式选择不同的上传逻辑
    if (currentProvider.value === UploadProviderEnum.QINIU) {
      try {
        // 获取七牛云token
        const qiniuConfig = await apis.getQiniuToken()
        const config = {
          ...qiniuConfig,
          provider: options?.provider,
          scene: options?.scene
        }

        // 对于七牛云，我们不需要预先获取上传URL，而是直接返回一个标记
        return {
          uploadUrl: 'qiniu', // 标记为七牛云上传
          downloadUrl: qiniuConfig.domain, // 下载URL会在实际上传后生成
          config: config
        }
      } catch (error) {
        throw new Error('获取七牛云token失败，请重试')
      }
    } else {
      // 使用默认上传方式
      console.log('开始默认上传图片:', path)
      const fileName = path.split('/').pop()
      if (!fileName) {
        throw new Error('文件解析出错')
      }

      try {
        const scene = options?.scene || UploadSceneEnum.CHAT
        const res = await apis.getUploadUrl({
          fileName: fileName,
          scene
        })

        console.log('获取上传链接成功:', res)
        return res
      } catch (error) {
        throw new Error('获取上传链接失败，请重试')
      }
    }
  }

  /**
   * 执行实际的文件上传
   * @param path 文件路径
   * @param uploadUrl 上传URL
   * @param options 上传选项
   */
  const doUpload = async (path: string, uploadUrl: string, options?: any): Promise<{ qiniuUrl: string } | string> => {
    // 如果是七牛云上传
    if (uploadUrl === UploadProviderEnum.QINIU && options) {
      try {
        const file = await readFile(path, { baseDir: BaseDirectory.AppCache })

        // 创建File对象
        const fileName = path.split('/').pop() || 'file'
        const fileObj = new File([new Uint8Array(file)], fileName, {
          type: getFileType(fileName)
        })

        isUploading.value = true
        progress.value = 0

        console.log('七牛云上传开始:', {
          token: options.token,
          domain: options.domain,
          scene: options.scene,
          storagePrefix: options.storagePrefix,
          fileName,
          fileSize: file.length,
          enableDeduplication: options.enableDeduplication
        })

        // 判断是否使用分片上传
        if (options.useChunks && file.length > (options.chunkSize || DEFAULT_CHUNK_SIZE)) {
          console.log('使用分片上传方式')

          // 执行分片上传
          const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE
          const totalSize = file.length
          const totalChunks = Math.ceil(totalSize / chunkSize)

          // 创建进度跟踪对象
          const progressInfo: ChunkProgressInfo = {
            uploadedChunks: 0,
            totalChunks,
            currentChunkProgress: 0
          }

          // 生成文件名和key
          const key = await generateHashKey(
            { scene: options.scene, enableDeduplication: options.enableDeduplication },
            fileObj,
            fileName
          )

          console.log('开始七牛云分片上传:', {
            fileName,
            fileSize: totalSize,
            chunkSize,
            totalChunks,
            key
          })

          // 初始化上传
          const initResponse = await fetch(`${options.domain}/mkblk/${Math.min(chunkSize, totalSize)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Authorization: `UpToken ${options.token}`
            },
            body: file.slice(0, Math.min(chunkSize, totalSize))
          })

          if (!initResponse.ok) {
            const errorText = await initResponse.text()
            console.error('初始化分片上传失败:', {
              status: initResponse.status,
              statusText: initResponse.statusText,
              errorText
            })
            throw new Error(`初始化分片上传失败: ${initResponse.statusText}`)
          }

          const initResult = await initResponse.json()
          progressInfo.uploadedChunks = 1
          progress.value = Math.floor((progressInfo.uploadedChunks / progressInfo.totalChunks) * 100)

          console.log('初始化分片上传成功:', {
            ctx: initResult.ctx.substring(0, 10) + '...',
            nextChunkOffset: initResult.offset,
            uploadedChunks: progressInfo.uploadedChunks,
            totalChunks: progressInfo.totalChunks
          })

          // 上传剩余分片
          let context = initResult.ctx
          let offset = initResult.offset

          for (let i = 1; i < totalChunks; i++) {
            const start = i * chunkSize
            const end = Math.min(start + chunkSize, totalSize)
            const chunkData = file.slice(start, end)

            const chunkResponse = await fetch(`${options.domain}/bput/${context}/${offset}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Authorization: `UpToken ${options.token}`
              },
              body: chunkData
            })

            if (!chunkResponse.ok) {
              const errorText = await chunkResponse.text()
              console.error(`上传分片 ${i + 1}/${totalChunks} 失败:`, {
                status: chunkResponse.status,
                statusText: chunkResponse.statusText,
                errorText
              })
              throw new Error(`上传分片 ${i + 1}/${totalChunks} 失败: ${chunkResponse.statusText}`)
            }

            const chunkResult = await chunkResponse.json()
            context = chunkResult.ctx
            offset = chunkResult.offset
            progressInfo.uploadedChunks++

            progress.value = Math.floor((progressInfo.uploadedChunks / progressInfo.totalChunks) * 100)

            console.log(`上传分片 ${progressInfo.uploadedChunks}/${progressInfo.totalChunks} 成功:`, {
              ctx: context.substring(0, 10) + '...',
              nextChunkOffset: offset,
              progress: progress.value + '%'
            })
          }

          // 完成上传
          const encodedKey = btoa(key)
          const completeResponse = await fetch(`${options.domain}/mkfile/${totalSize}/key/${encodedKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Authorization: `UpToken ${options.token}`
            },
            body: context
          })

          if (!completeResponse.ok) {
            const errorText = await completeResponse.text()
            console.error('完成分片上传失败:', {
              status: completeResponse.status,
              statusText: completeResponse.statusText,
              errorText
            })
            throw new Error(`完成分片上传失败: ${completeResponse.statusText}`)
          }

          const completeResult = await completeResponse.json()
          console.log('完成分片上传:', completeResult)

          isUploading.value = false
          progress.value = 100

          const qiniuUrl = `${configStore.config.qiNiu.ossDomain}/${completeResult.key || key}`
          trigger('success')
          return { qiniuUrl }
        } else {
          // 使用普通上传方式
          // 创建FormData对象
          const formData = new FormData()

          // 生成文件名和key
          const key = await generateHashKey(
            { scene: options.scene, enableDeduplication: options.enableDeduplication },
            fileObj,
            fileName
          )

          formData.append('token', options.token)
          formData.append('key', key)
          formData.append('file', fileObj)

          // 使用fetch API进行上传
          const response = await fetch(options.domain, {
            headers: {
              Host: options.storagePrefix
            },
            method: 'POST',
            body: formData
          } as RequestInit)

          isUploading.value = false
          progress.value = 100

          console.log('七牛云上传响应:', {
            status: response.status,
            statusText: response.statusText
          })

          if (response.ok) {
            const result = await response.json()
            console.log('七牛云上传成功:', result)
            const qiniuUrl = `${configStore.config.qiNiu.ossDomain}/${result.key}`
            trigger('success')
            return qiniuUrl
          } else {
            const errorText = await response.text()
            console.error('七牛云上传失败:', {
              status: response.status,
              statusText: response.statusText,
              errorText
            })
            trigger('fail')
            throw new Error(`上传失败: ${response.statusText}`)
          }
        }
      } catch (error) {
        isUploading.value = false
        trigger('fail')
        console.error('七牛云上传失败:', error)
        throw new Error('文件上传失败，请重试')
      }
    } else {
      // 使用默认上传方式
      console.log('执行文件上传:', path)
      try {
        const file = await readFile(path, { baseDir: BaseDirectory.AppCache })

        // 添加文件大小检查
        if (file.length > MAX_FILE_SIZE) {
          throw new Error(`文件大小不能超过${Max}MB`)
        }

        isUploading.value = true
        progress.value = 0

        const response = await fetch(uploadUrl, {
          headers: { 'Content-Type': 'application/octet-stream' },
          method: 'PUT',
          body: file,
          duplex: 'half'
        } as RequestInit)

        isUploading.value = false
        progress.value = 100

        if (!response.ok) {
          trigger('fail')
          throw new Error(`上传失败: ${response.statusText}`)
        }

        console.log('文件上传成功')
        trigger('success')

        // 返回下载URL
        return options?.downloadUrl
      } catch (error) {
        isUploading.value = false
        trigger('fail')
        console.error('文件上传失败:', error)
        throw new Error('文件上传失败，请重试')
      }
    }
  }

  return {
    fileInfo,
    isUploading,
    progress,
    onStart: onStart.on,
    onChange,
    uploadFile,
    getUploadAndDownloadUrl,
    doUpload,
    UploadProviderEnum
  }
}
