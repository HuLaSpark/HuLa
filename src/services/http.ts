import { fetch } from '@tauri-apps/plugin-http'
import { AppException, ErrorType } from '@/common/exception'
import { RequestQueue } from '@/utils/RequestQueue'
import urls from './urls'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { URLEnum } from '@/enums'

// 错误信息常量
const ERROR_MESSAGES = {
  NETWORK: '网络连接异常，请检查网络设置',
  TIMEOUT: '请求超时，请稍后重试',
  OFFLINE: '当前网络已断开，请检查网络连接',
  ABORTED: '请求已取消',
  UNKNOWN: '请求失败，请稍后重试'
} as const

/**
 * @description 请求参数
 * @property {"GET"|"POST"|"PUT"|"DELETE"} method 请求方法
 * @property {Record<string, string>} [headers] 请求头
 * @property {Record<string, any>} [query] 请求参数
 * @property {any} [body] 请求体
 * @property {boolean} [isBlob] 是否为Blob
 * @property {RetryOptions} [retry] 重试选项
 * @property {boolean} [noRetry] 是否禁用重试
 * @return HttpParams
 */
export type HttpParams = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: any
  isBlob?: boolean
  retry?: RetryOptions // 重试选项
  noRetry?: boolean // 禁用重试
}

/**
 * @description 重试选项
 */
export type RetryOptions = {
  retries?: number
  retryDelay?: (attempt: number) => number
  retryOn?: number[]
}

/**
 * @description 等待指定的毫秒数
 * @param {number} ms 毫秒数
 * @returns {Promise<void>}
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @description 判断是否应进行下一次重试
 * @returns {boolean} 是否继续重试
 */
function shouldRetry(attempt: number, maxRetries: number, abort?: AbortController): boolean {
  return attempt + 1 < maxRetries && !abort?.signal.aborted
}

/**
 * TODO: 防止当有请求的时候突然退出登录，导致在登录窗口发生请求错误
 * 检查是否需要阻止请求
 * @param url 请求地址
 * @returns 是否需要阻止请求
 */
const shouldBlockRequest = async (url: string) => {
  try {
    const currentWindow = WebviewWindow.getCurrent()
    // TODO: 这里如果后续不需要token就可以发送请求还有在没有登录下的窗口都不需要阻止
    const isLoginWindow = currentWindow.label === 'login' || 'register' || 'forgetPassword' || 'tray'

    // 如果不是登录窗口,不阻止请求
    if (!isLoginWindow) return false

    // 登录相关的接口永远不阻止
    if (url.includes(URLEnum.TOKEN) || url.includes(URLEnum.CAPTCHA)) return false

    // 检查是否已登录成功(有双token)
    const hasToken = localStorage.getItem('TOKEN')
    const hasRefreshToken = localStorage.getItem('REFRESH_TOKEN')
    const isLoggedIn = hasToken && hasRefreshToken

    // 在登录窗口但已登录成功的情况下不阻止请求
    return !isLoggedIn
  } catch (error) {
    console.error('检查请求状态失败:', error)
    return false
  }
}

/**
 * @description HTTP 请求实现
 * @template T
 * @param {string} url 请求地址
 * @param {HttpParams} options 请求参数
 * @param {boolean} [fullResponse=false] 是否返回完整响应
 * @param {AbortController} abort 中断器
 * @returns {Promise<T | { data: T; resp: Response }>} 请求结果
 */
