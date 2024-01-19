import { WebviewWindow, LogicalSize } from '@tauri-apps/api/window'
import { autoCloseWindow } from '@/common/WindowEvent.ts'

export const useWindow = () => {
  /**
   * 创建窗口
   * @param label 窗口名称
   * @param wantCloseWindow 创建后需要关闭的窗口
   * @param width 窗口宽度
   * @param height 窗口高度
   * */
  const createWebviewWindow = async (label: string, width: number, height: number, wantCloseWindow?: string) => {
    const webview = new WebviewWindow(label, {
      url: '/',
      fullscreen: false,
      resizable: true,
      center: true,
      width: width,
      height: height,
      skipTaskbar: false,
      decorations: false,
      transparent: true
    })

    await webview.once('tauri://created', () => {
      console.log('创建成功')
      if (wantCloseWindow) {
        autoCloseWindow(wantCloseWindow)
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
