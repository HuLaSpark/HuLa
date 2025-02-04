import { fetch } from '@tauri-apps/plugin-http'
import { AppException, ErrorType } from '../common/exception'

/**
 * @description 请求参数
 * @property {"GET"|"POST"|"PUT"|"DELETE"} method 请求方法
 * @property {Record<string, string>} [headers] 请求头
 * @property {Record<string, any>} [query] 请求参数
 * @property {any} [body] 请求体
 * @property {boolean} [isBlob] 是否为Blob
 * @property {boolean} [noRetry] 是否禁用重试
 * @return HttpParams
 */
export type HttpParams = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: any
  isBlob?: boolean
  retry?: RetryOptions // 新增重试选项
  noRetry?: boolean // 新增禁用重试选项
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
 * @description 自定义错误类，用于标识需要重试的 HTTP 错误
 */
class FetchRetryError extends Error {
  status: number
  type: ErrorType
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'FetchRetryError'
    this.type = status >= 500 ? ErrorType.Server : ErrorType.Network
  }
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
  // 打印请求信息
  console.log(`🚀 发起请求 → ${options.method} ${url}`, {
    body: options.body,
    query: options.query
  })

  // 默认重试配置
  const defaultRetryOptions: RetryOptions = {
    retries: options.noRetry ? 0 : 3, // 如果设置了noRetry，则不进行重试
    retryDelay: (attempt) => Math.pow(2, attempt) * 1000, // 指数退避策略
    retryOn: [500, 502, 503, 504]
  }

  // 合并默认重试配置与用户传入的重试配置
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    ...options.retry
  }

  const { retries = 3, retryDelay, retryOn } = retryOptions

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
  // 如果设置了代理，添加代理配置 (BETA)
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

  // 拼接 API 基础路径
  //url = `${import.meta.env.VITE_SERVICE_URL}${url}`

  // 定义重试函数
  async function attemptFetch(currentAttempt: number): Promise<{ data: T; resp: Response } | T> {
    try {
      const response = await fetch(url, fetchOptions)
      // 若响应不 OK 并且状态码属于需重试列表，则抛出 FetchRetryError
      if (!response.ok) {
        const errorType = getErrorType(response.status)
        if (!retryOn || retryOn.includes(response.status)) {
          throw new FetchRetryError(`HTTP error! status: ${response.status}`, response.status)
        }
        // 如果是非重试状态码，则抛出带有适当错误类型的 AppException
        throw new AppException(`HTTP error! status: ${response.status}`, {
          type: errorType,
          code: response.status,
          details: { url, method: options.method }
        })
      }

      // 解析响应数据
      const responseData = options.isBlob ? await response.arrayBuffer() : await response.json()

      // 打印响应结果
      console.log(`✅ 请求成功 → ${options.method} ${url}`, {
        status: response.status,
        data: responseData
      })

      // 若有success === false，需要重试
      if (responseData && responseData.success === false) {
        const errorMessage = responseData.errMsg || '服务器返回错误'
        window.$message?.error?.(errorMessage)
        throw new AppException(errorMessage, {
          type: ErrorType.Server,
          code: response.status,
          details: responseData
        })
      }

      // 若请求成功且没有业务错误
      if (fullResponse) {
        return { data: responseData, resp: response }
      }
      return responseData
    } catch (error) {
      console.error(`尝试 ${currentAttempt + 1} 失败的 →`, error)

      // 检查是否仍需重试
      if (!shouldRetry(currentAttempt, retries, abort)) {
        console.error(`Max retries reached or aborted. Request failed → ${url}`)
        if (error instanceof FetchRetryError) {
          window.$message?.error?.(error.message || '网络请求失败')
          throw new AppException(error.message, {
            type: error.type,
            code: error.status,
            details: { url, attempts: currentAttempt + 1 }
          })
        }
        if (error instanceof AppException) {
          window.$message?.error?.(error.message || '请求出错')
          throw error
        }
        const errorMessage = String(error) || '未知错误'
        window.$message?.error?.(errorMessage)
        throw new AppException(errorMessage, {
          type: ErrorType.Unknown,
          details: { url, attempts: currentAttempt + 1 }
        })
      }

      // 若需继续重试
      const delayMs = retryDelay ? retryDelay(currentAttempt) : 1000
      console.warn(`Retrying request → ${url} (next attempt: ${currentAttempt + 2}, waiting ${delayMs}ms)`)
      await wait(delayMs)
      return attemptFetch(currentAttempt + 1)
    }
  }

  // 辅助函数：根据HTTP状态码确定错误类型
  function getErrorType(status: number): ErrorType {
    if (status >= 500) return ErrorType.Server
    if (status === 401 || status === 403) return ErrorType.Authentication
    if (status === 400 || status === 422) return ErrorType.Validation
    if (status >= 400) return ErrorType.Client
    return ErrorType.Network
  }

  // 第一次执行，attempt=0
  return attemptFetch(0)
}

export default Http
