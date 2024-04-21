import { LogicalSize, WebviewWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/tauri'

export const useWindow = () => {
  /**
   * 创建窗口
   * @param title 窗口标题
   * @param label 窗口名称
   * @param wantCloseWindow 创建后需要关闭的窗口
   * @param width 窗口宽度
   * @param height 窗口高度
   * @param isDrag 是否禁止拖动元素
   * @param resizable 调整窗口大小
   * @param minW 窗口最小宽度
   * @param minH 窗口最小高度
   * */
  const createWebviewWindow = async (
    title: string,
    label: string,
    width: number,
    height: number,
    wantCloseWindow?: string,
    isDrag = true,
    resizable = false,
    minW = 310,
    minH = 540
  ) => {
    const checkLabel = computed(() => {
      /** 如果是打开独立窗口就截取label中的固定label名称 */
      if (label.includes('alone')) {
        return label.replace(/\d/g, '')
      } else {
        return label
      }
    })
    const webview = new WebviewWindow(label, {
      title: title,
      url: `/${checkLabel.value}`,
      fullscreen: false,
      resizable: resizable,
      center: true,
      width: width,
      height: height,
      minHeight: minH,
      minWidth: minW,
      skipTaskbar: false,
      decorations: false,
      transparent: true,
      fileDropEnabled: isDrag
    })

    await webview.once('tauri://created', async () => {
      await invoke('reset_set_window', { label }).catch((error) => {
        console.error('设置窗口阴影失败:', error)
      })
      if (wantCloseWindow) {
        const win = WebviewWindow.getByLabel(wantCloseWindow)
        win?.close()
      }
    })

    await webview.once('tauri://error', async () => {
      // TODO 这里利用错误处理的方式来查询是否是已经创建了窗口,如果一开始就使用WebviewWindow.getByLabel来查询在刷新的时候就会出现问题 (nyh -> 2024-03-06 23:54:17)
      await checkWinExist(label)
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
    // TODO 使用webview?.setSize重新设置窗口尺寸的时候高度会自动增加20px(bug?) (nyh -> 2024-02-22 03:52:54)
    // 创建一个新的尺寸对象
    const newSize = new LogicalSize(width, height)
    // 调用窗口的 setSize 方法进行尺寸调整
    await webview?.setSize(newSize).catch((error) => {
      console.error('无法调整窗口大小:', error)
    })
  }

  /**
   * 检查窗口是否存在
   * @param L 窗口标签
   */
  const checkWinExist = async (L: string) => {
    const isExistsWinds = WebviewWindow.getByLabel(L)
    if (isExistsWinds) {
      nextTick().then(async () => {
        // 如果窗口已存在，首先检查是否最小化了
        const minimized = await isExistsWinds.isMinimized()
        // 检查是否是隐藏
        const hidden = await isExistsWinds.isVisible()
        if (!hidden) {
          await isExistsWinds.show()
        }
        if (minimized) {
          // 如果已最小化，恢复窗口
          await isExistsWinds.unminimize()
        }
        // 如果窗口已存在，则给它焦点，使其在最前面显示
        await isExistsWinds.setFocus()
      })
    }
  }

  return {
    createWebviewWindow,
    resizeWindow,
    checkWinExist
  }
}
