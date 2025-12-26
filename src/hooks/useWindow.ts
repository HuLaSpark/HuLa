import { invoke } from '@tauri-apps/api/core'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { UserAttentionType, primaryMonitor, type Monitor } from '@tauri-apps/api/window'
import { info } from '@tauri-apps/plugin-log'
import { assign } from 'es-toolkit/compat'
import { CallTypeEnum, EventEnum, RoomTypeEnum } from '@/enums'
import { useGlobalStore } from '@/stores/global'
import { isCompatibility, isDesktop, isMac, isWindows, isWindows10 } from '@/utils/PlatformConstants'

/** 判断是兼容的系统 */
const isCompatibilityMode = computed(() => isCompatibility())
const WINDOW_SAFE_PADDING = 32
const MIN_LOGICAL_WIDTH = 320
const MIN_LOGICAL_HEIGHT = 200
const MAC_TRAFFIC_LIGHTS_SPACING = 6

const clampSizeToMonitor = (width: number, height: number, monitor?: Monitor | null) => {
  if (!monitor) {
    return { width, height }
  }

  const scaleFactor = monitor.scaleFactor ?? 1
  const maxLogicalWidth = Math.max(MIN_LOGICAL_WIDTH, monitor.size.width / scaleFactor - WINDOW_SAFE_PADDING)
  const maxLogicalHeight = Math.max(MIN_LOGICAL_HEIGHT, monitor.size.height / scaleFactor - WINDOW_SAFE_PADDING)

  return {
    width: Math.min(width, Math.floor(maxLogicalWidth)),
    height: Math.min(height, Math.floor(maxLogicalHeight))
  }
}

// Mac 端用于模拟父窗口禁用态的透明蒙层
const MAC_MODAL_OVERLAY_ID = 'mac-modal-overlay'
// 记录当前已经打开模态窗口的 label，方便在最后一个关闭时移除蒙层
const activeMacModalLabels = new Set<string>()

// 创建或复用蒙层 DOM
const ensureMacOverlayElement = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById(MAC_MODAL_OVERLAY_ID)) return
  const overlay = document.createElement('div')
  overlay.id = MAC_MODAL_OVERLAY_ID
  assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    backgroundColor: 'transparent',
    pointerEvents: 'auto',
    width: '100vw',
    height: '100vh',
    userSelect: 'none',
    cursor: 'not-allowed'
  })
  const mountPoint = document.body ?? document.documentElement
  mountPoint?.appendChild(overlay)
}

// 移除蒙层
const removeMacOverlayElement = () => {
  if (typeof document === 'undefined') return
  document.getElementById(MAC_MODAL_OVERLAY_ID)?.remove()
}

// 记录当前窗口并展示蒙层
const attachMacModalOverlay = (label: string) => {
  if (!isMac()) return
  activeMacModalLabels.add(label)
  ensureMacOverlayElement()
}

// 解除当前窗口的蒙层记录，如果没有其他窗口则移除蒙层
const detachMacModalOverlay = (label: string) => {
  if (!isMac()) return
  activeMacModalLabels.delete(label)
  if (activeMacModalLabels.size === 0) {
    removeMacOverlayElement()
  }
}

