/**
 * 类型定义文件
 * 注意：请使用TSDoc规范进行注释，以便在使用时能够获得良好提示。
 * @see TSDoc规范https://tsdoc.org/
 **/
import { MsgEnum, RCodeEnum, RoomTypeEnum } from '@/enums'

/**响应请求体*/
export type Response = {
  code: RCodeEnum
  msg: string
  data: {
    records: any
    total: number
  }
  fail: boolean
  success: boolean
  version: string
}
/**分页搜索*/
export type parameter = {
  pageNum: number
  pageSize: number
  name: string
}
/**登录类型*/
export type login = {
  username: string
  password: string
}

/** ===================================================== */
/** 回复类型 */
export type ReplyType = {
  id: number
  username: string
  type: MsgEnum
  /** 根据不同类型回复的消息展示也不同-`过渡版` */
  body: any
  /**
   * 是否可消息跳转
   * @enum {number}  `0`否 `1`是
   */
  canCallback: number
  /** 跳转间隔的消息条数  */
  gapCount: number
}

/** 消息互动信息 */
export type MessageMarkType = {
  /** 点赞 */
  userLike: number
  /** 举报 */
  userDislike: number
  /** 点赞数 */
  likeCount: number
  /** 举报数 */
  dislikeCount: number
}

/** 图片消息体 */
export type ImageBody = {
  size: number
  url: string
  width: number
  height: number
}
/** 语音消息体 */
export type VoiceBody = {
  size: number
  second: number
  url: string
}
/** 视频 */
export type VideoBody = {
  size: number
  url: string
  thumbSize?: number
  thumbWidth?: number
  thumbHeight?: number
  thumbUrl?: string
}
/** 文件消息体 */
export type FileBody = {
  size: number
  fileName: string
  url: string
}
/** 文本消息体 */
export type TextBody = {
  /** 消息内容 */
  content: string
  /** 回复 */
  reply: ReplyType
  /**
   * 消息链接映射
   */
  urlContentMap: Record<
    string,
    {
      title: string
      description: string
      image: string
    }
  >
}
/** 表情消息 */
export type EmojiBody = {
  url: string
}

/** 消息内容 */
export type MsgType = {
  /** 消息ID */
  id: number
  /**  房间 ID */
  roomId: number
  /** 消息类型 */
  type: MsgEnum
  /** 动态消息体-`根据消息类型变化` */
  body: TextBody | ImageBody | VoiceBody | VideoBody | FileBody | EmojiBody | any
  /** 发送时间戳 */
  sendTime: number
  /** 消息互动信息 */
  messageMark: MessageMarkType
}

/** 缓存用户项 */
export type CacheUserItem = {
  /** 是否需要更新数据源。 */
  needRefresh?: boolean
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime: number
  /** 获得的徽章 */
  itemIds: number[]
  /** 佩戴的徽章 */
  wearingItemId: number
  /** 归属地 */
  locPlace: string
  /** 头像 */
  avatar: string
  /** 最后一次上下线时间 */
  lastOptTime: number
  /** 用户名称 */
  name: string
  /** uid */
  uid: number
}
/**! 模拟信息数据的类型 */
export type MockItem = {
  key: number
  type: RoomTypeEnum
  avatar: string
  accountId: string
  accountName: string
}
