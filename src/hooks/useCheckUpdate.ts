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
  const CHECK_UPDATE_TIME = 30 * 60 * 1000
  // 在未登录情况下缩短检查周期
  const CHECK_UPDATE_LOGIN_TIME = 5 * 60 * 1000

  /**
   * 检查更新
   * @param closeWin 需要关闭的窗口
   * @param initialCheck 是否是初始检查，默认为false。初始检查时只显示强制更新提示，不显示普通更新提示
   */
  const checkUpdate = async (closeWin: string, initialCheck: boolean = false) => {
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
        } else if (newVersion !== currenVersion && settingStore.update.dismiss !== newVersion && !initialCheck) {
          // 只在非初始检查时显示普通更新提示
          useMitt.emit(MittEnum.CHECK_UPDATE)
        }
      })
      .catch((e) => {
        console.log(e)
      })
  }

  return {
    checkUpdate,
    CHECK_UPDATE_TIME,
    CHECK_UPDATE_LOGIN_TIME
  }
}
