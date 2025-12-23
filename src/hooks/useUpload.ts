import { Channel, invoke } from '@tauri-apps/api/core'
import { BaseDirectory, remove, stat, writeFile } from '@tauri-apps/plugin-fs'
import { fetch } from '@tauri-apps/plugin-http'
import { createEventHook } from '@vueuse/core'
import { TauriCommand, UploadSceneEnum } from '@/enums'
import { useConfigStore } from '@/stores/config'
import { useUserStore } from '@/stores/user'
import { extractFileName } from '@/utils/Formatting'
import { getImageDimensions } from '@/utils/ImageUtils'
import { getQiniuToken, getUploadProvider } from '@/utils/ImRequestUtils'
import { isAndroid, isMobile } from '@/utils/PlatformConstants'
import { getWasmMd5 } from '@/utils/Md5Util'

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
  QINIU = 'qiniu',
  /** MinIO 上传 */
  MINIO = 'minio'
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

const Max = 500 // 单位M
const MAX_FILE_SIZE = Max * 1024 * 1024 // 最大上传限制
const QINIU_CHUNK_SIZE = 4 * 1024 * 1024 // 七牛云分片大小：4MB
const CHUNK_THRESHOLD = 4 * 1024 * 1024 // 4MB，超过此大小的文件将使用分片上传

let cryptoJS: any | null = null

const isAbsolutePath = (path: string): boolean => {
  return /^(\/|[A-Za-z]:[\\/]|\\\\)/.test(path)
}

