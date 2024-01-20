import { appWindow, WebviewWindow } from '@tauri-apps/api/window'

/** 最小化 */
export const minimizeWindow = async () => {
  await appWindow.minimize()
}

/** 最大化 */
export const maximizeWindow = async () => {
  await appWindow.maximize()
}

/** 关闭 */
export const closeWindow = async () => {
  await appWindow.close()
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
