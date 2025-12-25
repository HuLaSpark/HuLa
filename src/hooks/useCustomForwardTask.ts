import { MsgEnum } from '@/enums'
import { UploadProviderEnum } from '@/hooks/useUpload'
import { useChatStore } from '@/stores/chat'
import { messageStrategyMap } from '@/strategy/MessageStrategy'

type ReplyContext = {
  value: {
    content: string
    key: number
    accountName: string
  }
}

/**
 * 针对“自定义转发任务”（目前用于群二维码）的统一 Hook。
 * 负责 blob 资源释放、临时消息清理、多选状态复位以及重新上传临时图片。
 * 后续如果增加“名片/机器人卡片”等其它临时转发形态，只需要在这里扩展即可。
 */
export const useCustomForwardTask = () => {
  const chatStore = useChatStore()

  /**
   * 统一释放 blob URL，避免内存泄漏
   */
  const releaseBlobUrl = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }

  /**
   * 清理当前的自定义转发任务：
   * 释放预览图的 blob URL
   * 删除挂在消息列表里的临时消息
   * 将 store 中的 customForwardTask 重置为 null
   */
  const clearCustomForwardTask = () => {
    const customTask = chatStore.customForwardTask
    if (!customTask) return

    releaseBlobUrl(customTask.previewUrl)
    chatStore.deleteMsg(customTask.id)
    chatStore.setCustomForwardTask(null)
  }

  /**
   * 恢复多选状态：
   * 统一封装可以防止遗漏某一步导致 UI 状态异常。
   */
  const resetMultiChooseState = () => {
    chatStore.clearMsgCheck()
    chatStore.setMsgMultiChoose(false)
    chatStore.resetSessionSelection()
  }

  /**
   * 根据 customForwardTask 中的字节数据重新构造图片消息体，并上传到服务端。
   * 还原 File 对象并复用图片消息策略
   * 走图片上传流程，得到最终可转发的 url
   * 回填 width/height/size，保证消息体完整
   */
  const buildCustomTaskImageBody = async () => {
    const task = chatStore.customForwardTask
    if (!task) {
      throw new Error('customForwardTask is missing')
    }

    const messageStrategy = messageStrategyMap[MsgEnum.IMAGE]
    const replyContext: ReplyContext = {
      value: {
        content: '',
        key: 0,
        accountName: ''
      }
    }

    const fileBuffer = task.bytes.slice().buffer
    const file = new File([fileBuffer], task.fileName, { type: task.mimeType })

    let msg: Awaited<ReturnType<typeof messageStrategy.getMsg>> | null = null

    try {
      msg = await messageStrategy.getMsg('', replyContext.value, [file])
      const messageBody = messageStrategy.buildMessageBody(msg, replyContext)

      const { uploadUrl, downloadUrl, config } = await messageStrategy.uploadFile(msg.path, {
        provider: UploadProviderEnum.QINIU
      })
      const doUploadResult = await messageStrategy.doUpload(msg.path, uploadUrl, config)

      messageBody.url =
        config?.provider && config?.provider === UploadProviderEnum.QINIU ? doUploadResult?.qiniuUrl : downloadUrl
      delete messageBody.path

      if (!messageBody.width) {
        messageBody.width = task.width
      }
      if (!messageBody.height) {
        messageBody.height = task.height
      }
      if (!messageBody.size) {
        messageBody.size = task.size
      }

      return messageBody
    } finally {
      releaseBlobUrl(msg?.url)
    }
  }

  return {
    clearCustomForwardTask,
    resetMultiChooseState,
    buildCustomTaskImageBody
  }
}
