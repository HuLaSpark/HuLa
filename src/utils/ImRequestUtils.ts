import { ImUrlEnum, type NotificationTypeEnum } from '@/enums'
import type { CacheBadgeReq, CacheUserReq, LoginUserReq, RegisterUserReq } from '@/services/types'
import { ErrorType, invokeSilently, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'

/**
 * IM 请求参数接口
 */
interface ImRequestParams {
  /** API URL 枚举 */
  url: ImUrlEnum
  /** 请求体数据 */
  body?: any
  /** 查询参数 */
  params?: Record<string, any>
}

/**
 * IM 请求选项接口
 */
interface ImRequestOptions {
  /** 是否显示错误提示，默认为 true */
  showError?: boolean
  /** 自定义错误消息 */
  customErrorMessage?: string
  /** 错误类型，默认为 Network */
  errorType?: ErrorType
  /** 是否静默调用（不显示错误），默认为 false */
  silent?: boolean
  /** 重试选项 */
  retry?: {
    /** 最大重试次数，默认为 3 */
    maxRetries?: number
    /** 重试间隔（毫秒），默认为 1000 */
    retryDelay?: number
  }
}

/**
 * 统一的 IM API 请求工具
 *
 * @example
 * ```typescript
 * // 简单的 GET 请求
 * const userDetail = await imRequest({ url: ImUrlEnum.GET_USER_INFO_DETAIL })
 *
 * // 带参数的请求
 * const groupDetail = await imRequest({
 *   url: ImUrlEnum.GROUP_DETAIL,
 *   params: { id: groupId }
 * })
 *
 * // 带请求体的 POST 请求
 * const result = await imRequest({
 *   url: ImUrlEnum.GET_USER_INFO_BATCH,
 *   body: batchUsers
 * })
 *
 * // 静默请求（不显示错误）
 * const result = await imRequestSilent({
 *   url: ImUrlEnum.APPLY_UN_READ_COUNT
 * })
 *
 * // 带重试的请求
 * const result = await imRequest({
 *   url: ImUrlEnum.GET_CONTACT_LIST,
 *   params: { pageSize: 100 }
 * }, {
 *   retry: { maxRetries: 5, retryDelay: 2000 }
 * })
 * ```
 */
export async function imRequest<T = any>(
  requestParams: ImRequestParams,
  options?: Omit<ImRequestOptions, 'silent'>
): Promise<T> {
  const { retry, ...invokeOptions } = options || {}

  // 构建调用参数
  const args = {
    url: requestParams.url,
    body: requestParams.body || null,
    params: requestParams.params || null
  }

  // 如果需要重试
  if (retry) {
    const { invokeWithRetry } = await import('@/utils/TauriInvokeHandler')
    return await invokeWithRetry<T>('im_request_command', args, {
      ...retry,
      showError: invokeOptions.showError,
      customErrorMessage: invokeOptions.customErrorMessage
    })
  }

  // 普通调用
  return await invokeWithErrorHandler<T>('im_request_command', args, {
    ...invokeOptions,
    errorType: invokeOptions.errorType || ErrorType.Network
  })
}

/**
 * 静默的 IM 请求（不显示错误提示）
 *
 * @example
 * ```typescript
 * const result = await imRequestSilent({
 *   url: ImUrlEnum.APPLY_UN_READ_COUNT
 * })
 * ```
 */
export async function imRequestSilent<T = any>(requestParams: ImRequestParams): Promise<T | null> {
  const args = {
    url: requestParams.url,
    body: requestParams.body || null,
    params: requestParams.params || null
  }
  return await invokeSilently<T>('im_request_command', args)
}

/**
 * 带重试机制的 IM 请求
 *
 * @example
 * ```typescript
 * const result = await imRequestWithRetry({
 *   url: ImUrlEnum.GET_CONTACT_LIST,
 *   params: { pageSize: 100 }
 * }, {
 *   maxRetries: 5,
 *   retryDelay: 2000
 * })
 * ```
 */
export async function imRequestWithRetry<T = any>(
  requestParams: ImRequestParams,
  retryOptions?: {
    maxRetries?: number
    retryDelay?: number
    showError?: boolean
    customErrorMessage?: string
  }
): Promise<T> {
  return await imRequest<T>(requestParams, {
    retry: retryOptions,
    showError: retryOptions?.showError,
    customErrorMessage: retryOptions?.customErrorMessage
  })
}

/**
 * 快捷方法：获取用户详情
 */
export async function getUserDetail() {
  return await imRequest({
    url: ImUrlEnum.GET_USER_INFO_DETAIL
  })
}

/**
 * 快捷方法：获取群组详情
 */
export async function getGroupDetail(roomId: string) {
  return await imRequest({
    url: ImUrlEnum.GROUP_DETAIL,
    params: { id: roomId }
  })
}

/**
 * 快捷方法：获取联系人列表
 */
export async function getContactList(options?: { pageSize?: number; cursor?: string }) {
  return await imRequest({
    url: ImUrlEnum.GET_CONTACT_LIST,
    params: {
      pageSize: options?.pageSize || 100,
      cursor: options?.cursor || ''
    }
  })
}

/**
 * 快捷方法：获取申请未读数
 */
export async function getApplyUnreadCount() {
  return await imRequestSilent({
    url: ImUrlEnum.APPLY_UN_READ_COUNT
  })
}

/**
 * 快捷方法：批量获取用户信息
 */
export async function getUserInfoBatch(batchUsers: CacheUserReq[]) {
  return await imRequest({
    url: ImUrlEnum.GET_USER_INFO_BATCH,
    body: {
      reqList: batchUsers
    }
  })
}

/**
 * 快捷方法：获取群公告列表
 */
export async function getAnnouncementList(roomId: string, page: number, pageSize: number = 10) {
  return await imRequest({
    url: ImUrlEnum.GET_ANNOUNCEMENT_LIST,
    params: {
      roomId,
      current: page,
      size: pageSize
    }
  })
}

export async function getMsgReadCount(msgIds: number[]) {
  return await imRequest({
    url: ImUrlEnum.GET_MSG_READ_COUNT,
    params: {
      msgIds
    }
  })
}

export async function markMsgRead(roomId: string) {
  return await imRequest({
    url: ImUrlEnum.MARK_MSG_READ,
    body: {
      roomId
    }
  })
}

export async function getFriendPage(options?: { pageSize?: number; cursor?: string }) {
  return await imRequest({
    url: ImUrlEnum.GET_FRIEND_PAGE,
    params: {
      pageSize: options?.pageSize || 100,
      cursor: options?.cursor || ''
    }
  })
}

export async function getBadgeList() {
  return await imRequest({
    url: ImUrlEnum.GET_BADGE_LIST
  })
}

export async function getBadgesBatch(body: CacheBadgeReq[]) {
  return await imRequest({
    url: ImUrlEnum.GET_BADGES_BATCH,
    body: {
      reqList: body
    }
  })
}

export async function getMsgList(params: any) {
  return await imRequest({
    url: ImUrlEnum.GET_MSG_LIST,
    params
  })
}

export async function modifyUserName(body: { name: string }) {
  return await imRequest({
    url: ImUrlEnum.MODIFY_USER_NAME,
    body
  })
}

export async function setUserBadge(body: { badgeId: string }) {
  return await imRequest({
    url: ImUrlEnum.SET_USER_BADGE,
    body
  })
}

export async function markMsg(body: { msgId: string; markType: number; actType: number }) {
  return await imRequest({
    url: ImUrlEnum.MARK_MSG,
    body
  })
}

export async function blockUser(body: { uid: string; deadline: string }) {
  return await imRequest({
    url: ImUrlEnum.BLOCK_USER,
    body
  })
}

export async function recallMsg(body: { msgId: string; roomId: string }) {
  return await imRequest({
    url: ImUrlEnum.RECALL_MSG,
    body
  })
}

export async function addEmoji(body: { expressionUrl: string }) {
  return await imRequest({
    url: ImUrlEnum.ADD_EMOJI,
    body
  })
}

export async function deleteEmoji(body: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.DELETE_EMOJI,
    body
  })
}

