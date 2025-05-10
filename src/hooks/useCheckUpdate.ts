import { getVersion } from '@tauri-apps/api/app'
import { check } from '@tauri-apps/plugin-updater'
import { MittEnum } from '../enums'
import { useMitt } from './useMitt'
import { useSettingStore } from '@/stores/setting.ts'

/**
 * 检查更新
 */
export const useCheckUpdate = () => {
  const settingStore = useSettingStore()
  // 检查更新周期
  const CHECK_UPDATE_TIME = 1 * 60 * 1000

  /**
   * 检查更新
   * @param closeWin 需要关闭的窗口
   */
  const checkUpdate = async (closeWin: string) => {
    await check()
      .then(async (e) => {
        if (!e?.available) {
          return
        }

        const newVersion = e.version
        const newMajorVersion = newVersion.substring(0, newVersion.indexOf('.'))
        const newMiddleVersion = newVersion.substring(
          newVersion.indexOf('.') + 1,
          newVersion.lastIndexOf('.') === -1 ? newVersion.length : newVersion.lastIndexOf('.')
        )
        const currenVersion = await getVersion()
        const currentMajorVersion = currenVersion.substring(0, currenVersion.indexOf('.'))
        const currentMiddleVersion = currenVersion.substring(
          currenVersion.indexOf('.') + 1,
          currenVersion.lastIndexOf('.') === -1 ? currenVersion.length : currenVersion.lastIndexOf('.')
        )
        if (
          newMajorVersion > currentMajorVersion ||
          (newMajorVersion === currentMajorVersion && newMiddleVersion > currentMiddleVersion)
        ) {
          useMitt.emit(MittEnum.DO_UPDATE, { close: closeWin })
        } else if (newVersion !== currenVersion && settingStore.update.dismiss !== newVersion) {
          useMitt.emit(MittEnum.CHECK_UPDATE)
        }
      })
      .catch((e) => {
        console.log(e)
      })
  }

  return {
    checkUpdate,
    CHECK_UPDATE_TIME
  }
}