async function Http<T = any>(
  url: string,
  options: HttpParams,
  fullResponse: boolean = false,
  abort?: AbortController
): Promise<{ data: T; resp: Response } | T> {
  // 检查是否需要阻止请求
  const shouldBlock = await shouldBlockRequest(url)
  if (shouldBlock) {
    throw new AppException('在登录窗口中，取消非登录相关请求', {
      type: ErrorType.Network,
      showError: false
    })
  }

  // 打印请求信息
  console.log(`🚀 发起请求 → ${options.method} ${url}`, {
    body: options.body,
    query: options.query
  })

  // 默认重试配置，在登录窗口时禁用重试
  const defaultRetryOptions: RetryOptions = {
    retries: 3,
    retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
    retryOn: [] // 状态码意味着已经连接到服务器
  }

  // 合并默认重试配置与用户传入的重试配置
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    ...options.retry
  }

  const { retries = 3, retryDelay } = retryOptions

  // 获取token和指纹
  const token = localStorage.getItem('TOKEN')
  //const fingerprint = await getEnhancedFingerprint()

  // 构建请求头
  const httpHeaders = new Headers(options.headers || {})

  // 设置Content-Type
  if (!httpHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
    httpHeaders.set('Content-Type', 'application/json')
  }

  // 设置Authorization
  if (token) {
    httpHeaders.set('Authorization', `Bearer ${token}`)
  }

  // 设置浏览器指纹
  //if (fingerprint) {
  //httpHeaders.set('X-Device-Fingerprint', fingerprint)
  //}

  // 构建 fetch 请求选项
  const fetchOptions: RequestInit = {
    method: options.method,
    headers: httpHeaders,
    signal: abort?.signal
  }

  // 获取代理设置
  // const proxySettings = JSON.parse(localStorage.getItem('proxySettings') || '{}')
  // // 如果设置了代理，添加代理配置 (BETA)
  // if (proxySettings.type && proxySettings.ip && proxySettings.port) {
  //   // 使用 Rust 后端的代理客户端
  //   fetchOptions.proxy = {
  //     url: `${proxySettings.type}://${proxySettings.ip}:${proxySettings.port}`
  //   }
  // }

  // 判断是否需要添加请求体
  if (options.body) {
    if (!(options.body instanceof FormData || options.body instanceof URLSearchParams)) {
      fetchOptions.body = JSON.stringify(options.body)
    } else {
      fetchOptions.body = options.body // 如果是 FormData 或 URLSearchParams 直接使用
    }
  }

  // 添加查询参数
  if (options.query) {
    const queryString = new URLSearchParams(options.query).toString()
    url += `?${queryString}`
  }

  // 定义重试函数
  let tokenRefreshCount = 0 // 在闭包中存储计数器
  async function attemptFetch(currentAttempt: number): Promise<{ data: T; resp: Response } | T> {
    try {
      const response = await fetch(url, fetchOptions)

      // 先判断是否连接到服务器，fetch请求是否成功，如果不成功那么就是本地客户端网络异常
      if (!response.ok) {
        throw new AppException(`HTTP error! status: ${response.status}`, {
          type: ErrorType.Network,
          code: response.status,
          details: { url, method: options.method }
        })
      }

      // 解析响应数据
      const responseData = options.isBlob ? await response.arrayBuffer() : await response.json()

      // 判断服务器返回的错误码进行操作
      switch (responseData.code) {
        case 401: {
          console.log('🔄 Token无效，清除token并重新登录...')
          // 触发重新登录事件
          window.dispatchEvent(new Event('needReLogin'))
          break
        }
        case 403: {
          console.log('🤯 权限不足')
          break
        }
        case 422: {
          break
        }
        case 40004: {
          // 限制token刷新重试次数，最多重试一次
          if (tokenRefreshCount >= 1) {
            console.log('🚫 Token刷新重试次数超过限制，退出重试')
            window.dispatchEvent(new Event('needReLogin'))
            throw new AppException('Token刷新失败', {
              type: ErrorType.TokenExpired,
              showError: true
            })
          }

          try {
            console.log('🔄 开始尝试刷新Token并重试请求')
            const newToken = await refreshTokenAndRetry()
            // 使用新token重试当前请求
            httpHeaders.set('Authorization', `Bearer ${newToken}`)
            console.log('🔄 使用新Token重试原请求')
            // 增加计数器
            tokenRefreshCount++
            return attemptFetch(currentAttempt)
          } catch (refreshError) {
            // 续签出错也触发重新登录
            window.dispatchEvent(new Event('needReLogin'))
            throw refreshError
          }
        }
      }

      // 如果fecth请求成功，但是服务器请求不成功并且返回了错误，那么就抛出错误
      if (responseData && !responseData.success) {
        throw new AppException(responseData.msg || '服务器返回错误', {
          type: ErrorType.Server,
          code: response.status,
          details: responseData,
          showError: true
        })
      }

      // 打印响应结果
      console.log(`✅ 请求成功 → ${options.method} ${url}`, {
        status: response.status,
        data: responseData
      })

      // 若请求成功且没有业务错误
      if (fullResponse) {
        return { data: responseData, resp: response }
      }
      return responseData
    } catch (error: any) {
      // 优化错误日志，仅在开发环境打印详细信息
      if (import.meta.env.DEV) {
        console.error(`尝试 ${currentAttempt + 1} 失败 →`, error)
      }

      // 处理网络相关错误
      if (
        error instanceof TypeError || // fetch 的网络错误会抛出 TypeError
        error.name === 'AbortError' || // 请求被中断
        !navigator.onLine // 浏览器离线
      ) {
        // 获取用户友好的错误信息
        const errorMessage = getNetworkErrorMessage(error)

        if (shouldRetry(currentAttempt, retries, abort)) {
          console.warn(`${errorMessage}，准备重试 → 第 ${currentAttempt + 2} 次尝试`)
          const delayMs = retryDelay ? retryDelay(currentAttempt) : 1000
          await wait(delayMs)
          return attemptFetch(currentAttempt + 1)
        }

        // 重试次数用完，抛出友好的错误信息
        throw new AppException(errorMessage, {
          type: ErrorType.Network,
          details: { attempts: currentAttempt + 1 },
          showError: true,
          isRetryError: true
        })
      }

      // 未知错误，使用友好的错误提示
      throw new AppException(ERROR_MESSAGES.UNKNOWN, {
        type: error instanceof TypeError ? ErrorType.Network : ErrorType.Unknown,
        details: { attempts: currentAttempt + 1 },
        showError: true,
        isRetryError: true
      })
    }
  }

  // 添加获取网络错误信息的辅助函数
  function getNetworkErrorMessage(error: any): string {
    if (!navigator.onLine) {
      return ERROR_MESSAGES.OFFLINE
    }

    if (error.name === 'AbortError') {
      return ERROR_MESSAGES.ABORTED
    }

    // 检查是否包含超时关键词
    if (error.message?.toLowerCase().includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT
    }

    return ERROR_MESSAGES.NETWORK
  }

  // 第一次执行，attempt=0
  return attemptFetch(0)
}