export async function getEmoji() {
  return await imRequest({
    url: ImUrlEnum.GET_EMOJI
  })
}

export async function uploadAvatar(body: { avatar: string }) {
  return await imRequest({
    url: ImUrlEnum.UPLOAD_AVATAR,
    body
  })
}

export async function getAllUserState() {
  return await imRequest({
    url: ImUrlEnum.GET_ALL_USER_STATE
  })
}

export async function changeUserState(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.CHANGE_USER_STATE,
    params
  })
}

export async function searchFriend(params: { key: string }) {
  return await imRequest({
    url: ImUrlEnum.SEARCH_FRIEND,
    params
  })
}

export async function requestApplyPage(params: { pageSize: number; pageNo: number; cursor: string }) {
  return await imRequest({
    url: ImUrlEnum.REQUEST_APPLY_PAGE,
    params
  })
}

export async function sendAddFriendRequest(body: { targetUid: string; msg: string }) {
  return await imRequest({
    url: ImUrlEnum.SEND_ADD_FRIEND_REQUEST,
    body
  })
}

export async function handleInvite(body: { applyId: string; state: number }) {
  return await imRequest({
    url: ImUrlEnum.HANDLE_INVITE,
    body
  })
}

export async function deleteFriend(body: { targetUid: string }) {
  return await imRequest({
    url: ImUrlEnum.DELETE_FRIEND,
    body
  })
}

