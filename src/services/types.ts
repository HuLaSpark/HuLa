/**
 * 类型定义文件
 * 注意：请使用TSDoc规范进行注释，以便在使用时能够获得良好提示。
 * @see TSDoc规范https://tsdoc.org/
 **/
import {
  ActEnum,
  IsYesEnum,
  MarkEnum,
  MsgEnum,
  OnlineEnum,
  RoomTypeEnum,
  SexEnum,
  MessageStatusEnum,
  SessionOperateEnum,
  NotificationTypeEnum
} from '@/enums'

/**响应请求体*/
export type ServiceResponse = {
  /** 成功标识true or false */
  success: boolean
  /** 状态码 */
  code: number
  /** 错误消息 */
  msg: string
  /** 数据 */
  data: any
  /** 版本号 */
  version: string
}

export type PageInfo<T> = {
  total: number
  size: number
  current: number
  records: T[]
}

/* ======================================================== */

export type LoginUserReq = {
  /** 账号 */
  account: string
  /** 密码 */
  password: string
  /** 登录方式 pc/mobile */
  source: 'pc' | 'mobile'
}

export type RegisterUserReq = {
  /** 默认随机头像 */
  avatar: string
  /** 昵称 */
  name: string
  /** 邮箱 */
  email: string
  /** 密码 */
  password: string
  /** 邮箱验证码 */
  code: string
  /** 识别码 */
  uuid: string
}

/** 分页翻页 */
export type PageResponse<T> = {
  /** 总数 */
  total: string
  /** 总页数 */
  pages: string
  /** 当前页 */
  current: string
  /** 每页大小 */
  size: string
  /** 数据 */
  records: T[]
}

/** 游标翻页 */
export type ListResponse<T> = {
  /** 游标（下次翻页带上这参数）*/
  cursor: string
  /** 当前页数 */
  pageNo?: number
  /** 是否最后一页 */
  isLast: boolean
  list: T[]
}

export type CacheBadgeReq = {
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime?: number
  /** 徽章 ID */
  itemId: string
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
  roomId: string
  /** 群号 */
  account: string
  /** 群成员数 */
  memberNum: number
  /** 群备注 */
  remark: string
  /** 我的群昵称 */
  myName: string
}

export type GroupListReq = {
  /** 群聊id */
  groupId: string
  /** 房间id */
  roomId: string
  /** 群名称 */
  roomName: string
  /** 群头像 */
  avatar: string
  /** 群备注 */
  remark?: string
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
  itemId: string
}

export type CacheUserReq = {
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime?: number
  /** uid */
  uid: string
}

export type CacheUserItem = {
  /** 是否需要更新数据源。 */
  needRefresh?: boolean
  /** 最后更新时间 更新超过 10 分钟异步去更新。 */
  lastModifyTime: number
  /** 获得的徽章 */
  itemIds: string[]
  /** 佩戴的徽章 */
  wearingItemId: string
  /** 归属地 */
  locPlace: string
  /** 头像 */
  avatar: string
  /** 最后一次上下线时间 */
  lastOptTime: number
  /** 用户名称 */
  name: string
  /** uid */
  uid: string
  /** 用户状态 */
  userStateId: string
  /** 账号 */
  account: string
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
  /** uid */
  uid: string
  /** 归属地 */
  locPlace?: string
  /** 角色ID */
  roleId?: number
  /** 账号 */
  account: string
  /** 我的群昵称 */
  myName?: string
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
  id: string
  /** 用户名称 */
  username: string
}

export type MarkMsgReq = {
  // actType	动作类型 1确认 2取消
  actType: ActEnum
  // 标记类型 1点赞 2举报
  markType: MarkEnum
  // 消息 ID
  msgId: string
}

export type UserInfoType = {
  /** 用户唯一标识 */
  uid: string
  /** 用户账号 */
  account: string
  /** 邮箱 */
  email: string
  /** 密码 */
  password?: string
  /** 用户头像 */
  avatar: string
  /** 用户名 */
  name: string
  /** 剩余改名次数 */
  modifyNameChance: number
  /** 性别 1为男性，2为女性 */
  sex: SexEnum
  /** 权限 */
  power?: number
  /** 佩戴的徽章 */
  wearingItemId?: string
  /** 用户状态id */
  userStateId: string
  /** 头像更新时间 */
  avatarUpdateTime: number
  /** 客户端 */
  client: string
}

export type BadgeType = {
  // 徽章描述
  describe: string
  // 徽章id
  id: string
  // 徽章图标
  img: string
  // 是否拥有 0否 1是
  obtain: IsYesEnum
  // 是否佩戴 0否 1是
  wearing: IsYesEnum
}

export type MarkItemType = {
  /** 操作用户 */
  uid: number
  /** 消息id */
  msgId: number
  /** 操作类型 */
  markType: MarkEnum
  /** 数量 */
  markCount: number
  /** 动作类型 1确认 2取消 */
  actType: ActEnum
}

export type RevokedMsgType = {
  /** 消息ID */
  msgId: string
  /** 会话ID */
  roomId?: string
  /** 撤回人ID */
  recallUid?: string
}

