import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { EventEnum } from '@/enums'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { type } from '@tauri-apps/plugin-os'
import { UserAttentionType } from '@tauri-apps/api/window'

/** 判断是兼容的系统 */
const isCompatibility = computed(() => type() === 'windows' || type() === 'linux')
export const useWindow = () => {
  /**
   * 创建窗口
   * @param title 窗口标题
   * @param label 窗口名称
   * @param wantCloseWindow 创建后需要关闭的窗口
   * @param width 窗口宽度
   * @param height 窗口高度
   * @param resizable 调整窗口大小
   * @param minW 窗口最小宽度
   * @param minH 窗口最小高度
   * @param transparent 是否透明
   * @param visible 是否显示
   * */
  const createWebviewWindow = async (
    title: string,
    label: string,
    width: number,
    height: number,
    wantCloseWindow?: string,
    resizable = false,
    minW = 330,
    minH = 495,
    transparent?: boolean,
    visible = false
  ) => {
    const checkLabel = computed(() => {
      /** 如果是打开独立窗口就截取label中的固定label名称 */
      if (label.includes(EventEnum.ALONE)) {
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
      decorations: !isCompatibility.value,
      transparent: transparent || isCompatibility.value,
      titleBarStyle: 'overlay', // mac覆盖标签栏
      hiddenTitle: true, // mac隐藏标题栏
      visible: visible
    })

    await webview.once('tauri://created', async () => {
      if (wantCloseWindow) {
        const win = await WebviewWindow.getByLabel(wantCloseWindow)
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
   * 创建模态子窗口
   * @param title 窗口标题
   * @param label 窗口标识
   * @param width 窗口宽度
   * @param height 窗口高度
   * @param parent 父窗口
   * @returns 创建的窗口实例或已存在的窗口实例
   */
  const createModalWindow = async (title: string, label: string, width: number, height: number, parent: string) => {
    // 检查窗口是否已存在
    const existingWindow = await WebviewWindow.getByLabel(label)
    const parentWindow = parent ? await WebviewWindow.getByLabel(parent) : null

    if (existingWindow) {
      // 如果窗口已存在，则聚焦到现有窗口并使其闪烁
      existingWindow.requestUserAttention(UserAttentionType.Critical)
      return existingWindow
    }

    // 创建新窗口
    const modalWindow = new WebviewWindow(label, {
      url: `/${label}`,
      title: title,
      width: width,
      height: height,
      resizable: false,
      center: true,
      minWidth: 500,
      minHeight: 500,
      focus: true,
      parent: parentWindow ? parentWindow : parent,
      decorations: !isCompatibility.value,
      transparent: isCompatibility.value,
      titleBarStyle: 'overlay', // mac覆盖标签栏
      hiddenTitle: true, // mac隐藏标题栏
      visible: false
    })

    // 监听窗口创建完成事件
    modalWindow.once('tauri://created', async () => {
      if (type() === 'windows') {
        // 禁用父窗口，模拟模态窗口效果
        await parentWindow?.setEnabled(false)
      }

      // 设置窗口为焦点
      await modalWindow.setFocus()
    })

    // 监听错误事件
    modalWindow.once('tauri://error', async (e) => {
      console.error(`${title}窗口创建失败:`, e)
      window.$message?.error(`创建${title}窗口失败`)
      await parentWindow?.setEnabled(true)
    })

    return modalWindow
  }

  /**
   * 调整窗口大小
   * @param label 窗口名称
   * @param width 窗口宽度
   * @param height 窗口高度
   * */
  const resizeWindow = async (label: string, width: number, height: number) => {
    const webview = await WebviewWindow.getByLabel(label)
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
    const isExistsWinds = await WebviewWindow.getByLabel(L)
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
    createModalWindow,
    resizeWindow,
    checkWinExist
  }
}
