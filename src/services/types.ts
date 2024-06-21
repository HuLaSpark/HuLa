/**
 * 类型定义文件
 * 注意：请使用TSDoc规范进行注释，以便在使用时能够获得良好提示。
 * @see TSDoc规范https://tsdoc.org/
 **/
import { ActEnum, IsYetEnum, MarkEnum, MsgEnum, OnlineEnum, RoomTypeEnum, SexEnum } from '@/enums'

/**响应请求体*/
export type Response = {
  /** 成功标识true or false */
  success: boolean
  /** 错误码 */
  errCode: number
  /** 错误消息 */
  errMsg: string
  /** 数据 */
  data: any
}

/* ======================================================== */
export type ListResponse<T> = {
  /** 游标（下次翻页带上这参数）*/
  cursor: string
  /** 是否最后一页 */
  isLast: boolean
  list: T[]
}

export type CacheBadgeReq = {
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime?: number
  /** 徽章 ID */
  itemId: number
}

export type GroupDetailReq = {
  /** 群头像 */
  avatar: string
  /** 群名称 */
  groupName: string
  /** 在线人数 */
  onlineNum: number
  /** 成员角色 1群主 2管理员 3普通成员 4踢出群聊 */
  role: number
  /** 房间id */
  roomId: number
}

export type CacheBadgeItem = {
  /** 是否需要更新数据源。 */
  needRefresh?: boolean
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime: number
  /** 徽章说明 */
  describe: string
  /** 徽章图标 */
  img: string
  /** 徽章 ID */
  itemId: number
}

export type CacheUserReq = {
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime?: number
  /** uid */
  uid: number
}

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

export type UserItem = {
  /** 在线状态 */
  activeStatus: OnlineEnum
  /** 头像 */
  avatar: string
  /** 最后一次上下线时间 */
  lastOptTime: number
  /** 用户名称 */
  name: string
  /** 角色ID */
  roleId?: number
  /** uid */
  uid: number
}

export type GroupStatisticType = {
  /** 在线人数 */
  onlineNum: number
  /** 总人数 */
  totalNum: number
}

export type MessageReplyType = {
  /** 是否可消息跳转 0否 1是 */
  canCallback: number
  /** 是否可消息跳转 0否 1是 */
  content: string
  /** 跳转间隔的消息条数 */
  gapCount: number
  /** 消息id */
  id: number
  /** 用户名称 */
  username: string
}

export type MarkMsgReq = {
  // actType	动作类型 1确认 2取消
  actType: ActEnum
  // 标记类型 1点赞 2举报
  markType: MarkEnum
  // 消息 ID
  msgId: number
}

export type UserInfoType = {
  /** 用户唯一标识 */
  uid: number
  /** 用户头像 */
  avatar: string
  /** 用户名 */
  name: string
  /** 剩余改名次数 */
  modifyNameChance: number
  /** 性别 1为男性，2为女性 */
  sex: SexEnum
  /** 徽章，本地字段，有值用本地，无值用远端 */
  badge?: string
  /** 权限 */
  power?: number
}

export type BadgeType = {
  // 徽章描述
  describe: string
  // 徽章id
  id: number
  // 徽章图标
  img: string
  // 是否拥有 0否 1是
  obtain: IsYetEnum
  // 是否佩戴 0否 1是
  wearing: IsYetEnum
}

export type MarkItemType = {
  /** 操作用户 */
  uid: number
  /** 消息id */
  msgId: number
  /** 操作类型 1点赞 2举报 */
  markType: MarkEnum
  /** 数量 */
  markCount: number
  /** 动作类型 1确认 2取消 */
  actType: ActEnum
}

export type RevokedMsgType = {
  /** 消息ID */
  msgId: number
  /** 会话ID */
  roomId?: number
  /** 撤回人ID */
  recallUid?: number
}

export type EmojiItem = {
  expressionUrl: string
  id: number
}

// -------------------- ⬇消息体类型定义⬇ ----------------

/**
 * 消息返回体
 */
export type MessageType = {
  /** 发送者信息 */
  fromUser: MsgUserType
  /** 消息主体 */
  message: MsgType
  /** 发送时间 */
  sendTime: string
  /** 时间段（可选） */
  timeBlock?: string
  /** 是否加载中 */
  loading?: boolean
}

/**
 * 消息中用户信息
 */
export type MsgUserType = {
  /** 用户ID */
  uid: number
  /** 用户名 */
  username: string
  /** 头像 */
  avatar: string
  /** 归属地 */
  locPlace: string
  /** 徽章 */
  badge?: {
    /** 徽章地址 */
    img: string
    /** 描述 */
    describe: string // 描述
  }
}

/**
 * 消息互动信息
 */
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

/**
 * 消息内容
 */
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

/**
 * 发送消息载体
 */
export type MessageReq = {
  /** 会话id */
  roomId: number
  /** 消息类型 */
  msgType: MsgEnum
  /** 消息体 */
  body: {
    /** 文本消息内容 */
    content?: string
    /** 回复的消息id */
    replyMsgId?: number
    /** 任意 */
    [key: string]: any
  }
}

/** 申请状态 */
export enum RequestFriendAgreeStatus {
  /** 1待审批 */
  Waiting = 1,
  /** 2同意 */
  Agree
}

/** 请求添加好友的列表项 */
export type RequestFriendItem = {
  /** 申请id */
  applyId: number
  /** 申请信息 */
  msg: string
  /** 申请状态 1待审批 2同意 */
  status: RequestFriendAgreeStatus
  /** 申请类型 1加好友 */
  type: number
  /** 申请人uid */
  uid: number
  /** 会话 ID */
  roomId: number
}
/** 联系人的列表项 */
export type ContactItem = {
  /** 在线状态 1在线 2离线 */
  activeStatus: OnlineEnum
  /** 最后一次上下线时间 */
  lastOptTime: number
  uid: number
}

/** 是否全员展示的会话 0否 1是 */
export enum IsAllUserEnum {
  /** 0否 */
  Not,
  /** 1是 */
  Yes
}

/** 会话列表项 */
export type SessionItem = {
  /** 房间最后活跃时间(用来排序) */
  activeTime: number
  /** 会话头像 */
  avatar: string
  /** 是否全员展示的会话 0否 1是 */
  hot_Flag: IsAllUserEnum
  /** 会话名称 */
  name: string
  /** 房间id */
  roomId: number
  /** 最新消息 */
  text: string
  /** 房间类型 1群聊 2单聊 */
  type: RoomTypeEnum
  /** 未读数 */
  unreadCount: number
}

/** 消息已读未读数列表项 */
export type MsgReadUnReadCountType = {
  /** 消息 ID */
  msgId: number
  /** 已读数 */
  readCount: number
  /** 未读数 */
  unReadCount: number | null
}
/* ======================================================== */
/**! 模拟信息数据的类型 */
export type MockItem = {
  key: number
  type: RoomTypeEnum
  avatar: string
  accountId: number
  accountName: string
}