export type EmojiItem = {
  expressionUrl: string
  id: string
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
  uid: string
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
export type MessageMarkType = Record<
  string,
  {
    /** 该表情的计数 */
    count: number
    /** 当前用户是否标记了该表情 */
    userMarked: boolean
  }
>

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
  filename: string
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
/** 公告消息体 */
export type AnnouncementBody = TextBody & {
  /** 创建时间 */
  createdTime: number
  /** 更新时间 */
  updatedTime: number
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
  id: string
  /**  房间 ID */
  roomId: string
  /** 消息类型 */
  type: MsgEnum
  /** 动态消息体-`根据消息类型变化` */
  body: TextBody | ImageBody | VoiceBody | VideoBody | FileBody | EmojiBody | any
  /** 发送时间戳 */
  sendTime: number
  /** 消息互动信息 */
  messageMarks: MessageMarkType
  /** 消息发送状态 */
  status: MessageStatusEnum
}

export type ReplyType = {
  id: string
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
  roomId: string
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
  Agree,
  /** 3拒绝 */
  Reject,
  /** 4忽略 */
  Ignore
}

/** 请求添加好友的列表项 */
export type RequestFriendItem = {
  /** 申请id */
  applyId: string
  /** 申请信息 */
  msg: string
  /** 申请状态 1待审批 2同意 3拒绝 4忽略 */
  status: RequestFriendAgreeStatus
  /** 申请类型 1加好友 */
  type: number
  /** 申请人uid */
  uid: string
  /** 被申请人id */
  targetId: string
  /** 申请时间 */
  createTime: number
  /** 会话 ID */
  roomId: string
}
/** 联系人的列表项 */
export type ContactItem = {
  /** 在线状态 1在线 2离线 */
  activeStatus: OnlineEnum
  /** 最后一次上下线时间 */
  lastOptTime: number
  uid: string
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
  /** hula号 */
  account: string
  /** 房间最后活跃时间(用来排序) */
  activeTime: number
  /** 会话头像 */
  avatar: string
  /** 如果是单聊，则是对方的uid，如果是群聊，则是群id */
  id: string
  /** 是否全员展示的会话 0否 1是 */
  hotFlag: IsAllUserEnum
  /** 会话名称 */
  name: string
  /** 房间id */
  roomId: string
  /** 最新消息 */
  text: string
  /** 房间类型 1群聊 2单聊 */
  type: RoomTypeEnum
  /** 未读数 */
  unreadCount: number
  /** 是否置顶 0否 1是 */
  top: boolean
  /** 会话操作 */
  operate: SessionOperateEnum
  /** 在线状态 1在线 2离线 */
  activeStatus?: OnlineEnum
  /** 隐藏会话 */
  hide: boolean
  /** 免打扰类型 */
  muteNotification: NotificationTypeEnum
  /** 屏蔽消息 */
  shield: boolean
  /** 群成员数 */
  memberNum?: number
  /** 群备注 */
  remark?: string
  /** 我的群昵称 */
  myName?: string
}

/** 消息已读未读数列表项 */
export type MsgReadUnReadCountType = {
  /** 消息 ID */
  msgId: string
  /** 已读数 */
  readCount: number
  /** 未读数 */
  unReadCount: number | null
}

/** 支持的翻译服务提供商类型  */
export type TranslateProvider = 'youdao' | 'tencent'

/** AI模型 */
export type AIModel = {
  uid: string
  type: 'Ollama' | 'OpenAI'
  name: string
  value: string
  avatar: string
}

/** 登录 */
export type Login = {
  /** token */
  token: string
  /** 刷新token */
  refreshToken: string
  /** 客户端 */
  client: string
}

/** 用户状态 */
export type UserState = {
  /** id */
  id: string
  /** 标题 */
  title: string
  /** 链接 */
  url: string
  /** 背景颜色 */
  bgColor?: string
}

/** 搜索好友 */
export type SearchFriend = {
  /** 用户ID */
  uid: string
  /** 用户名 */
  name: string
  /** 头像 */
  avatar: string
  /** 账号 */
  account: string
}

/** 搜索群 */
export type SearchGroup = {
  /** 群ID */
  roomId: string
  /** 群名称 */
  name: string
  /** 头像 */
  avatar: string
  /** 账号 */
  account: string
  /** 额外信息 */
  extJson: string
  /** 是否删除 */
  deleteStatus: IsYesEnum
}

/** 配置 */
export type ConfigType = {
  /** logo */
  logo: string
  /** 系统名称 */
  name: string
  /** 七牛 */
  qiNiu: {
    /** oss域名 */
    ossDomain: string
    /** 分片大小 */
    fragmentSize: string
    /** 超过多少MB开启分片上传 */
    turnSharSize: string
  }
  /** 大群ID */
  roomGroupId: string
}

/** 群组公告 */
export type AnnouncementItem = {
  /** 公告ID */
  id: string
  /** 房间ID */
  roomId: string
  /** 发布者ID */
  uid: string
  /** 公告内容 */
  content: string
  /** 创建时间 */
  createdTime: number
  /** 是否置顶 */
  top: boolean
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

export type FilesMeta = {
  name: string
  path: string
  file_type: string
  mime_type: string
  exists: boolean
}[]

export type RightMouseMessageItem = {
  createId: string | null
  updateId: string | null
  fromUser: {
    uid: string
    nickname: string | null
  }
  message: {
    id: string
    roomId: string
    sendTime: number
    type: number
    body: {
      size: string
      url: string
      fileName: string
      replyMsgId: string | null
      atUidList: string[] | null
      reply: any | null // 可进一步细化
    }
    messageMarks: {
      [key: string]: {
        count: number
        userMarked: boolean
      }
    }
  }
  createTime: number | null
  updateTime: number | null
  _index: number
}
