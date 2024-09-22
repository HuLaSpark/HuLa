import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { EventEnum } from '@/enums'
import { emit } from '@tauri-apps/api/event'

/**
 * 监听窗口状态变化
 * @param label 窗口标签
 */
export const useWindowState = (label: string) => {
  const win = WebviewWindow.getByLabel(label)

  watchEffect(() => {
    // once一次性监听事件,当用户点击的是关闭按钮时触发
    win?.once(EventEnum.WIN_CLOSE, async (e) => {
      await emit(EventEnum.WIN_CLOSE, e)
    })
    // 监听窗口关闭事件,当窗口是非正常关闭的时候触发
    win?.onCloseRequested(async () => {
      await emit(EventEnum.WIN_CLOSE, WebviewWindow.getCurrent().label)
    })
  })

  onMounted(async () => {
    await nextTick(async () => {
      const isShow = await win?.isVisible()
      if (isShow) {
        await emit(EventEnum.WIN_SHOW, label)
      }
    })
  })
}
