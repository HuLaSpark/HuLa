import { join } from '@tauri-apps/api/path'
import { BaseDirectory, create, exists, mkdir, readFile } from '@tauri-apps/plugin-fs'
import type { Ref } from 'vue'
import type { FilesMeta } from '@/services/types'
import { getFilesMeta, getImageCache } from '@/utils/PathUtil'
import { isMac } from '@/utils/PlatformConstants'

/**
 * 单个文件元数据接口
 */
export type FileMetaItem = {
  name: string
  path: string
  file_type: string
  mime_type: string
  exists: boolean
}

/**
 * 本地音频文件信息接口
 */
export type LocalAudioFile = {
  fileBuffer: ArrayBuffer
  cachePath: string
  fullPath: string
  fileExists: boolean
}

/**
 * 音频存在性检查结果接口
 */
export type AudioExistsResult = {
  exists: boolean
  fullPath: string
  fileMeta: FileMetaItem
}

/**
 * 音频文件管理器返回接口
 */
export type AudioFileManagerReturn = {
  // 状态
  isFileReady: Ref<boolean>
  audioBuffer: Ref<ArrayBuffer | null>

  // 方法
  getAudioUrl: (originalUrl: string) => Promise<string>
  checkAudioSupport: (mimeType: string) => boolean
  downloadAndCache: (url: string, fileName: string) => Promise<ArrayBuffer>
  loadAudioWaveform: (url: string) => Promise<ArrayBuffer | Uint8Array | SharedArrayBuffer>
  existsAudioFile: (url: string) => Promise<AudioExistsResult>

  // 清理
  cleanup: () => void
}

/**
 * 音频文件管理Hook
 * @param userId 用户ID，用于构建缓存路径
 * @returns 文件管理接口
 */
