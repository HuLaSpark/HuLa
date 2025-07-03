import { MsgEnum } from '@/enums'
import type { MsgType } from '@/services/types'

/**
 * 根据消息类型获取回复内容
 * @param message 消息对象
 * @returns 格式化后的回复内容
 */
export const getReplyContent = (message: MsgType): string => {
  let content: string

  // 根据消息类型确定回复内容
  switch (message.type) {
    case MsgEnum.TEXT: {
      // 文本消息：显示原内容，处理&nbsp;
      content = message.body.content || ''
      if (typeof content === 'string') {
        content = content.replace(/&nbsp;/g, ' ')
      }
      break
    }

    case MsgEnum.VIDEO: {
      // 视频消息：使用缩略图URL或显示[视频]
      content = message.body.thumbUrl || '[视频]'
      break
    }

    case MsgEnum.VOICE: {
      // 语音消息：显示 "[语音] X秒"
      const seconds = message.body.second || 0
      content = `[语音] ${seconds}秒`
      break
    }

    case MsgEnum.FILE: {
      // 文件消息：显示文件名
      content = `[文件] ${message.body.fileName || ''}`
      break
    }

    case MsgEnum.IMAGE: {
      // 图片消息：使用图片URL
      content = message.body.url || '[图片]'
      break
    }

    case MsgEnum.NOTICE: {
      // 公告消息：显示内容
      content = `[公告] ${message.body.content || ''}`
      break
    }

    case MsgEnum.SYSTEM: {
      // 系统消息
      content = '[系统消息]'
      break
    }

    case MsgEnum.MERGE: {
      // 合并消息
      content = '[合并消息]'
      break
    }

    case MsgEnum.AI: {
      // AI消息
      content = `'[AI消息]'${message.body.content || ''}`
      if (typeof content === 'string') {
        content = content.replace(/&nbsp;/g, ' ')
      }
      break
    }

    default: {
      // 其他类型：尝试获取content或url
      content = message.body.content || message.body.url || '[未知消息]'
      if (typeof content === 'string') {
        content = content.replace(/&nbsp;/g, ' ')
      }
      break
    }
  }

  return content
}
