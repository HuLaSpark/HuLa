import { join } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { copyFile, readFile } from '@tauri-apps/plugin-fs'
import type { FilesMeta } from '@/services/types'
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
    files: File[]
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
    const filesMeta = await getFilesMeta<FilesMeta>(selected)
    await FileUtil.copyUploadFile(selected, filesMeta)

    return {
      files: await FileUtil.map2File(selected, filesMeta),
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
        copyFile(filePathStr, await join(userResourceDir, fileMeta.name))
      }
    }
  }

  /**
   * 将选中的文件路径列表和文件元数据列表转换为 File 对象列表
   * @param files 选中的文件路径列表
   * @param filesMeta 选中的文件元数据列表
   * @returns File 对象列表
   */
  static async map2File(files: string[], filesMeta: FilesMeta): Promise<File[]> {
    return await Promise.all(
      files.map(async (path) => {
        const fileData = await readFile(path)
        const fileName = extractFileName(path)
        const blob = new Blob([new Uint8Array(fileData)])

        // 找到对应路径的文件，并且获取其类型
        const fileMeta = filesMeta.find((f) => f.path === path)
        const fileType = fileMeta?.mime_type || fileMeta?.file_type

        // 最后手动传入blob中，因为blob无法自动判断文件类型
        return new File([blob], fileName, { type: fileType })
      })
    )
  }
}

export default FileUtil
