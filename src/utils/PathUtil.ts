import { join, appCacheDir, resourceDir } from '@tauri-apps/api/path'
import { mkdir, exists, readFile } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { fileTypeFromBuffer, type FileTypeResult } from 'file-type'
import { FilesMeta } from '@/services/types'
import { invoke } from '@tauri-apps/api/core'

// 用户数据
const USER_DATA = 'userData'

const getPathCache = async (subFolder: string, userUid: string): Promise<string> => {
  const cacheDir = await appCacheDir()
  return await join(cacheDir, String(userUid), subFolder)
}

const createUserVideosDir = async (): Promise<void> => {
  const dirExists = await exists(USER_DATA, { baseDir: BaseDirectory.Resource })
  if (!dirExists) {
    await mkdir(USER_DATA, {
      baseDir: BaseDirectory.Resource,
      recursive: true
    })
  }
}

const getUserVideosDir = async (userUid: string, roomId: string): Promise<string> => {
  await createUserVideosDir()
  // 确保用户ID和房间ID的子目录也存在
  const userRoomDir = await join(USER_DATA, userUid, roomId)
  const userRoomDirExists = await exists(userRoomDir, { baseDir: BaseDirectory.Resource })
  if (!userRoomDirExists) {
    await mkdir(userRoomDir, {
      baseDir: BaseDirectory.Resource,
      recursive: true
    })
  }
  return userRoomDir
}

export const getUserAbsoluteVideosDir = async (userUid: string, roomId: string) => {
  const userResourceDirectory = await getUserVideosDir(userUid, roomId)
  const filePath = await join(userResourceDirectory)

  const resourceDirPath = await resourceDir()
  const absoluteDir = await join(resourceDirPath, filePath)
  return absoluteDir
}

const getImageCache = (subFolder: string, userUid: string): string => {
  return 'cache/' + String(userUid) + '/' + subFolder + '/'
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
  try {
    const { url, byteLength = 4100, fileSize } = options

    // 1. 先发送 HEAD 请求，检查文件是否存在及大小
    const headResponse = await fetch(url, { method: 'HEAD' })

    if (!headResponse.ok) {
      window.$message?.error('找不到文件了😞 ~')
      throw new Error(`文件不存在, 状态: ${headResponse.status}`)
    }

    console.log('已找到响应头', headResponse)

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
      } catch (error) {
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
}

export async function getFile(absolutePath: string) {
  const [fileMeta] = await getFilesMeta<FilesMeta>([absolutePath])

  const fileData = await readFile(absolutePath)
  const fileName = fileMeta.name
  const blob = new Blob([fileData])

  const fileType = fileMeta?.mime_type || fileMeta?.file_type

  return {
    file: new File([blob], fileName, { type: fileType }),
    meta: fileMeta
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

export { getPathCache, createUserVideosDir, getUserVideosDir, getImageCache }