export const useAudioFileManager = (userId: string): AudioFileManagerReturn => {
  const isFileReady = ref(false)
  const audioBuffer = ref<ArrayBuffer | null>(null)
  const isMacOS = isMac()

  /**
   * 检查音频格式支持
   * @param mimeType MIME类型
   * @returns 支持级别字符串
   */
  const checkAudioSupport = (mimeType: string): boolean => {
    const audio = document.createElement('audio')
    const support = audio.canPlayType(mimeType)
    return support === 'probably' || support === 'maybe'
  }

  /**
   * 尝试从本地缓存中读取音频文件
   * @param fileName 音频文件名（如 voice_1234.mp3）
   * @returns 包含文件 buffer、完整路径、缓存路径和是否存在标志的对象
   */
  const getLocalAudioFile = async (fileName: string): Promise<LocalAudioFile> => {
    const audioFolder = 'audio'
    // 拼接缓存路径（如 cache\46022457888256\audio）
    const cachePath = getImageCache(audioFolder, userId)
    const fullPath = await join(cachePath, fileName)

    // 检查文件是否存在于本地缓存文件夹中
    const fileExists = await exists(fullPath, { baseDir: BaseDirectory.AppCache })
    if (!fileExists) {
      return {
        cachePath,
        fullPath,
        fileBuffer: new ArrayBuffer(0),
        fileExists
      }
    }

    // 读取音频文件内容
    const fileBuffer = await readFile(fullPath, { baseDir: BaseDirectory.AppCache })

    // 如果是 Uint8Array，手动转成ArrayBuffer
    const arrayBuffer =
      fileBuffer instanceof Uint8Array
        ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
        : fileBuffer

    return {
      fileBuffer: arrayBuffer,
      cachePath,
      fullPath,
      fileExists
    }
  }

  /**
   * 从远程下载音频文件并保存到本地缓存目录
   * @param cachePath 要保存的目录路径
   * @param fileName 要保存的文件名
   * @param url 远程URL
   * @returns 下载的 ArrayBuffer 数据
   */
  const fetchAndDownloadAudioFile = async (cachePath: string, fileName: string, url: string): Promise<ArrayBuffer> => {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const dirExists = await exists(cachePath, { baseDir: BaseDirectory.AppCache })

    // 若目录不存在，则创建缓存目录
    if (!dirExists) {
      await mkdir(cachePath, { baseDir: BaseDirectory.AppCache, recursive: true })
    }

    // 拼接完整路径并保存文件
    const fullPath = await join(cachePath, fileName)
    const file = await create(fullPath, { baseDir: BaseDirectory.AppCache })
    await file.write(new Uint8Array(arrayBuffer))
    await file.close()

    return arrayBuffer
  }

  /**
   * 检查音频文件是否存在于本地缓存
   * @param url 音频文件URL
   * @returns 存在性检查结果
   */
  const existsAudioFile = async (url: string): Promise<AudioExistsResult> => {
    const [fileMeta] = await getFilesMeta<FilesMeta>([url])
    const audioFolder = 'audio'
    const cachePath = getImageCache(audioFolder, userId)
    const fullPath = await join(cachePath, fileMeta.name)

    const fileExists = await exists(fullPath, { baseDir: BaseDirectory.AppCache })

    return {
      exists: fileExists,
      fullPath: fullPath,
      fileMeta: fileMeta // 这里fileMeta是从解构出来的，类型是正确的
    }
  }

  /**
   * 获取可播放的音频URL
   * @param originalUrl 原始音频URL
   * @returns 可播放的URL（本地或远程）
   */
  const getAudioUrl = async (originalUrl: string): Promise<string> => {
    const existsData = await existsAudioFile(originalUrl)

    if (existsData.exists) {
      const fileData = await getLocalAudioFile(existsData.fileMeta.name)

      // Mac系统优化：设置正确的MIME类型
      const mimeType = existsData.fileMeta.mime_type || 'audio/mpeg'

      // 检查音频格式支持(mac)
      const support = checkAudioSupport(mimeType)
      if (!support && isMacOS) {
        console.warn(`Mac系统可能不支持此音频格式: ${mimeType}`)
        // 降级到远程URL
        return originalUrl
      } else {
        // 确保 fileBuffer 是 ArrayBuffer 类型
        let arrayBuffer: ArrayBuffer
        if (fileData.fileBuffer instanceof ArrayBuffer) {
          arrayBuffer = fileData.fileBuffer
        } else {
          arrayBuffer = new ArrayBuffer((fileData.fileBuffer as any).byteLength)
          new Uint8Array(arrayBuffer).set(new Uint8Array(fileData.fileBuffer as any))
        }
        return URL.createObjectURL(new Blob([new Uint8Array(arrayBuffer)], { type: mimeType }))
      }
    }

    return originalUrl
  }

  /**
   * 下载并缓存音频文件
   * @param url 音频URL
   * @param fileName 文件名
   * @returns ArrayBuffer数据
   */
  const downloadAndCache = async (url: string, fileName: string): Promise<ArrayBuffer> => {
    const audioFolder = 'audio'
    const cachePath = getImageCache(audioFolder, userId)

    return await fetchAndDownloadAudioFile(cachePath, fileName, url)
  }

  /**
   * 加载音频波形数据
   * 优先尝试从本地缓存中读取音频文件，若不存在则从远程 URL 下载，
   * 并保存到本地缓存中以供后续使用。支持错误回退生成默认波形。
   * @param url 音频URL
   * @returns 音频数据buffer
   */
  const loadAudioWaveform = async (url: string): Promise<ArrayBuffer | Uint8Array | SharedArrayBuffer> => {
    try {
      // 从url中提取文件基本信息
      const [fileMeta] = await getFilesMeta<FilesMeta>([url])

      // 尝试获取本地音频文件
      const localAudioFile = await getLocalAudioFile(fileMeta.name)

      // 判断本地音频文件是否存在
      if (localAudioFile.fileExists) {
        // 本地音频存在，则读取它的Buffer格式为Uint8Array<ArrayBufferLike>
        audioBuffer.value = localAudioFile.fileBuffer
        isFileReady.value = true
        return localAudioFile.fileBuffer
      } else {
        // 本地音频不存在，读取在线资源文件，格式为Uint8Array<ArrayBufferLike>
        const arrayBuffer = await fetchAndDownloadAudioFile(localAudioFile.cachePath, fileMeta.name, url)
        audioBuffer.value = arrayBuffer
        isFileReady.value = true
        return arrayBuffer
      }
    } catch (error) {
      console.error('加载音频波形失败:', error)
      isFileReady.value = false
      throw error
    }
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    audioBuffer.value = null
    isFileReady.value = false
  }

  return {
    isFileReady,
    audioBuffer,
    getAudioUrl,
    checkAudioSupport,
    downloadAndCache,
    loadAudioWaveform,
    existsAudioFile,
    cleanup
  }
}
