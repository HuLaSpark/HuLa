import { WebviewWindow } from '@tauri-apps/api/window'
import { sendMsg } from '@/common/CrossTabMsg.ts'
import { CrossTabTypeEnum, NativeListenEnum } from '@/enums'

export const useWindowState = (label: string) => {
  const win = WebviewWindow.getByLabel(label)

  // TODO 可以尝试使用win.emit来取代自定义封装的跨标签页通信 (nyh -> 2024-03-05 07:15:42)
  watchEffect(() => {
    // once一次性监听事件,当用户点击的是关闭按钮时触发
    win?.once(NativeListenEnum.NATIVE_CLOSE, (e) => {
      sendMsg(CrossTabTypeEnum.WINDOW_CLOSE, e.payload)
    })
    // 监听窗口关闭事件,当窗口是非正常关闭的时候触发
    win?.onCloseRequested((e) => {
      sendMsg(CrossTabTypeEnum.WINDOW_CLOSE, e.windowLabel)
    })
  })

  onMounted(async () => {
    const isShow = await win?.isVisible()
    if (isShow) {
      sendMsg(CrossTabTypeEnum.WINDOW_SHOW, label)
    }
  })
}
