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
}

/**
 * @description HTTP 请求实现
 * @since Beta v0.5.1
 * @template T
 * @param {string} url 请求地址
 * @param {HttpParams} options 请求参数
 * @param {boolean} [fullResponse=false] 是否返回完整响应
 * @param {AbortController} abort 中断器
 * @returns {Promise<T | { data: Promise<T>; resp: Response }>} 请求结果
 */
async function Http<T>(
  url: string,
  options: HttpParams,
  fullResponse?: true,
  abort?: AbortController
): Promise<{ data: Promise<T>; resp: Response }> {
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
  // console.log(url)
  // console.log(fetchOptions.headers)
  try {
    const res = await fetch(url, fetchOptions)
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const data = options.isBlob ? await res.arrayBuffer() : await res.json()
    console.log(url)
    console.log(data)

    if (fullResponse) {
      return { data, resp: res }
    }

    return data
  } catch (err) {
    console.error('HTTP request failed: ', err)
    throw err // 继续抛出错误以便调用方处理
  }
}

export default Http
