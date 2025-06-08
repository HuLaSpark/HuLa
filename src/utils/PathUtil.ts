import { join, appCacheDir } from '@tauri-apps/api/path'
import { mkdir, exists } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'

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
  return await join('user-videos', userUid, roomId)
}

const getImageCache = (subFolder: string, userUid: string): string => {
  return 'cache/' + String(userUid) + '/' + subFolder + '/'
}

export { getPathCache, createUserVideosDir, getUserVideosDir, getImageCache }
