import type { UserInfoType, UserItem } from '@/services/types.ts'

// 1.登录返回二维码 2.用户扫描成功等待授权 3.用户登录成功返回用户信息 4.收到消息 5.上下线推送 6.前端token失效
export enum WsResponseMessageType {
  /** 无网络连接 */
  NO_INTERNET = 'noInternet',
  /** 登录返回二维码 */
  LOGIN_QR_CODE = 'loginQrCode',
  /** 用户扫描成功等待授权 */
  WAITING_AUTHORIZE = 'waitingAuthorize',
  /** 用户登录成功返回用户信息 */
  LOGIN_SUCCESS = 'loginSuccess',
  /** 收到消息 */
  RECEIVE_MESSAGE = 'receiveMessage',
  /** 上线推送 */
  ONLINE = 'online',
  /** 前端token失效 */
  TOKEN_EXPIRED = 'tokenExpired',
  /** 禁用的用户 */
  INVALID_USER = 'invalidUser',
  /** 点赞、倒赞更新通知 */
  MSG_MARK_ITEM = 'msgMarkItem',
  /** 消息撤回 */
  MSG_RECALL = 'msgRecall',
  /** 新好友申请 */
  REQUEST_NEW_FRIEND = 'requestNewFriend',
  /** 成员变动 */
  NEW_FRIEND_SESSION = 'newFriendSession',
  /** 下线通知 */
  OFFLINE = 'offline',
  /** 同意好友请求 */
  REQUEST_APPROVAL_FRIEND = 'requestApprovalFriend',
  /** 用户状态改变 */
  USER_STATE_CHANGE = 'userStateChange',
  /** 群主修改群聊信息 */
  ROOM_INFO_CHANGE = 'roomInfoChange',
  /** 自己修改我在群里的信息 */
  MY_ROOM_INFO_CHANGE = 'myRoomInfoChange',
  /** 群通知消息 */
  ROOM_GROUP_MSG = 'roomGroupMsg',
  /** 群公告消息 */
  ROOM_GROUP_NOTICE_MSG = 'roomGroupNoticeMsg',
  /** 群公告已读 */
  ROOM_GROUP_NOTICE_READ_MSG = 'roomGroupNoticeReadMsg',
  /** 群解散 */
  ROOM_DISSOLUTION = 'roomDissolution',
  /** 编辑群公告 */
  ROOM_EDIT_GROUP_NOTICE_MSG = 'roomEditGroupNoticeMsg'
}

/**
 * ws 请求 消息类型 1.请求登录二维码，2心跳检测 3用户认证
 */
export enum WsRequestMsgType {
  /** 1.请求登录二维码 */
  RequestLoginQrCode = 1,
  /** 2心跳检测 */
  HeartBeatDetection,
  /** 3用户认证 */
  Authorization
}

export type WsReqMsgContentType = {
  type: WsRequestMsgType
  data?: Record<string, unknown>
}
export type LoginInitResType = { loginUrl: string }

export type LoginSuccessResType = Pick<UserInfoType, 'avatar' | 'name' | 'uid' | 'account'> & {
  /** 用户的登录凭证，每次请求携带 */
  token: string
}

/** 用户在线状态改变 */
export type OnStatusChangeType = {
  member: Omit<UserItem, 'name' | 'avatar'>
  onlineNum: number
}

/** token过期 */
export type WsTokenExpire = {
  uid: string
  ip: string
  client: string
}

/** 用户状态 */
export type UserStateType = {
  id: number
  title: string
  url: string
}
