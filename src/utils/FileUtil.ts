import { join } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { copyFile, stat } from '@tauri-apps/plugin-fs'
import type { FilesMeta } from '@/services/types'
import type { PathUploadFile } from '@/utils/FileType'
import { extractFileName } from '@/utils/Formatting'
import { useUserStore } from '../stores/user'
import { getFilesMeta } from './PathUtil'

class FileUtil {
  private static _userStore: ReturnType<typeof useUserStore> | null = null

  private static get userStore() {
    if (!FileUtil._userStore) {
      FileUtil._userStore = useUserStore()
    }
    return FileUtil._userStore
  }
  /**
   * 打开文件选择器，允许用户选择多个文件，将选中的文件复制到用户资源目录下
   * 副作用: 会将选中的文件复制到用户资源目录下
   * @returns
   * files: 选中的文件列表
   * filesMeta: 选中的文件元数据列表
   */
  static async openAndCopyFile(): Promise<{
    files: PathUploadFile[]
    filesMeta: FilesMeta
  } | null> {
    // 获取文件路径列表
    const selected = await open({
      multiple: true
      // 不设置filters，允许选择所有文件类型
    })

    if (!selected) {
      return null
    }
    const selectedPaths = Array.isArray(selected) ? selected : [selected]
    const filesMeta = await getFilesMeta<FilesMeta>(selectedPaths)
    void FileUtil.copyUploadFile(selectedPaths, filesMeta)

    return {
      files: await FileUtil.map2PathUploadFile(selectedPaths, filesMeta),
      filesMeta: filesMeta
    }
  }

  /**
   * 将选中的文件复制到用户资源目录下
   * 副作用: 会将选中的文件复制到用户资源目录下
   * @param files 选中的文件路径列表
   * @param filesMeta 选中的文件元数据列表
   */
  static async copyUploadFile(files: string[], filesMeta: FilesMeta) {
    const userResourceDir = await FileUtil.userStore.getUserRoomAbsoluteDir()
    for (const filePathStr of files) {
      const fileMeta = filesMeta.find((f) => f.path === filePathStr)
      if (fileMeta) {
        try {
          await copyFile(filePathStr, await join(userResourceDir, fileMeta.name))
        } catch (error) {
          console.error('[FileUtil] 复制文件失败:', error)
        }
      }
    }
  }

  /**
   * 将选中的文件路径列表和文件元数据列表转换为路径文件对象列表
   * @param files 选中的文件路径列表
   * @param filesMeta 选中的文件元数据列表
   * @returns 路径文件对象列表
   */
  static async map2PathUploadFile(files: string[], filesMeta: FilesMeta): Promise<PathUploadFile[]> {
    return await Promise.all(
      files.map(async (path) => {
        const fileMeta = filesMeta.find((f) => f.path === path)
        const fileName = fileMeta?.name || extractFileName(path)
        const fileType = fileMeta?.mime_type || 'application/octet-stream'

        let size = 0
        try {
          size = (await stat(path)).size
        } catch (error) {
          console.error('[FileUtil] 获取文件大小失败:', error)
        }

        return {
          kind: 'path',
          path,
          name: fileName,
          size,
          type: fileType
        }
      })
    )
  }
}

export default FileUtil