const loadCryptoJS = async () => {
  if (!cryptoJS) {
    const module = await import('crypto-js')
    cryptoJS = module.default ?? module
  }
  return cryptoJS as {
    lib: { WordArray: { create: (arr: ArrayBuffer | Uint8Array) => any } }
    MD5: (wordArray: any) => { toString: () => string }
  }
}

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

  const uploadFileWithTauriPut = async (targetUrl: string, file: File, contentType: string) => {
    const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.AppCache
    const baseDirName = isMobile() ? 'AppData' : 'AppCache'
    const safeFileName = file.name.replace(/[\\/]/g, '_')
    const tempPath = `temp-upload-${Date.now()}-${safeFileName}`

    try {
      await writeFile(tempPath, file.stream(), { baseDir })

      const onProgress = new Channel<{ progressTotal: number; total: number }>()
      let lastProgress = -1
      onProgress.onmessage = ({ progressTotal, total }) => {
        const pct = total > 0 ? Math.floor((progressTotal / total) * 100) : 0
        if (pct !== lastProgress) {
          lastProgress = pct
          progress.value = pct
          trigger('progress')
        }
      }

      await invoke(TauriCommand.UPLOAD_FILE_PUT, {
        url: targetUrl,
        path: tempPath,
        baseDir: baseDirName,
        headers: { 'Content-Type': contentType },
        onProgress
      })
    } finally {
      await remove(tempPath, { baseDir }).catch(() => void 0)
    }
  }

  /**
   * 计算文件的MD5哈希值
   * @param file 文件
   * @returns MD5哈希值
   */
  const calculateFileHash = async (file: File): Promise<string> => {
    const startTime = performance.now()
    try {
      console.log('开始计算MD5哈希值，文件大小:', file.size, 'bytes')
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      let hash: string

      if (isAndroid()) {
        const CryptoJS = await loadCryptoJS()
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as ArrayBuffer)
        hash = CryptoJS.MD5(wordArray).toString()
      } else {
        const Md5 = await getWasmMd5()
        hash = await Md5.digest_u8(uint8Array)
      }
      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(2)
      console.log(`MD5计算完成，耗时: ${duration}ms，哈希值: ${hash}`)
      return hash.toLowerCase()
    } catch (error) {
      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(2)
      console.error(`计算文件哈希值失败，耗时: ${duration}ms:`, error)
      // 如果计算失败，返回时间戳作为备用方案
      return Date.now().toString()
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
      const account = userStore.userInfo!.account
      key = `${options.scene}/${account}/${fileHash}.${fileSuffix}`
      console.log('使用文件去重模式，文件哈希:', fileHash)
    } else {
      // 使用时间戳生成唯一的文件名
      key = `${options.scene}/${Date.now()}_${fileName}`
    }
    return key
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
    chunkSize: number = QINIU_CHUNK_SIZE,
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

      // 使用七牛云的分片上传API v2 - 创建上传块
      const contexts: string[] = []

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, totalSize)
        const chunkData = await file.slice(start, end).arrayBuffer()
        const currentChunkSize = end - start

        // 创建块
        const blockResponse = await fetch(`${qiniuConfig.domain}/mkblk/${currentChunkSize}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `UpToken ${qiniuConfig.token}`
          },
          body: chunkData
        })

        if (!blockResponse.ok) {
          const errorText = await blockResponse.text()
          console.error(`上传分片 ${i + 1}/${totalChunks} 失败:`, {
            status: blockResponse.status,
            statusText: blockResponse.statusText,
            errorText
          })
          throw new Error(`上传分片 ${i + 1}/${totalChunks} 失败: ${blockResponse.statusText}`)
        }

        const blockResult = await blockResponse.json()
        contexts.push(blockResult.ctx)
        progressInfo.uploadedChunks++

        progress.value = Math.floor((progressInfo.uploadedChunks / progressInfo.totalChunks) * 100)

        console.log(`上传分片 ${progressInfo.uploadedChunks}/${progressInfo.totalChunks} 成功:`, {
          ctx: blockResult.ctx.substring(0, 10) + '...',
          progress: progress.value + '%'
        })
      }

      // 完成上传 - 合并所有块
      const completeResponse = await fetch(`${qiniuConfig.domain}/mkfile/${totalSize}/key/${btoa(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `UpToken ${qiniuConfig.token}`
        },
        body: contexts.join(',')
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
    } catch (_error) {
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
      audio.onerror = () => {
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

    // TODO：这里应该不需要进行类型判断了，可以直接返回baseInfo
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
      return { ...baseInfo }
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
    // 如果未指定 provider，读取后端默认 provider
    if (!options?.provider) {
      try {
        const res = await getUploadProvider()
        if (res?.provider === 'minio') currentProvider.value = UploadProviderEnum.MINIO
        else if (res?.provider === 'qiniu') currentProvider.value = UploadProviderEnum.QINIU
      } catch {}
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
        const cred = await getQiniuToken({ scene: options?.scene, fileName: file.name })
        fileInfo.value = { ...info }
        await onStart.trigger(fileInfo)

        if ((cred as any)?.uploadUrl) {
          const contentType = file.type || 'application/octet-stream'

          isUploading.value = true
          progress.value = 0

          await uploadFileWithTauriPut((cred as any).uploadUrl, file, contentType)

          isUploading.value = false
          progress.value = 100
          fileInfo.value = { ...fileInfo.value!, downloadUrl: (cred as any).downloadUrl }
          trigger('success')
          return { downloadUrl: (cred as any).downloadUrl }
        }

        console.log(`uploadFile - 文件大小检查: ${file.size} bytes, 阈值: ${CHUNK_THRESHOLD} bytes`)
        if (file.size > CHUNK_THRESHOLD) {
          console.log('uploadFile - 使用分片上传方式')
          const result = (await uploadToQiniuWithChunks(file, cred as any, QINIU_CHUNK_SIZE)) as any
          if (result && result.downloadUrl) {
            fileInfo.value = { ...info, downloadUrl: result.downloadUrl }
          }
          return result
        } else {
          console.log('uploadFile - 使用默认的普通上传方式')
          const result = await uploadToQiniu(
            file,
            options?.scene || UploadSceneEnum.CHAT,
            cred as any,
            options?.enableDeduplication || true
          )
          if (result && result.downloadUrl) {
            fileInfo.value = { ...info, downloadUrl: result.downloadUrl }
          }
          return result
        }
      } catch (error) {
        console.error('获取上传凭证失败:', error)
        await trigger('fail')
      }
    } else if (currentProvider.value === UploadProviderEnum.MINIO) {
      try {
        fileInfo.value = { ...(await parseFile(file, options)) }
        await onStart.trigger(fileInfo)

        const presign = await getQiniuToken({ scene: options?.scene, fileName: file.name })
        const contentType = file.type || 'application/octet-stream'

        isUploading.value = true
        progress.value = 0

        await uploadFileWithTauriPut(presign.uploadUrl, file, contentType)

        isUploading.value = false
        progress.value = 100

        fileInfo.value = { ...fileInfo.value!, downloadUrl: presign.downloadUrl }
        trigger('success')
        return { downloadUrl: presign.downloadUrl }
      } catch (error) {
        isUploading.value = false
        console.error('MinIO 上传失败:', error)
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
    _path: string,
    options?: UploadOptions
  ): Promise<{ uploadUrl: string; downloadUrl: string; config?: any }> => {
    // 设置当前上传方式
    if (options?.provider) {
      currentProvider.value = options.provider
    }
    // 如果未指定 provider，读取后端默认 provider
    if (!options?.provider) {
      try {
        const res = await getUploadProvider()
        if (res?.provider === 'minio') currentProvider.value = UploadProviderEnum.MINIO
        else if (res?.provider === 'qiniu') currentProvider.value = UploadProviderEnum.QINIU
      } catch {}
    }

    // 根据上传方式选择不同的上传逻辑
    if (currentProvider.value === UploadProviderEnum.QINIU) {
      try {
        const cred = await getQiniuToken({ scene: options?.scene, fileName: extractFileName(_path) })
        if ((cred as any)?.token) {
          const config = { ...cred, provider: options?.provider, scene: options?.scene }
          return { uploadUrl: UploadProviderEnum.QINIU, downloadUrl: (cred as any).domain, config }
        }
        return {
          uploadUrl: (cred as any).uploadUrl,
          downloadUrl: (cred as any).downloadUrl,
          config: { objectKey: (cred as any).objectKey, provider: UploadProviderEnum.MINIO }
        }
      } catch (_error) {
        throw new Error('获取上传凭证失败，请重试')
      }
    }
    if (currentProvider.value === UploadProviderEnum.MINIO) {
      const resp = await getQiniuToken({ scene: options?.scene, fileName: extractFileName(_path) })
      return {
        uploadUrl: resp.uploadUrl,
        downloadUrl: resp.downloadUrl,
        config: { objectKey: resp.objectKey, provider: UploadProviderEnum.MINIO }
      }
    }
    return { uploadUrl: '', downloadUrl: '' }
  }

  /**
   * 执行实际的文件上传
   * @param path 文件路径
   * @param uploadUrl 上传URL
   * @param options 上传选项
   */
  const doUpload = async (path: string, uploadUrl: string, options?: any): Promise<{ qiniuUrl: string } | string> => {
    const absolutePath = isAbsolutePath(path)

    // 如果是七牛云上传
    if (uploadUrl === UploadProviderEnum.QINIU && options) {
      const fileName = extractFileName(path)
      // 如果没有提供七牛云配置，尝试获取
      if (!options.domain || !options.token) {
        try {
          const cred = await getQiniuToken({ scene: options.scene, fileName })
          if ((cred as any)?.token) {
            options.domain = (cred as any).domain
            options.token = (cred as any).token
            options.storagePrefix = (cred as any).storagePrefix
            options.region = (cred as any).region
          } else if ((cred as any)?.uploadUrl) {
            const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.AppCache
            const baseDirName = isMobile() ? 'AppData' : 'AppCache'
            const fileStat = absolutePath ? await stat(path) : await stat(path, { baseDir })

            if (fileStat.size > MAX_FILE_SIZE) {
              throw new Error(`文件大小不能超过${Max}MB`)
            }

            isUploading.value = true
            progress.value = 0

            const onProgress = new Channel<{ progressTotal: number; total: number }>()
            let lastProgress = -1
            onProgress.onmessage = ({ progressTotal, total }) => {
              const pct = total > 0 ? Math.floor((progressTotal / total) * 100) : 0
              if (pct !== lastProgress) {
                lastProgress = pct
                progress.value = pct
                trigger('progress')
                options?.progressCallback?.(pct)
              }
            }

            await invoke(TauriCommand.UPLOAD_FILE_PUT, {
              url: (cred as any).uploadUrl,
              path,
              ...(absolutePath ? {} : { baseDir: baseDirName }),
              headers: { 'Content-Type': 'application/octet-stream' },
              onProgress
            })

            isUploading.value = false
            progress.value = 100
            trigger('success')
            return (cred as any).downloadUrl
          }
        } catch (error) {
          console.error('获取上传凭证失败', error)
        }
      }

      try {
        if (!options.domain || !options.token) {
          throw new Error('获取上传凭证失败，请重试')
        }

        const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.AppCache
        const baseDirName = isMobile() ? 'AppData' : 'AppCache'
        const fileStat = absolutePath ? await stat(path) : await stat(path, { baseDir })

        if (fileStat.size > MAX_FILE_SIZE) {
          throw new Error(`文件大小不能超过${Max}MB`)
        }

        isUploading.value = true
        progress.value = 0

        const onProgress = new Channel<{ progressTotal: number; total: number }>()
        let lastProgress = -1
        onProgress.onmessage = ({ progressTotal, total }) => {
          const pct = total > 0 ? Math.floor((progressTotal / total) * 100) : 0
          if (pct !== lastProgress) {
            lastProgress = pct
            progress.value = pct
            trigger('progress')
            options?.progressCallback?.(pct)
          }
        }

        const key = await invoke<string>(TauriCommand.QINIU_UPLOAD_RESUMABLE, {
          path,
          ...(absolutePath ? {} : { baseDir: baseDirName }),
          token: options.token,
          domain: options.domain,
          scene: options.scene,
          account: userStore.userInfo?.account,
          storagePrefix: options.storagePrefix,
          enableDeduplication: Boolean(options.enableDeduplication),
          onProgress
        })

        isUploading.value = false
        progress.value = 100
        trigger('success')
        return `${configStore.config.qiNiu.ossDomain}/${key}`
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
        if (!uploadUrl) {
          throw new Error('获取上传链接失败，请重试')
        }

        const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.AppCache
        const baseDirName = isMobile() ? 'AppData' : 'AppCache'
        const fileStat = absolutePath ? await stat(path) : await stat(path, { baseDir })

        // 添加文件大小检查
        if (fileStat.size > MAX_FILE_SIZE) {
          throw new Error(`文件大小不能超过${Max}MB`)
        }

        isUploading.value = true
        progress.value = 0

        const onProgress = new Channel<{ progressTotal: number; total: number }>()
        let lastProgress = -1
        onProgress.onmessage = ({ progressTotal, total }) => {
          const pct = total > 0 ? Math.floor((progressTotal / total) * 100) : 0
          if (pct !== lastProgress) {
            lastProgress = pct
            progress.value = pct
            trigger('progress')
            options?.progressCallback?.(pct)
          }
        }

        await invoke(TauriCommand.UPLOAD_FILE_PUT, {
          url: uploadUrl,
          path,
          ...(absolutePath ? {} : { baseDir: baseDirName }),
          headers: { 'Content-Type': 'application/octet-stream' },
          onProgress
        })

        isUploading.value = false
        progress.value = 100
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
    parseFile,
    uploadToQiniu,
    getUploadAndDownloadUrl,
    doUpload,
    UploadProviderEnum,
    generateHashKey
  }
}
