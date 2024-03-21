import { appWindow, WebviewWindow } from '@tauri-apps/api/window'
import { CloseBxEnum, EventEnum } from '@/enums'
import { emit, listen } from '@tauri-apps/api/event'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'

/** 最小化 */
export const minimizeWindow = async () => {
  await appWindow.minimize()
}

/** 最大化 */
export const maximizeWindow = async () => {
  await appWindow.maximize()
}

/**
 * 关闭窗口
 * @param label 窗口标签
 * @example
 * 传入窗口标签后开启窗口关闭的监听事件，使用appWindow.emit事件
 * @see EventEnum.WIN_CLOSE
 */
export const closeWindow = async (label: string) => {
  if (label !== void 0 && label !== 'home') {
    await emit(EventEnum.WIN_CLOSE, label)
  }
  if (label === 'home') {
    const settingStore = setting()
    const { tray } = storeToRefs(settingStore)
    await listen(EventEnum.CLOSE_HOME, (e) => {
      tray.value.type = (e.payload as STO.Setting['tray']).type
      tray.value.notTips = (e.payload as STO.Setting['tray']).notTips
    })
    if (!tray.value.notTips) {
      tray.value.tips = true
    } else {
      if (tray.value.type === CloseBxEnum.CLOSE) {
        await emit(EventEnum.EXIT)
      } else {
        await nextTick(() => {
          appWindow.hide()
        })
      }
    }
  } else {
    await appWindow.close()
  }
}

/** 取消最大化 */
export const unmaximize = async () => {
  await appWindow.unmaximize()
}

/** 隐藏 */
export const hideWindow = async () => {
  await appWindow.hide()
}

/**
 * 根据label隐藏窗口
 * @param label 窗口标签
 * */
export const hideByLabel = async (label: string) => {
  const win = WebviewWindow.getByLabel(label)
  await win?.hide()
}

/**
 * 自动关闭窗口
 * @param label 窗口标签
 * */
export const autoCloseWindow = async (label: string) => {
  const win = WebviewWindow.getByLabel(label)
  await win?.close()
}
