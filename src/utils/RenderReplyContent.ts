import { MsgEnum, RoomTypeEnum } from '@/enums'
import { MSG_REPLY_TEXT_MAP } from '@/common/message'

// 计算展示的回复消息的内容
export const renderReplyContent = (name?: string, type?: MsgEnum, content?: string, roomType?: RoomTypeEnum) => {
  switch (type) {
    case MsgEnum.SYSTEM:
    case MsgEnum.TEXT: {
      return roomType === RoomTypeEnum.GROUP ? `${name}:${content}` : content
    }
    case MsgEnum.IMAGE: {
      return roomType === RoomTypeEnum.GROUP
        ? `${name}:${MSG_REPLY_TEXT_MAP[MsgEnum.IMAGE]}`
        : MSG_REPLY_TEXT_MAP[MsgEnum.IMAGE]
    }
    case MsgEnum.FILE: {
      // 如果content是对象，尝试提取fileName
      let fileContent = ''
      if (typeof content === 'string') {
        fileContent = content
      } else if (content && typeof content === 'object' && 'fileName' in content) {
        fileContent = (content as any).fileName
      }
      fileContent = fileContent || MSG_REPLY_TEXT_MAP[MsgEnum.FILE]

      return roomType === RoomTypeEnum.GROUP ? `${name}:${fileContent}` : `[文件] ${fileContent}`
    }
    case MsgEnum.VOICE: {
      return roomType === RoomTypeEnum.GROUP
        ? `${name}:${MSG_REPLY_TEXT_MAP[MsgEnum.VOICE]}`
        : MSG_REPLY_TEXT_MAP[MsgEnum.VOICE]
    }
    case MsgEnum.VIDEO: {
      return roomType === RoomTypeEnum.GROUP
        ? `${name}:${MSG_REPLY_TEXT_MAP[MsgEnum.VIDEO]}`
        : MSG_REPLY_TEXT_MAP[MsgEnum.VIDEO]
    }
    case MsgEnum.EMOJI: {
      return roomType === RoomTypeEnum.GROUP
        ? `${name}:${MSG_REPLY_TEXT_MAP[MsgEnum.EMOJI]}`
        : MSG_REPLY_TEXT_MAP[MsgEnum.EMOJI]
    }
    case MsgEnum.NOTICE: {
      return roomType === RoomTypeEnum.GROUP
        ? `${name}:${MSG_REPLY_TEXT_MAP[MsgEnum.NOTICE]}`
        : MSG_REPLY_TEXT_MAP[MsgEnum.NOTICE]
    }
    case MsgEnum.MERGE: {
      return roomType === RoomTypeEnum.GROUP
        ? `${name}:${MSG_REPLY_TEXT_MAP[MsgEnum.MERGE]}`
        : MSG_REPLY_TEXT_MAP[MsgEnum.MERGE]
    }
    default: {
      return ''
    }
  }
}
