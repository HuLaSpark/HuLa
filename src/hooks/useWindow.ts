import { WebviewWindow, LogicalSize } from '@tauri-apps/api/window'
import { autoCloseWindow } from '@/common/WindowEvent.ts'
import { invoke } from '@tauri-apps/api/tauri'

export const useWindow = () => {
  /**
   * 创建窗口
   * @param label 窗口名称
   * @param wantCloseWindow 创建后需要关闭的窗口
   * @param width 窗口宽度
   * @param height 窗口高度
   * @param resizable 调整窗口大小
   * @param minW 窗口最小宽度
   * @param minH 窗口最小高度
   * */
  const createWebviewWindow = async (
    label: string,
    width: number,
    height: number,
    wantCloseWindow?: string,
    resizable = true,
    minW = 310,
    minH = 540
  ) => {
    const webview = new WebviewWindow(label, {
      url: `/${label}`,
      fullscreen: false,
      resizable: resizable,
      center: true,
      width: width,
      height: height,
      minHeight: minH,
      minWidth: minW,
      skipTaskbar: false,
      decorations: false,
      transparent: true
    })

    await webview.once('tauri://created', async () => {
      console.log('创建成功')
      await invoke('reset_set_window', { label }).catch((error) => {
        console.error('设置窗口阴影失败:', error)
      })
      if (wantCloseWindow) {
        await autoCloseWindow(wantCloseWindow)
      }
    })

    await webview.once('tauri://error', (e) => {
      console.error(e)
    })

    return webview
  }

  /**
   * 调整窗口大小
   * @param label 窗口名称
   * @param width 窗口宽度
   * @param height 窗口高度
   * */
  const resizeWindow = async (label: string, width: number, height: number) => {
    const webview = WebviewWindow.getByLabel(label)
    // 创建一个新的尺寸对象
    const newSize = new LogicalSize(width, height)
    // 调用窗口的 setSize 方法进行尺寸调整
    await webview?.setSize(newSize).catch((error) => {
      console.error('无法调整窗口大小:', error)
    })
  }

  return {
    createWebviewWindow,
    resizeWindow
  }
}
