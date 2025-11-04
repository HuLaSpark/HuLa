import type { UserInfoType } from '@/services/types.ts'

// 1.登录返回二维码 2.用户扫描成功等待授权 3.用户登录成功返回用户信息 4.收到消息 5.上下线推送 6.前端token失效
export enum WsResponseMessageType {
  /** 无网络连接 */
  NO_INTERNET = 'noInternet',
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
  /** 群成员变动 */
  WS_MEMBER_CHANGE = 'ws-member-change',
  /** 设置群管理员 */
  GROUP_SET_ADMIN_SUCCESS = 'groupSetAdmin',
  /** 下线通知 */
  OFFLINE = 'offline',
  /** 同意好友请求 */
  REQUEST_APPROVAL_FRIEND = 'requestApprovalFriend',
  /** 通知事件 */
  NOTIFY_EVENT = 'notifyEvent',
  /** 用户状态改变 */
  USER_STATE_CHANGE = 'userStateChange',
  /** 群主修改群聊信息 */
  ROOM_INFO_CHANGE = 'roomInfoChange',
  /** 自己修改我在群里的信息 */
  MY_ROOM_INFO_CHANGE = 'myRoomInfoChange',
  /** 群解散 */
  ROOM_DISSOLUTION = 'roomDissolution',
  /** 加入视频会议 */
  JoinVideo = 'JoinVideo',
  /** 群公告消息 */
  ROOM_GROUP_NOTICE_MSG = 'roomGroupNoticeMsg',
  /** 编辑群公告 */
  ROOM_EDIT_GROUP_NOTICE_MSG = 'roomEditGroupNoticeMsg',
  /** 群公告已读 */
  ROOM_GROUP_NOTICE_READ_MSG = 'roomGroupNoticeReadMsg',
  /** 发起视频通话请求 */
  VideoCallRequest = 'VideoCallRequest',
  /** 通话已接通 */
  CallAccepted = 'CallAccepted',
  /** 呼叫被拒绝 */
  CallRejected = 'CallRejected',
  /** 会议已关闭 */
  RoomClosed = 'RoomClosed',
  /** 媒体组件改变 */
  MediaControl = 'MediaControl',
  /** 通话超时 */
  TIMEOUT = 'TIMEOUT',
  /** 挂断 */
  DROPPED = 'DROPPED',
  /** 离开视频会议 */
  LeaveVideo = 'LeaveVideo',
  /** 启动屏幕共享 */
  ScreenSharingStarted = 'ScreenSharingStarted',
  /** 关闭屏幕共享 */
  ScreenSharingStopped = 'ScreenSharingStopped',
  /** 网络状况不佳 */
  NetworkPoor = 'NetworkPoor',
  /** 踢出用户 */
  UserKicked = 'UserKicked',
  /** 信令消息 */
  WEBRTC_SIGNAL = 'WEBRTC_SIGNAL',
  /** 全局静音 */
  AllMuted = 'AllMuted',
  CANCEL = 'CANCEL',
  /** 朋友圈消息推送 */
  FEED_SEND_MSG = 'feedSendMsg',
  /** 朋友圈通知（点赞/评论，通过 comment 字段判断） */
  FEED_NOTIFY = 'feedNotify'
}

export enum NoticeTypeEnum {
  /** 设置群管理员 */
  GROUP_SET_ADMIN = 8,
  /** 取消群管理员 */
  GROUP_RECALL_ADMIN = 9
}

/**
 * ws 请求 消息类型 1.请求登录二维码，2心跳检测 3用户认证
 */
export enum WsRequestMsgType {
  /** 1.请求登录二维码 */
  RequestLoginQrCode = 1,
  /** 2.消息心跳检测 */
  HeartBeatDetection,
  /** 3.用户认证 */
  Authorization,
  /** 4.视频心跳 */
  VIDEO_HEARTBEAT,
  /** 5.视频通话请求 */
  VIDEO_CALL_REQUEST,
  /** 6.视频通话响应 */
  VIDEO_CALL_RESPONSE,
  /** 7.媒体静音音频 */
  MEDIA_MUTE_AUDIO,
  /** 8.静音视频 */
  MEDIA_MUTE_VIDEO,
  /** 9.静音全部用户 */
  MEDIA_MUTE_ALL,
  /** 10.屏幕共享 */
  SCREEN_SHARING,
  /** 11.关闭房间 */
  CLOSE_ROOM,
  /** 12.踢出用户 */
  KICK_USER,
  /** 13.通话质量监控 */
  NETWORK_REPORT,
  /** 14.信令消息 */
  WEBRTC_SIGNAL
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
  uid: string
  type: number
  roomId: string
  onlineNum: number
  lastOptTime: number
}

/** token过期 */
export type WsTokenExpire = {
  uid: string
  ip: string
  client: string
}

/** 用户状态 */
export type UserStateType = {
  id: string
  title: string
  url: string
}

// 通话请求数据类型
export interface VideoCallRequestData {
  targetUid: string
  roomId: string
  mediaType: 'AudioSignal' | 'VideoSignal' // 通话类型
}

// 通话响应数据类型
export interface CallResponseData {
  callerUid: string
  targetUid: string
  roomId: string
  accepted: boolean
}

// 信令数据类型
export interface SignalData {
  roomId: string
  signal: any // WebRTC信令
  mediaType: 'AudioSignal' | 'VideoSignal' // 语音通话、视频通话
}

export interface SignalSdp {
  /** SDP 会话描述字符串 */
  sdp: string
  /** SDP 消息类型（如 offer/answer） */
  type: string
}

/** 通话信令消息整体类型 */
export interface CallSignalMessage {
  /** 呼叫方用户 ID */
  callerUid: string
  /** 房间 ID */
  roomId: string
  /** 信令内容（JSON 字符串形式的 SDP 信息） */
  signal: string
  /** 信令类型（如 offer/answer/candidate 等） */
  signalType: string
  /** 目标用户 ID */
  targetUid: string
  /** 是否为视频通话 */
  video: boolean
}

// 加入/离开房间数据类型
export interface RoomActionData {
  roomId: string
  uid: string
}

export enum CallResponseStatus {
  /** 超时未接听 */
  TIMEOUT = -1,
  /** 已拒绝 */
  REJECTED = 0,
  /** 已接听 */
  ACCEPTED = 1,
  /** 已挂断 */
  DROPPED = 2,
  /** 已取消 */
  CANCEL = 3
}

/**
 * 通话状态描述映射
 */
export const CallResponseStatusDesc: Record<CallResponseStatus, string> = {
  [CallResponseStatus.TIMEOUT]: '超时未接听',
  [CallResponseStatus.REJECTED]: '已拒绝',
  [CallResponseStatus.ACCEPTED]: '已接听',
  [CallResponseStatus.DROPPED]: '已挂断',
  [CallResponseStatus.CANCEL]: '已取消'
}

/**
 * 根据状态码获取通话状态
 * @param code 状态码
 * @returns 对应的通话状态
 */
export function getCallResponseStatus(code: number): CallResponseStatus | undefined {
  return Object.values(CallResponseStatus).includes(code) ? (code as CallResponseStatus) : undefined
}

/**
 * 根据状态码获取状态描述
 * @param code 状态码
 * @returns 对应的状态描述文本
 */
export function getCallResponseStatusDesc(code: number): string {
  const status = getCallResponseStatus(code)
  return status !== undefined ? CallResponseStatusDesc[status] : '未知状态'
}
