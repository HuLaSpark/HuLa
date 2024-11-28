import type { UserInfoType, UserItem } from '@/services/types.ts'

// 1.登录返回二维码 2.用户扫描成功等待授权 3.用户登录成功返回用户信息 4.收到消息 5.上下线推送 6.前端token失效
export enum WsResponseMessageType {
  /** 无网络连接 */
  NO_INTERNET,
  /** 1.登录返回二维码 */
  LOGIN_QR_CODE,
  /** 2.用户扫描成功等待授权 */
  WAITING_AUTHORIZE,
  /** 3.用户登录成功返回用户信息 */
  LOGIN_SUCCESS,
  /** 4.收到消息 */
  RECEIVE_MESSAGE,
  /** 5.上下线推送 */
  ON_OFF_LINE,
  /** 6.前端token失效 */
  TOKEN_EXPIRED,
  /** 7.禁用的用户 */
  INVALID_USER,
  /** 8.点赞、倒赞更新通知 */
  MSG_MARK_ITEM,
  /** 消息撤回 */
  MSG_RECALL,
  /** 新好友申请 */
  REQUEST_NEW_FRIEND,
  /** 新好友会话 */
  NEW_FRIEND_SESSION
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

export type OnStatusChangeType = {
  changeList: UserItem[]
  onlineNum: number
  totalNum: number
}
