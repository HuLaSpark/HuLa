import { ImUrlEnum, TauriCommand, type NotificationTypeEnum } from '@/enums'
import type { CacheBadgeReq, LoginUserReq, ModifyUserInfoType, RegisterUserReq, UserItem } from '@/services/types'
import { ErrorType, invokeSilently, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { useChatStore } from '../stores/chat'
import { useGroupStore } from '../stores/group'

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
 *   url: ImUrlEnum.NOTICE_UN_READ_COUNT
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
 * 获取群组基础信息 [没进群的人、逻辑删除的群也可以查询]
 */
export async function getGroupInfo(roomId: string) {
  return await imRequest({
    url: ImUrlEnum.GROUP_INFO,
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
 * 获取通知未读数
 */
export async function getNoticeUnreadCount() {
  return await imRequestSilent({
    url: ImUrlEnum.NOTICE_UN_READ_COUNT
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

export async function groupListMember(roomId: string) {
  const args: Record<string, any> = { roomId, room_id: roomId }
  return await invokeWithErrorHandler(TauriCommand.GET_ROOM_MEMBERS, args, { errorType: ErrorType.Network })
}

export async function getMsgList(body: { msgIds?: string[]; async?: boolean }) {
  return await imRequest({
    url: ImUrlEnum.GET_MSG_LIST,
    body
  })
}

export async function ModifyUserInfo(body: ModifyUserInfoType) {
  return await imRequest({
    url: ImUrlEnum.MODIFY_USER_INFO,
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

export async function sendAddFriendRequest(body: { targetUid: string; msg: string }) {
  return await imRequest({
    url: ImUrlEnum.SEND_ADD_FRIEND_REQUEST,
    body
  })
}

export async function requestNoticePage(params: {
  pageSize: number
  pageNo: number
  cursor: string
  click: boolean
  applyType: string
}) {
  return await imRequest({
    url: ImUrlEnum.REQUEST_NOTICE_PAGE,
    params
  })
}

export async function requestNoticeRead(body: { noticeIdList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.REQUEST_NOTICE_READ,
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

export async function removeGroupMember(body: { roomId: string; uidList: string[] }) {
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

export async function updateRoomInfo(body: { id: string; name?: string; avatar?: string; allowScanEnter?: boolean }) {
  const chatStore = useChatStore()
  const groupStore = useGroupStore()

  body.name = body.name ?? groupStore.countInfo!.groupName
  body.avatar = body.avatar ?? groupStore.countInfo!.avatar
  body.allowScanEnter = body.allowScanEnter ?? groupStore.countInfo!.allowScanEnter

  await imRequest({
    url: ImUrlEnum.UPDATE_ROOM_INFO,
    body
  })

  chatStore.updateSession(body.id, body)
  groupStore.updateGroupDetail(body.id, body)

  window.$message.success('更新成功')
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

export async function applyGroup(body: { account: string; msg: string; type: number }) {
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

export async function getAnnouncementDetail(params: { roomId: string; announcementId: string }) {
  return await imRequest({
    url: ImUrlEnum.ANNOUNCEMENT,
    params
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

export async function mergeMsg(body: { fromRoomId: string; type: number; roomIds: string[]; messageIds: string[] }) {
  return await imRequest({
    url: ImUrlEnum.MERGE_MSG,
    body
  })
}

export async function getUserByIds(uidList: string[]): Promise<UserItem[]> {
  return await imRequest({
    url: ImUrlEnum.GET_USER_BY_IDS,
    body: { uidList }
  })
}

export async function generateQRCode(): Promise<UserItem[]> {
  return await imRequest({
    url: ImUrlEnum.GENERATE_QR_CODE
  })
}

export async function checkQRStatus(params: {
  qrId: string
  clientId: string
  deviceHash: string
  deviceType: string
}): Promise<UserItem[]> {
  return await imRequest(
    {
      url: ImUrlEnum.CHECK_QR_STATUS,
      params
    },
    {
      showError: false
    }
  )
}

// 扫描二维码
export async function scanQRCodeAPI(data: { qrId: string }) {
  return await imRequest({
    url: ImUrlEnum.SCAN_QR_CODE,
    body: data
  })
}

// 确认登录
export async function confirmQRCodeAPI(data: { qrId: string }) {
  return await imRequest({
    url: ImUrlEnum.CONFIRM_QR_CODE,
    body: data
  })
}

// 查看单条朋友圈
export async function feedDetail(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_DETAIL,
    params
  })
}

export async function feedList(data: { pageSize?: number; cursor?: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_LIST,
    body: data
  })
}

export async function pushFeed(data: {
  content: string // 朋友圈文案
  mediaType: 0 | 1 | 2 // 媒体类型, 0-纯文本内容,1-图片加内容,2-视频加内容
  urls?: string[] // 图片URL列表
  videoUrl?: string // 视频URL
  permission: 'privacy' | 'open' | 'partVisible' | 'notAnyone' // 可见性权限
  uidList?: number[] // 权限限制的用户ID列表
  targetIds?: number[] // 权限限制的标签ID列表
}) {
  return await imRequest({
    url: ImUrlEnum.PUSH_FEED,
    body: data
  })
}

export async function delFeed(data: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.DEL_FEED,
    body: data
  })
}

export async function editFeed(data: {
  id: number // 朋友圈ID
  content: string // 朋友圈文案
  mediaType: 0 | 1 | 2 // 媒体类型
  urls?: string[] // 图片URL列表
  videoUrl?: string // 视频URL
  permission: 'privacy' | 'open' | 'partVisible' | 'notAnyone' // 可见性权限
  uidList?: number[] // 权限限制的用户ID列表
  targetIds?: number[] // 权限限制的标签ID列表
}) {
  return await imRequest({
    url: ImUrlEnum.EDIT_FEED,
    body: data
  })
}

export async function getFeedPermission(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.GET_FEED_PERMISSION,
    params
  })
}

// ==================== 朋友圈点赞相关 ====================

export async function feedLikeToggle(data: { feedId: string; actType: number }) {
  return await imRequest({
    url: ImUrlEnum.FEED_LIKE_TOGGLE,
    body: data
  })
}

export async function feedLikeList(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_LIKE_LIST,
    params
  })
}

export async function feedLikeCount(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_LIKE_COUNT,
    params
  })
}

export async function feedLikeHasLiked(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_LIKE_HAS_LIKED,
    params
  })
}

// ==================== 朋友圈评论相关 ====================

export async function feedCommentAdd(data: {
  feedId: string
  content: string
  replyCommentId?: string
  replyUid?: string
}) {
  return await imRequest({
    url: ImUrlEnum.FEED_COMMENT_ADD,
    body: data
  })
}

export async function feedCommentDelete(data: { commentId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_COMMENT_DELETE,
    body: data
  })
}

export async function feedCommentList(data: { feedId: string; pageSize?: number; cursor?: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_COMMENT_LIST,
    body: data
  })
}

export async function feedCommentCount(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_COMMENT_COUNT,
    params
  })
}

export async function feedCommentAll(params: { feedId: string }) {
  return await imRequest({
    url: ImUrlEnum.FEED_COMMENT_ALL,
    params
  })
}

/**
 * SSE 流式数据事件类型
 */
interface SseStreamEvent {
  eventType: 'chunk' | 'done' | 'error'
  data?: string
  error?: string
  requestId: string
}

/**
 * 流式数据回调函数
 */
export interface StreamCallbacks {
  onChunk?: (chunk: string) => void
  onDone?: (fullContent: string) => void
  onError?: (error: string) => void
}

/**
 * 发送AI消息（流式）
 * 使用 Promise 包装整个 SSE 流程，监听 Tauri 事件接收流式数据
 *
 * @param body 请求参数
 * @param callbacks 流式数据回调函数
 * @returns Promise，在流结束后 resolve 完整内容
 */
export async function messageSendStream(
  body: { conversationId: string; content: string; useContext?: boolean },
  callbacks?: StreamCallbacks
): Promise<string> {
  const { invoke, Channel } = await import('@tauri-apps/api/core')
  const { TauriCommand } = await import('@/enums')

  // 生成唯一的请求 ID
  const requestId = `ai-stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  return new Promise<string>((resolve, reject) => {
    let fullContent = ''
    let isResolved = false

    // 创建 Channel 用于接收流式事件
    const onEvent = new Channel<SseStreamEvent>()
    onEvent.onmessage = (event: SseStreamEvent) => {
      const { eventType, data, error, requestId: eventRequestId } = event

      // 只处理当前请求的事件
      if (eventRequestId !== requestId) {
        return
      }

      switch (eventType) {
        case 'chunk':
          if (data) {
            fullContent += data
            callbacks?.onChunk?.(data)
          }
          break

        case 'done':
          if (!isResolved) {
            isResolved = true
            const finalContent = data || fullContent
            callbacks?.onDone?.(finalContent)
            resolve(finalContent)
          }
          break

        case 'error':
          if (!isResolved) {
            isResolved = true
            const errorMsg = error || '未知错误'
            callbacks?.onError?.(errorMsg)
            reject(new Error(errorMsg))
          }
          break
      }
    }

    // 调用 Rust 后端命令发送请求
    invoke(TauriCommand.AI_MESSAGE_SEND_STREAM, {
      body,
      requestId,
      onEvent
    }).catch((error) => {
      if (!isResolved) {
        isResolved = true
        const errorMsg = error instanceof Error ? error.message : String(error)
        callbacks?.onError?.(errorMsg)
        reject(error)
      }
    })
  })
}

// 获得指定对话的消息列表
export async function messageListByConversationId(params: {
  conversationId: string
  pageNo?: number
  pageSize?: number
}) {
  return await imRequest({
    url: ImUrlEnum.MESSAGE_LIST_BY_CONVERSATION_ID,
    params
  })
}

// 删除单条消息
export async function messageDelete(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.MESSAGE_DELETE,
    params
  })
}

// 删除指定对话的消息
export async function messageDeleteByConversationId(body: { conversationIdList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.MESSAGE_DELETE_BY_CONVERSATION_ID,
    body
  })
}

// 获取会话列表（我的）
export async function conversationPage(params?: { pageNo?: number; pageSize?: number }) {
  return await imRequest({
    url: ImUrlEnum.CONVERSATION_PAGE,
    params
  })
}

// 获得【我的】聊天对话
export async function conversationGetMy(params?: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.CONVERSATION_GET_MY,
    params
  })
}

// 创建会话（我的）
export async function conversationCreateMy(body: {
  roleId?: string
  knowledgeId?: string
  title?: string
  modelId?: string
  systemMessage?: string
  temperature?: number
  maxTokens?: number
  maxContexts?: number
}) {
  return await imRequest({
    url: ImUrlEnum.CONVERSATION_CREATE_MY,
    body
  })
}

// 更新会话（我的）
export async function conversationUpdateMy(body: {
  id: string
  title?: string
  pinned?: boolean
  roleId?: string
  modelId?: string
  knowledgeId?: string
  systemMessage?: string
  temperature?: number
  maxTokens?: number
  maxContexts?: number
}) {
  return await imRequest({
    url: ImUrlEnum.CONVERSATION_UPDATE_MY,
    body
  })
}

// 删除会话（我的）- 支持批量删除
export async function conversationDeleteMy(body: { conversationIdList: string[] }) {
  return await imRequest({
    url: ImUrlEnum.CONVERSATION_DELETE_MY,
    body
  })
}

// 模型页面
export async function modelPage(params?: { pageNo?: number; pageSize?: number }) {
  return await imRequest({
    url: ImUrlEnum.MODEL_PAGE,
    params
  })
}

// 更新模型
export async function modelUpdate(body: {
  id?: string
  keyId: string
  name: string
  model: string
  platform: string
  type: number
  sort: number
  status: number
  temperature?: number
  maxTokens?: number
  maxContexts?: number
  publicStatus?: boolean
}) {
  return await imRequest({
    url: body.id ? ImUrlEnum.MODEL_UPDATE : ImUrlEnum.MODEL_CREATE,
    body
  })
}

// 删除模型
export async function modelDelete(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.MODEL_DELETE,
    params
  })
}

// ==================== API 密钥管理 ====================

// API 密钥分页列表
export async function apiKeyPage(params?: { pageNo?: number; pageSize?: number }) {
  return await imRequest({
    url: ImUrlEnum.API_KEY_PAGE,
    params
  })
}

// API 密钥简单列表（用于下拉选择）
export async function apiKeySimpleList() {
  return await imRequest({
    url: ImUrlEnum.API_KEY_SIMPLE_LIST
  })
}

// 创建 API 密钥
export async function apiKeyCreate(body: {
  name: string
  apiKey: string
  platform: string
  url?: string
  status: number
}) {
  return await imRequest({
    url: ImUrlEnum.API_KEY_CREATE,
    body
  })
}

// 更新 API 密钥
export async function apiKeyUpdate(body: {
  id: string
  name: string
  apiKey: string
  platform: string
  url?: string
  status: number
}) {
  return await imRequest({
    url: ImUrlEnum.API_KEY_UPDATE,
    body
  })
}

// 删除 API 密钥
export async function apiKeyDelete(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.API_KEY_DELETE,
    params
  })
}

// 查询 API 密钥余额
export async function apiKeyBalance(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.API_KEY_BALANCE,
    params
  })
}

// ==================== 聊天角色管理 ====================

// 聊天角色分页列表
export async function chatRolePage(params?: { pageNo?: number; pageSize?: number }) {
  return await imRequest({
    url: ImUrlEnum.CHAT_ROLE_PAGE,
    params
  })
}

// 聊天角色类别列表
export async function chatRoleCategoryList() {
  return await imRequest({
    url: ImUrlEnum.CHAT_ROLE_CATEGORY_LIST
  })
}

// 创建聊天角色
export async function chatRoleCreate(body: {
  modelId?: string
  name: string
  avatar: string
  category: string
  sort: number
  description: string
  systemMessage: string
  knowledgeIds?: string[]
  toolIds?: string[]
  publicStatus: boolean
  status: number
}) {
  return await imRequest({
    url: ImUrlEnum.CHAT_ROLE_CREATE,
    body
  })
}

// 更新聊天角色
export async function chatRoleUpdate(body: {
  id: string
  modelId?: string
  name: string
  avatar: string
  category: string
  sort: number
  description: string
  systemMessage: string
  knowledgeIds?: string[]
  toolIds?: string[]
  publicStatus: boolean
  status: number
}) {
  return await imRequest({
    url: ImUrlEnum.CHAT_ROLE_UPDATE,
    body
  })
}

// 删除聊天角色
export async function chatRoleDelete(params: { id: string }) {
  return await imRequest({
    url: ImUrlEnum.CHAT_ROLE_DELETE,
    params
  })
}