export async function modifyFriendRemark(body: { targetUid: string; remark: string }) {
  return await imRequest({
    url: ImUrlEnum.MODIFY_FRIEND_REMARK,
    body
  })
}

export async function createGroup(body: { uidList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.CREATE_GROUP,
    body
  })
}

export async function inviteGroupMember(body: { roomId: string; uidList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.INVITE_GROUP_MEMBER,
    body
  })
}

export async function removeGroupMember(body: { roomId: string; uid: string }) {
  return await imRequest({
    url: ImUrlEnum.REMOVE_GROUP_MEMBER,
    body
  })
}

export async function getSessionDetail(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.SESSION_DETAIL,
    params
  })
}

export async function getSessionDetailWithFriends(params: { id: string; roomType: number }) {
  return await imRequest({
    url: ImUrlEnum.SESSION_DETAIL_WITH_FRIENDS,
    params
  })
}

export async function setSessionTop(body: { roomId: string; top: boolean }) {
  return await imRequest({
    url: ImUrlEnum.SET_SESSION_TOP,
    body
  })
}

export async function deleteSession(body: { roomId: string }) {
  return await imRequest({
    url: ImUrlEnum.DELETE_SESSION,
    body
  })
}

export async function notification(body: { roomId: string; type: NotificationTypeEnum }) {
  return await imRequest({
    url: ImUrlEnum.NOTIFICATION,
    body
  })
}

export async function shield(body: { roomId: string; state: boolean }) {
  return await imRequest({
    url: ImUrlEnum.SHIELD,
    body
  })
}

export async function exitGroup(body: { roomId: string }) {
  return await imRequest({
    url: ImUrlEnum.EXIT_GROUP,
    body
  })
}

export async function addAdmin(body: { roomId: string; uidList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.ADD_ADMIN,
    body
  })
}

export async function revokeAdmin(body: { roomId: string; uidList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.REVOKE_ADMIN,
    body
  })
}

export async function groupList() {
  return await imRequest({
    url: ImUrlEnum.GROUP_LIST
  })
}

export async function updateRoomInfo(body: { id: string; name: string; avatar: string }) {
  return await imRequest({
    url: ImUrlEnum.UPDATE_ROOM_INFO,
    body
  })
}

export async function updateMyRoomInfo(body: { id: string; myName: string; remark: string }) {
  return await imRequest({
    url: ImUrlEnum.UPDATE_MY_ROOM_INFO,
    body
  })
}

export async function searchGroup(params: { account: string }) {
  return await imRequest({
    url: ImUrlEnum.SEARCH_GROUP,
    params
  })
}

export async function applyGroup(body: { account: string; msg: string }) {
  return await imRequest({
    url: ImUrlEnum.APPLY_GROUP,
    body
  })
}

export async function pushAnnouncement(body: { roomId: string; content: string; top: boolean }) {
  return await imRequest({
    url: ImUrlEnum.PUSH_ANNOUNCEMENT,
    body
  })
}

export async function deleteAnnouncement(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.DELETE_ANNOUNCEMENT,
    params
  })
}

export async function editAnnouncement(body: { id: string; roomId: string; content: string; top: boolean }) {
  return await imRequest({
    url: ImUrlEnum.EDIT_ANNOUNCEMENT,
    body
  })
}

export async function getCaptcha() {
  return await imRequest({
    url: ImUrlEnum.GET_CAPTCHA
  })
}

export async function sendCaptcha(body: {
  email: string
  uuid?: string
  operationType?: 'register' | 'forgot'
  templateCode: 'REGISTER_EMAIL' | 'REGISTER_SMS' | 'MOBILE_LOGIN' | 'MOBILE_EDIT' | 'EMAIL_EDIT' | 'PASSWORD_EDIT'
}) {
  return await imRequest({
    url: ImUrlEnum.SEND_CAPTCHA,
    body
  })
}

export async function initConfig() {
  return await imRequest({
    url: ImUrlEnum.INIT_CONFIG
  })
}

export async function getQiniuToken() {
  return await imRequest({
    url: ImUrlEnum.GET_QINIU_TOKEN
  })
}

export async function register(body: RegisterUserReq) {
  return await imRequest({
    url: ImUrlEnum.REGISTER,
    body
  })
}

export async function login(body: LoginUserReq) {
  return await imRequest({
    url: ImUrlEnum.LOGIN,
    body
  })
}

export async function logout(body: { autoLogin: boolean }) {
  return await imRequest({
    url: ImUrlEnum.LOGOUT,
    body
  })
}

export async function forgetPassword(body: {
  email: string
  code: string
  uuid: string
  password: string
  confirmPassword: string
  key: string
}) {
  return await imRequest({
    url: ImUrlEnum.FORGET_PASSWORD,
    body
  })
}
