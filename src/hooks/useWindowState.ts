import { WebviewWindow } from '@tauri-apps/api/window'
import { sendMsg } from '@/common/CrossTabMsg.ts'
import { CrossTabTypeEnum, NativeListenEnum } from '@/enums'

export const useWindowState = (label: string) => {
  const win = WebviewWindow.getByLabel(label)

  // TODO 可以尝试使用win.emit来取代自定义封装的跨标签页通信 (nyh -> 2024-03-05 07:15:42)
  watchEffect(() => {
    // once一次性监听事件
    win?.once(NativeListenEnum.CLOSE, (e) => {
      sendMsg(CrossTabTypeEnum.WINDOWSSHOW, e)
    })
  })

  onMounted(async () => {
    const isShow = await win?.isVisible()
    if (isShow) {
      sendMsg(CrossTabTypeEnum.WINDOWSSHOW, label)
    }
  })
}
