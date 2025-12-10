import { invoke } from '@tauri-apps/api/core'
import { appCacheDir, appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { BaseDirectory, exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs'
import { type FileTypeResult, fileTypeFromBuffer } from 'file-type'
import type { FilesMeta } from '@/services/types'
import { isMobile } from './PlatformConstants'

// Tauri 资源目录下存放用户数据的根目录名
const USER_DATA = 'userData'
// 统一存放三维模型的子目录名
const MODELS_DIR = 'models'
// 用户专属表情包目录名
const EMOJIS_DIR = 'emojis'
// AI 生成资源目录名
const AI_DIR = 'ai'

// 远程文件类型探测结果与进行中的 Promise 缓存，避免重复请求同一资源
const remoteFileTypeResultCache = new Map<string, FileTypeResult | undefined>()
const remoteFileTypePromiseCache = new Map<string, Promise<FileTypeResult | undefined>>()

/**
 * 确保资源目录下存在 userData 根目录。
 * Tauri 在构建后默认不会创建该目录，需要在第一次使用前主动创建。
 */
const ensureUserDataRoot = async (): Promise<void> => {
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const dirExists = await exists(USER_DATA, { baseDir })
  if (!dirExists) {
    await mkdir(USER_DATA, {
      baseDir,
      recursive: true
    })
  }
}

/**
 * 获取缓存目录，路径结构为：appCacheDir/userUid/subFolder
 * @param subFolder 子目录名
 * @param userUid 当前用户ID
 */
const getPathCache = async (subFolder: string, userUid: string): Promise<string> => {
  const cacheDir = await appCacheDir()
  return await join(cacheDir, String(userUid), subFolder)
}

/**
 * 获取用户视频文件夹（userData/userUid/roomId），并确保整个路径存在。
 * @param userUid 用户ID
 * @param roomId 房间ID
 */
const getUserVideosDir = async (userUid: string, roomId: string): Promise<string> => {
  await ensureUserDataRoot()
  // 确保用户ID和房间ID的子目录也存在
  const userRoomDir = await join(USER_DATA, userUid, roomId)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const userRoomDirExists = await exists(userRoomDir, { baseDir })
  if (!userRoomDirExists) {
    await mkdir(userRoomDir, {
      baseDir,
      recursive: true
    })
  }
  return userRoomDir
}

export const getUserAbsoluteVideosDir = async (userUid: string, roomId: string) => {
  const userResourceDirectory = await getUserVideosDir(userUid, roomId)
  const filePath = await join(userResourceDirectory)

  const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
  const absoluteDir = await join(baseDirPath, filePath)
  return absoluteDir
}

/**
 * 确保用户表情包目录 userData/{uid}/emojis 存在，并返回相对路径
 * @param userUid 用户ID
 */
const getUserEmojiDir = async (userUid: string): Promise<string> => {
  await ensureUserDataRoot()
  const emojiDir = await join(USER_DATA, userUid, EMOJIS_DIR)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const hasEmojiDir = await exists(emojiDir, { baseDir })
  if (!hasEmojiDir) {
    await mkdir(emojiDir, {
      baseDir,
      recursive: true
    })
  }
  return emojiDir
}

/**
 * 获取用户表情包目录的绝对路径
 * @param userUid 用户ID
 */
export const getUserAbsoluteEmojiDir = async (userUid: string): Promise<string> => {
  const emojiDir = await getUserEmojiDir(userUid)
  const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
  return await join(baseDirPath, emojiDir)
}

const getImageCache = (subFolder: string, userUid: string): string => {
  return 'cache/' + String(userUid) + '/' + subFolder + '/'
}

// 确保 userData/ai 根目录存在，移动端使用 AppData，桌面使用 Resource
const ensureAiDir = async (): Promise<string> => {
  await ensureUserDataRoot()
  const aiRoot = await join(USER_DATA, AI_DIR)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const hasAiDir = await exists(aiRoot, { baseDir })
  if (!hasAiDir) {
    await mkdir(aiRoot, {
      baseDir,
      recursive: true
    })
  }
  return aiRoot
}

// 确保 AI 图片目录 userData/ai/{uid}/{conversationId} 存在，并返回相对路径
const ensureAiConversationDir = async (userUid: string, conversationId: string): Promise<string> => {
  const aiRoot = await ensureAiDir()
  const aiConversationDir = await join(aiRoot, userUid, conversationId)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const hasConversationDir = await exists(aiConversationDir, { baseDir })
  if (!hasConversationDir) {
    await mkdir(aiConversationDir, {
      baseDir,
      recursive: true
    })
  }
  return aiConversationDir
}

// 生成 AI 图片的相对/绝对路径以及对应的 BaseDirectory 配置
const buildAiImagePaths = async (options: {
  userUid: string
  conversationId: string
  fileName: string
}): Promise<{
  relativePath: string
  absolutePath: string
  baseDir: BaseDirectory
}> => {
  const { userUid, conversationId, fileName } = options
  const aiDir = await ensureAiConversationDir(userUid, conversationId)
  const relativePath = await join(aiDir, fileName)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
  const absolutePath = await join(baseDirPath, relativePath)
  return { relativePath, absolutePath, baseDir }
}

// 检查 AI 图片是否已存在，返回存在状态和路径
export const resolveAiImagePath = async (options: {
  userUid: string
  conversationId: string
  fileName: string
}): Promise<{ exists: boolean; relativePath: string; absolutePath: string }> => {
  const { relativePath, absolutePath, baseDir } = await buildAiImagePaths(options)
  const existsFlag = await exists(relativePath, { baseDir })
  return { exists: existsFlag, relativePath, absolutePath }
}

// 将 AI 图片二进制内容写入 userData/ai/{uid}/{conversationId} 并返回路径
export const persistAiImageFile = async (options: {
  userUid: string
  conversationId: string
  fileName: string
  data: Uint8Array
}): Promise<{ relativePath: string; absolutePath: string }> => {
  const { relativePath, absolutePath, baseDir } = await buildAiImagePaths(options)
  await writeFile(relativePath, options.data, { baseDir })
  return { relativePath, absolutePath }
}

/**
 * 确保模型存储目录 userData/models 存在，并返回该目录的相对路径。
 */
const ensureModelsDir = async (): Promise<string> => {
  await ensureUserDataRoot()
  const modelsPath = await join(USER_DATA, MODELS_DIR)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const hasModelsDir = await exists(modelsPath, { baseDir })
  if (!hasModelsDir) {
    await mkdir(modelsPath, {
      baseDir,
      recursive: true
    })
  }
  return modelsPath
}

/**
 * 确保指定模型文件已经缓存在本地。
 * 若不存在则从远程链接下载并写入 userData/models 目录。
 * 最终返回模型文件在资源目录下的绝对路径。
 * @param fileName 模型文件名，如 hula.glb
 * @param remoteUrl 模型远程下载地址
 */
export const ensureModelFile = async (fileName: string, remoteUrl: string): Promise<string> => {
  const modelsDir = await ensureModelsDir()
  const modelRelativePath = await join(modelsDir, fileName)
  const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
  const modelExists = await exists(modelRelativePath, { baseDir })

  if (!modelExists) {
    const response = await fetch(remoteUrl)
    if (!response.ok) {
      throw new Error(`下载模型失败: ${response.status} ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    await writeFile(modelRelativePath, new Uint8Array(buffer), {
      baseDir
    })
  }

  const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
  return await join(baseDirPath, modelRelativePath)
}

/**
 * 解析远程文件的真实类型
 * @param url 文件的远程地址
 * @param byteLength 请求的字节数，默认 4100
 * @returns { ext: string, mime: string } 或 undefined（无法识别）
 */
export async function detectRemoteFileType(options: {
  url: string
  fileSize: number
  byteLength?: number
}): Promise<FileTypeResult | undefined> {
  const { url } = options
  if (!/^https?:\/\//i.test(url)) {
    return void 0
  }
  const cacheKey = options.url
  if (remoteFileTypeResultCache.has(cacheKey)) {
    return remoteFileTypeResultCache.get(cacheKey)
  }
  if (remoteFileTypePromiseCache.has(cacheKey)) {
    return await remoteFileTypePromiseCache.get(cacheKey)!
  }

  const task = (async () => {
    try {
      const { url, byteLength = 4100, fileSize } = options

      // 1. 先发送 HEAD 请求，检查文件是否存在及大小
      const headResponse = await fetch(url, { method: 'HEAD' })

      if (!headResponse.ok) {
        window.$message?.error('找不到文件')
        throw new Error(`文件不存在, 状态: ${headResponse.status}`)
      }

      // 2. 如果是空文件，直接返回 undefined
      if (fileSize === 0) {
        console.log('文件大小为 0 字节，尝试使用后缀名检测')
        try {
          const result = await invoke<FilesMeta>('get_files_meta', { filesPath: [url] })
          const meta = result[0]

          return {
            ext: meta.file_type,
            mime: meta.mime_type
          }
        } catch (_error) {
          console.warn(`该资源无法识别类型：${url}`)
          return void 0
        }
      }

      // 3. 如果文件大小 < byteLength，直接 GET 整个文件，避免 Range 错误
      const shouldUseRange = fileSize === null || fileSize >= byteLength
      const rangeEnd = shouldUseRange ? byteLength - 1 : void 0

      const response = await fetch(url, shouldUseRange ? { headers: { Range: `bytes=0-${rangeEnd}` } } : void 0)

      if (!response.ok) {
        throw new Error(`获取文件数据失败, 状态: ${response.status}`)
      }

      const buffer = await response.arrayBuffer()

      // 4. 如果 buffer 有数据，尝试解析文件类型
      return buffer.byteLength > 0 ? await fileTypeFromBuffer(buffer) : void 0
    } catch (error) {
      console.error('尝试解析远程文件类型时出现错误：', error)
      return void 0
    }
  })()

  remoteFileTypePromiseCache.set(cacheKey, task)
  try {
    const result = await task
    remoteFileTypeResultCache.set(cacheKey, result)
    return result
  } finally {
    remoteFileTypePromiseCache.delete(cacheKey)
  }
}

export async function getFile(absolutePath: string) {
  const [fileMeta] = await getFilesMeta<FilesMeta>([absolutePath])

  const fileData = await readFile(absolutePath)
  const fileName = fileMeta.name
  const blob = new Blob([new Uint8Array(fileData)])

  const fileType = fileMeta?.mime_type || fileMeta?.file_type

  return {
    file: new File([blob], fileName, { type: fileType }),
    meta: fileMeta
  }
}

export async function getRemoteFileSize(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (!response.ok) {
      return null
    }
    const length = response.headers.get('content-length')
    return length ? Number(length) : null
  } catch (error) {
    console.warn('获取远程文件大小失败:', error)
    return null
  }
}

/**
 * 调用后端命令获取指定路径或远程 URL 文件的元数据信息。
 *
 * @template T - 返回的元数据类型，一般为 FilesMeta 类型或其扩展。
 * @param filesPath - 文件路径数组，支持传入本地绝对路径或远程文件 URL，批量查询。
 * @returns 返回一个 Promise，解析后为指定泛型 T 类型的数据。
 *
 * @example
 * interface FilesMeta {
 *   exists: boolean
 *   file_type: string // ext格式的文件类型
 *   mime_type: string // mime格式的文件类型
 * }
 *
 * // 查询本地绝对路径文件元信息
 * const meta = await getFilesMeta<FilesMeta>(['C:\\Users\\User\\Documents\\file.docx'])
 * if (meta[0].exists) {
 *   console.log('文件存在，类型为', meta[0].file_type)
 * }
 *
 * // 查询远程 URL 文件元信息
 * const metas = await getFilesMeta<FilesMeta>(['https://example.com/file.pdf'])
 * metas.forEach(m => console.log(m.file_type))
 */
export async function getFilesMeta<T>(filesPath: string[]) {
  return invoke<T>('get_files_meta', {
    filesPath
  })
}

export { getPathCache, getUserVideosDir, getUserEmojiDir, getImageCache }
