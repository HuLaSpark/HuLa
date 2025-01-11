import { fetch } from '@tauri-apps/plugin-http'

/**
 * @description 请求参数
 * @property {"GET"|"POST"|"PUT"|"DELETE"} method 请求方法
 * @property {Record<string, string>} [headers] 请求头
 * @property {Record<string, any>} [query] 请求参数
 * @property {any} [body] 请求体
 * @property {boolean} [isBlob] 是否为Blob
 * @return HttpParams
 */
export type HttpParams = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: any
  isBlob?: boolean
  retry?: RetryOptions // 新增重试选项
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
 * @description HTTP 请求实现
 * @template T
 * @param {string} url 请求地址
 * @param {HttpParams} options 请求参数
 * @param {boolean} [fullResponse=false] 是否返回完整响应
 * @param {AbortController} abort 中断器
 * @returns {Promise<T | { data: Promise<T>; resp: Response }>} 请求结果
 */
async function Http<T = any>(
  url: string,
  options: HttpParams,
  fullResponse: boolean = false,
  abort?: AbortController
): Promise<{ data: T; resp: Response } | T> {
  // 默认重试配置
  const defaultRetryOptions: RetryOptions = {
    retries: 3,
    retryDelay: (attempt) => Math.pow(2, attempt) * 1000, // 指数退避策略
    retryOn: [500, 502, 503, 504]
  }

  // 合并默认重试配置与用户传入的重试配置
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    ...options.retry
  }

  const { retries, retryDelay, retryOn } = retryOptions

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

  // 打印请求头内容
  console.log(...httpHeaders)

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
  async function attemptFetch(attempt: number): Promise<{ data: T; resp: Response } | T> {
    try {
      const res = await fetch(url, fetchOptions)
      if (!res.ok) {
        // 如果状态码在重试列表中，则抛出错误以触发重试
        if (!retryOn || retryOn.includes(res.status)) {
          throw new FetchRetryError(`HTTP error! status: ${res.status}`, res.status)
        } else {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
      }
      const data = options.isBlob ? await res.arrayBuffer() : await res.json()

      console.log(url)
      console.log(data)

      if (fullResponse) {
        return { data, resp: res }
      }

      return data
    } catch (err) {
      // 检查是否达到最大重试次数
      if (!retries || attempt >= retries) {
        console.error(`HTTP request to ${url} failed after ${attempt} attempts: `, err)
        throw err
      }

      // 检查是否是被中断的请求
      if (abort?.signal.aborted) {
        console.error(`HTTP request to ${url} was aborted.`)
        throw new Error('Request aborted')
      }

      const delay = retryDelay ? retryDelay(attempt) : 1000
      console.warn(`Retrying request to ${url} (attempt ${attempt + 1} after ${delay}ms)...`)
      await wait(delay)
      return attemptFetch(attempt + 1)
    }
  }

  // 开始第一次尝试
  return attemptFetch(0)
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
 * @description 自定义错误类，用于标识需要重试的 HTTP 错误
 */
class FetchRetryError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'FetchRetryError'
  }
}

export default Http
