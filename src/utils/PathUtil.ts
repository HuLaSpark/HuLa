import { join, appCacheDir, resourceDir } from '@tauri-apps/api/path'
import { mkdir, exists, readFile } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { fileTypeFromBuffer, type FileTypeResult } from 'file-type'
import { FilesMeta } from '@/services/types'
import { invoke } from '@tauri-apps/api/core'

const getPathCache = async (subFolder: string, userUid: string): Promise<string> => {
  const cacheDir = await appCacheDir()
  return await join(cacheDir, String(userUid), subFolder)
}

const createUserVideosDir = async (): Promise<void> => {
  const dirExists = await exists('user-videos', { baseDir: BaseDirectory.Resource })
  if (!dirExists) {
    await mkdir('user-videos', {
      baseDir: BaseDirectory.Resource,
      recursive: true
    })
  }
}

const getUserVideosDir = async (userUid: string, roomId: string): Promise<string> => {
  await createUserVideosDir()
  // 确保用户ID和房间ID的子目录也存在
  const userRoomDir = await join('user-videos', userUid, roomId)
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
export async function detectRemoteFileType(url: string, byteLength = 4100): Promise<FileTypeResult | undefined> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Range: `bytes=0-${byteLength - 1}` // 请求前 N 字节
      }
    })

    if (!response.ok) {
      window.$message?.error('找不到文件了😞 ~')
      throw new Error(`尝试请求 ${url} 的头数据获取类型时失败, 状态: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    return await fileTypeFromBuffer(buffer)
  } catch (error) {
    console.error('尝试解析远程文件类型时出现错误：', error)
  }
}

export async function getFile(absolutePath: string) {
  const filesMeta = await invoke<FilesMeta>('get_files_meta', {
    filesPath: [absolutePath]
  })

  const fileMeta = filesMeta[0]

  const fileData = await readFile(absolutePath)
  const fileName = fileMeta.name
  const blob = new Blob([fileData])

  const fileType = fileMeta?.mime_type || fileMeta?.file_type

  return {
    file: new File([blob], fileName, { type: fileType }),
    meta: fileMeta
  }
}

export { getPathCache, createUserVideosDir, getUserVideosDir, getImageCache }