export const useWindow = () => {
  const globalStore = useGlobalStore()
  /**
   * 创建窗口
   * @param title 窗口标题
   * @param label 窗口名称
   * @param width 窗口宽度
   * @param height 窗口高度
   * @param wantCloseWindow 创建后需要关闭的窗口
   * @param resizable 调整窗口大小
   * @param minW 窗口最小宽度
   * @param minH 窗口最小高度
   * @param transparent 是否透明
   * @param visible 是否显示
   * @param queryParams URL查询参数
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
    visible = false,
    queryParams?: Record<string, string | number | boolean>
  ) => {
    // 移动端不支持窗口管理，直接返回空对象
    if (!isDesktop()) {
      return null
    }
    const originalLabel = label
    const isMultiMsgWindow = originalLabel.includes(EventEnum.MULTI_MSG)

    const checkLabel = () => {
      /** 如果是打开独立窗口就截取label中的固定label名称 */
      if (label.includes(EventEnum.ALONE)) {
        return label.replace(/\d/g, '')
      } else {
        return label
      }
    }

    // 对于multiMsg类型的窗口，保留原始label用于窗口标识，但URL路由统一指向 /multiMsg
    label = isMultiMsgWindow ? originalLabel : checkLabel()

    // 构建URL，包含查询参数
    let url = isMultiMsgWindow ? `/${EventEnum.MULTI_MSG}` : `/${label.split('--')[0]}`

    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        searchParams.append(key, String(value))
      })
      url += `?${searchParams.toString()}`
    }

    const monitor = await primaryMonitor()
    const clampedSize = clampSizeToMonitor(width, height, monitor)
    const clampedMinWidth = Math.min(minW, clampedSize.width)
    const clampedMinHeight = Math.min(minH, clampedSize.height)

    const webview = new WebviewWindow(label, {
      title: title,
      url: url,
      fullscreen: false,
      resizable: resizable,
      center: true,
      width: clampedSize.width,
      height: clampedSize.height,
      minHeight: clampedMinHeight,
      minWidth: clampedMinWidth,
      skipTaskbar: false,
      decorations: !isCompatibilityMode.value,
      transparent: transparent || isCompatibilityMode.value,
      titleBarStyle: 'overlay', // mac覆盖标签栏
      hiddenTitle: true, // mac隐藏标题栏
      visible: visible,
      dragDropEnabled: true, // 启用文件拖放
      ...(isWindows10() ? { shadow: false } : {})
    })

    await webview.once('tauri://created', async () => {
      if (isMac()) {
        try {
          await invoke('set_macos_traffic_lights_spacing', {
            windowLabel: label,
            spacing: MAC_TRAFFIC_LIGHTS_SPACING
          })
        } catch {}
      }
      if (wantCloseWindow) {
        const win = await WebviewWindow.getByLabel(wantCloseWindow)
        win?.close()
      }
    })

    await webview.once('tauri://error', async () => {
      info('窗口创建失败')
      // TODO 这里利用错误处理的方式来查询是否是已经创建了窗口,如果一开始就使用WebviewWindow.getByLabel来查询在刷新的时候就会出现问题 (nyh -> 2024-03-06 23:54:17)
      await checkWinExist(label)
    })

    return webview
  }

  /**
   * 向指定标签的窗口发送载荷（payload），可用于窗口之间通信。
   *
   * @param windowLabel - 要发送载荷的窗口标签，通常是在创建窗口时指定的 label。
   * @param payload - 要发送的 JSON 数据对象，不限制字段内容。
   * @returns 返回一个 Promise，表示调用 Rust 后端命令的完成情况。
   */
  const sendWindowPayload = async (windowLabel: string, payload: any) => {
    // 移动端不支持窗口管理
    if (!isDesktop()) {
      return Promise.resolve()
    }
    console.log('新窗口的载荷：', payload)
    return invoke<void>('push_window_payload', {
      label: windowLabel,
      // 这个payload只要是json就能传，不限制字段
      payload
    })
  }

  /**
   * 获取指定窗口的当前载荷（payload），用于初始化窗口时获取传递的数据。
   *
   * @param windowLabel - 要获取载荷的窗口标签。
   * @returns 返回一个 Promise，解析后为泛型 T，表示窗口中保存的 payload 数据。
   * 可以通过泛型指定返回的结构类型。
   *
   * @example
   * interface MyPayload {
   *   userId: string;
   *   token: string;
   * }
   *
   * const payload = await getWindowPayload<MyPayload>('my-window')
   */
  const getWindowPayload = async <T>(windowLabel: string, once: boolean = true) => {
    // 移动端不支持窗口管理
    if (!isDesktop()) {
      return Promise.resolve({} as T)
    }
    return await invoke<T>('get_window_payload', { label: windowLabel, once })
  }

  /**
   * 注册指定窗口的载荷更新事件监听器。当该窗口的 payload 被更新时触发回调。
   *
   * @param this - 可选的绑定上下文对象，内部通过 `Function.prototype.call` 使用。
   * @param windowLabel - 窗口标签，用于构造监听的事件名称 `${label}:update`。
   * @param callback - 在 payload 更新时调用的函数，回调参数为 `TauriEvent<T>`。
   * @returns 返回一个 Promise，解析后为 `UnlistenFn`（一个函数），调用它可以注销监听器。
   *
   * @example
   * const unlisten = await getWindowPayloadListener<MyPayload>('my-window', (event) => {
   *   console.log('收到 payload 更新：', event.payload)
   * })
   *
   * // 需要时手动取消监听
   * unlisten()
   */
  // async function getWindowPayloadListener<T>(this: any, windowLabel: string, callback: (event: any) => void) {
  //   const listenLabel = `${windowLabel}:update`

  //   return addListener(
  //     listen<T>(listenLabel, (event) => {
  //       callback.call(this, event)
  //     })
  //   )
  // }

  /**
   * 创建模态子窗口
   * @param title 窗口标题
   * @param label 窗口标识
   * @param width 窗口宽度
   * @param height 窗口高度
   * @param parent 父窗口
   * @param payload 传递给子窗口的数据
   * @returns 创建的窗口实例或已存在的窗口实例
   */
  const createModalWindow = async (
    title: string,
    label: string,
    width: number,
    height: number,
    parent: string,
    payload?: Record<string, any>,
    options?: {
      minWidth?: number
      minHeight?: number
    }
  ) => {
    // 移动端不支持窗口管理
    if (!isDesktop()) {
      return null
    }
    // 检查窗口是否已存在
    const existingWindow = await WebviewWindow.getByLabel(label)
    const parentWindow = parent ? await WebviewWindow.getByLabel(parent) : null

    if (existingWindow) {
      if (isMac()) {
        attachMacModalOverlay(label)
      }
      // 如果窗口已存在，则聚焦到现有窗口并使其闪烁
      existingWindow.requestUserAttention(UserAttentionType.Critical)
      return existingWindow
    }

    // 创建新窗口
    const monitor = await primaryMonitor()
    const clampedSize = clampSizeToMonitor(width, height, monitor)
    const clampedMinWidth = Math.min(options?.minWidth ?? 500, clampedSize.width)
    const clampedMinHeight = Math.min(options?.minHeight ?? 500, clampedSize.height)

    const modalWindow = new WebviewWindow(label, {
      url: `/${label}`,
      title: title,
      width: clampedSize.width,
      height: clampedSize.height,
      resizable: false,
      center: true,
      minWidth: clampedMinWidth,
      minHeight: clampedMinHeight,
      focus: true,
      minimizable: false,
      parent: parentWindow ? parentWindow : parent,
      decorations: !isCompatibilityMode.value,
      transparent: isCompatibilityMode.value,
      titleBarStyle: 'overlay', // mac覆盖标签栏
      hiddenTitle: true, // mac隐藏标题栏
      visible: false,
      dragDropEnabled: true, // 启用文件拖放
      ...(isWindows10() ? { shadow: false } : {})
    })

    // 监听窗口创建完成事件
    modalWindow.once('tauri://created', async () => {
      if (isWindows()) {
        // 禁用父窗口，模拟模态窗口效果
        await parentWindow?.setEnabled(false)
      }

      // 如果有 payload，发送到子窗口
      if (payload) {
        await sendWindowPayload(label, payload)
      }

      // 设置窗口为焦点
      await modalWindow.setFocus()

      if (isMac()) {
        try {
          await invoke('set_window_movable', {
            windowLabel: label,
            movable: false
          })
        } catch (error) {
          console.error('设置子窗口不可拖动失败:', error)
        }
        try {
          await invoke('set_macos_traffic_lights_spacing', {
            windowLabel: label,
            spacing: MAC_TRAFFIC_LIGHTS_SPACING
          })
        } catch {}
        attachMacModalOverlay(label)
      }
    })

    // 监听错误事件
    modalWindow.once('tauri://error', async (e) => {
      console.error(`${title}窗口创建失败:`, e)
      window.$message?.error(`创建${title}窗口失败`)
      await parentWindow?.setEnabled(true)
    })

    void modalWindow.once('tauri://destroyed', async () => {
      if (isMac()) {
        detachMacModalOverlay(label)
      }
      if (isWindows()) {
        try {
          await parentWindow?.setEnabled(true)
        } catch (error) {
          console.error('重新启用父窗口失败:', error)
        }
      }
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
    // 移动端不支持窗口管理
    if (!isDesktop()) {
      return Promise.resolve()
    }
    const webview = await WebviewWindow.getByLabel(label)
    const monitor = await primaryMonitor()
    const clampedSize = clampSizeToMonitor(width, height, monitor)
    // 创建一个新的尺寸对象
    const newSize = new LogicalSize(clampedSize.width, clampedSize.height)
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
    // 移动端不支持窗口管理
    if (!isDesktop()) {
      return Promise.resolve()
    }
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

  /**
   * 设置窗口是否可调整大小
   * @param label 窗口名称
   * @param resizable 是否可调整大小
   */
  const setResizable = async (label: string, resizable: boolean) => {
    // 移动端不支持窗口管理
    if (!isDesktop()) {
      return Promise.resolve()
    }
    const webview = await WebviewWindow.getByLabel(label)
    if (webview) {
      await webview.setResizable(resizable).catch((error) => {
        console.error('设置窗口可调整大小失败:', error)
      })
    }
  }

  const startRtcCall = async (callType: CallTypeEnum) => {
    try {
      const currentSession = globalStore.currentSession
      if (!currentSession) {
        window.$message?.warning?.('当前会话尚未准备好')
        return
      }
      // 判断是否为群聊，如果是群聊则跳过
      if (currentSession.type === RoomTypeEnum.GROUP) {
        window.$message.warning('群聊暂不支持音视频通话')
        return
      }

      // 获取当前房间好友的ID（单聊时使用detailId作为remoteUid）
      const remoteUid = currentSession.detailId
      if (!remoteUid) {
        window.$message.error('无法获取对方用户信息')
        return
      }
      await createRtcCallWindow(false, remoteUid, globalStore.currentSessionRoomId, callType)
    } catch (error) {
      console.error('创建视频通话窗口失败:', error)
    }
  }

  const createRtcCallWindow = async (
    isIncoming: boolean,
    remoteUserId: string,
    roomId: string,
    callType: CallTypeEnum
  ) => {
    // 根据是否来电决定窗口尺寸
    const windowConfig = isIncoming
      ? { width: 360, height: 90, minWidth: 360, minHeight: 90 } // 来电通知尺寸
      : callType === CallTypeEnum.VIDEO
        ? { width: 850, height: 580, minWidth: 850, minHeight: 580 } // 视频通话尺寸
        : { width: 500, height: 650, minWidth: 500, minHeight: 650 } // 语音通话尺寸

    const type = callType === CallTypeEnum.VIDEO ? '视频通话' : '语音通话'
    await createWebviewWindow(
      type, // 窗口标题
      'rtcCall', // 窗口标签
      windowConfig.width, // 宽度
      windowConfig.height, // 高度
      undefined, // 不需要关闭其他窗口
      true, // 可调整大小
      windowConfig.minWidth, // 最小宽度
      windowConfig.minHeight, // 最小高度
      false, // 不透明
      false, // 显示窗口
      {
        remoteUserId,
        roomId: roomId,
        callType,
        isIncoming
      }
    )
  }

  return {
    createWebviewWindow,
    createModalWindow,
    resizeWindow,
    checkWinExist,
    setResizable,
    sendWindowPayload,
    getWindowPayload,
    startRtcCall,
    createRtcCallWindow
  }
}
