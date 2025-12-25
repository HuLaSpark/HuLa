import { Channel, invoke } from '@tauri-apps/api/core'
import { MsgEnum, TauriCommand } from '@/enums'

export type SendMessagePayload = {
  id: string
  roomId: string
  msgType: MsgEnum
  body: unknown
}

export type SendMessageOptions = {
  data: SendMessagePayload
  onSuccess?: (payload: any) => void
  onError?: (msgId: string) => void
}

/**
 * 统一封装 SEND_MSG 的 channel 调用，负责创建/释放监听
 */
export const sendMessageWithChannel = async (options: SendMessageOptions) => {
  const { data, onSuccess, onError } = options
  const successChannel = new Channel<any>()
  const errorChannel = new Channel<string>()
  const noop = () => {}

  const sendPromise = new Promise<void>((resolve, reject) => {
    successChannel.onmessage = (payload) => {
      successChannel.onmessage = noop
      errorChannel.onmessage = noop
      onSuccess?.(payload)
      resolve()
    }
    errorChannel.onmessage = (msgId) => {
      successChannel.onmessage = noop
      errorChannel.onmessage = noop
      onError?.(msgId)
      reject(new Error(msgId || 'send_msg_failed'))
    }
  })

  await invoke(TauriCommand.SEND_MSG, {
    data,
    successChannel,
    errorChannel
  })

  await sendPromise
}