// 添加一个标记,避免多个请求同时刷新token
let isRefreshing = false
// 使用队列实现
const requestQueue = new RequestQueue()
async function refreshTokenAndRetry(): Promise<string> {
  if (isRefreshing) {
    console.log('🔄 已有刷新请求在进行中，加入等待队列')
    return new Promise((resolve) => {
      // 可以根据请求类型设置优先级
      requestQueue.enqueue(resolve, 1)
    })
  }

  isRefreshing = true
  try {
    const refreshToken = localStorage.getItem('REFRESH_TOKEN')
    if (!refreshToken) {
      console.error('❌ 无刷新令牌')
      throw new Error('无刷新令牌')
    }

    console.log('📤 正在使用refreshToken获取新的token')
    const response = await fetch(urls.refreshToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`
      },
      body: JSON.stringify({ refreshToken })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      // 重新登录
      window.dispatchEvent(new Event('needReLogin'))
      throw new Error('刷新令牌失败')
    }
    const { token, refreshToken: newRefreshToken } = data.data

    console.log('🔑 Token刷新成功，更新存储', data)
    // 更新本地存储的token 知道
    localStorage.setItem('TOKEN', token)
    localStorage.setItem('REFRESH_TOKEN', newRefreshToken)

    // 使用队列处理方式
    await requestQueue.processQueue(token)

    return token
  } catch (error) {
    console.error('❌ 刷新Token过程出错:', error)
    requestQueue.clear() // 发生错误时清空队列
    window.dispatchEvent(new Event('needReLogin'))
    throw error
  } finally {
    isRefreshing = false
  }
}

export default Http
