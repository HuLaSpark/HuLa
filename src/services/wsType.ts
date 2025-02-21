import type { UserInfoType, UserItem } from '@/services/types.ts'

// 1.登录返回二维码 2.用户扫描成功等待授权 3.用户登录成功返回用户信息 4.收到消息 5.上下线推送 6.前端token失效
export enum WsResponseMessageType {
  /** 无网络连接 */
  NO_INTERNET = 'noInternet',
  /** 1.登录返回二维码 */
  LOGIN_QR_CODE = 'loginQrCode',
  /** 2.用户扫描成功等待授权 */
  WAITING_AUTHORIZE = 'waitingAuthorize',
  /** 3.用户登录成功返回用户信息 */
  LOGIN_SUCCESS = 'loginSuccess',
  /** 4.收到消息 */
  RECEIVE_MESSAGE = 'receiveMessage',
  /** 5.上线推送 */
  ONLINE = 'online',
  /** 6.前端token失效 */
  TOKEN_EXPIRED = 'tokenExpired',
  /** 7.禁用的用户 */
  INVALID_USER = 'invalidUser',
  /** 8.点赞、倒赞更新通知 */
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
  USER_STATE_CHANGE = 'userStateChange'
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

export type LoginSuccessResType = Pick<UserInfoType, 'avatar' | 'name' | 'uid'> & {
  /** 用户的登录凭证，每次请求携带 */
  token: string
}

/** 用户在线状态改变 */
export type OnStatusChangeType = {
  changeList: UserItem[]
  onlineNum: number
  totalNum: number
}

/** token过期 */
export type WsTokenExpire = {
  uid: number
  ip: string
  client: string
}

/** 用户状态 */
export type UserStateType = {
  id: number
  title: string
  url: string
}
