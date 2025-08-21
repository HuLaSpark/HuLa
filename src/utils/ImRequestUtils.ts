import { ImUrlEnum } from '@/enums'
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
export async function getGroupDetail(groupId: string) {
  return await imRequest({
    url: ImUrlEnum.GROUP_DETAIL,
    params: { id: groupId }
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
export async function getUserInfoBatch(batchUsers: any[]) {
  return await imRequest({
    url: ImUrlEnum.GET_USER_INFO_BATCH,
    body: batchUsers
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
