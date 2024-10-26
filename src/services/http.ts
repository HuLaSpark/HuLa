import { fetch } from '@tauri-apps/plugin-http'

/**
 * @description 请求参数
 * @since Beta v0.5.1
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
 * @returns {Promise<T | { data: Promise<T>; resp: Response }>} 请求结果
 */
async function Http<T>(
  url: string,
  options: HttpParams,
  fullResponse?: true
): Promise<{ data: Promise<T>; resp: Response }> {
  // 构建请求头
  const httpHeaders = new Headers(options.headers || {})

  // 构建 fetch 请求选项
  const fetchOptions: RequestInit = {
    method: options.method,
    headers: httpHeaders
  }

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
  url = `${import.meta.env.VITE_SERVICE_URL}${url}`

  console.log('fetch url: ', url)
  console.log('fetch options: ', fetchOptions)

  try {
    const res = await fetch(url, fetchOptions)

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = options.isBlob ? res.arrayBuffer() : res.json()

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

// import { fetch } from '@tauri-apps/plugin-http';
// import * as qs from 'qs';

// const isAbsoluteURL = (url: string) => {
//   return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
// };

// const combineURLs = (baseURL: string, relativeURL: string) => {
//   return relativeURL
//     ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
//     : baseURL;
// };

// const buildFullPath = (baseURL: string, requestedURL: string) => {
//   if (baseURL && !isAbsoluteURL(requestedURL)) {
//     return combineURLs(baseURL, requestedURL);
//   }
//   return requestedURL;
// };

// const buildURL = (url: string | string[], params: any) => {
//   if (!params) {
//     return url;
//   }
//   const serializedParams = qs.stringify(params);
//   if (serializedParams) {
//     url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
//   }
//   return url;
// };

// const server = '';
// const baseURL = `${server}/api/`;

// const BODY_TYPE = {
//   Form: 'Form',
//   Json: 'Json',
//   Text: 'Text',
//   Bytes: 'Bytes',
// };

// const commonOptions = {
//   timeout: 60,
// };

// const http = (url: string, options: any = {}) => {
//   const params = { ...options.params };
//   if (!options.headers) options.headers = {};
//   // todo 可以往 headers 中添加 token 或 cookie 等信息

//   if (options?.body) {
//     if (options.body.type === BODY_TYPE.Form) {
//       options.headers['Content-Type'] = 'multipart/form-data';
//     }
//   }

//   options = { ...commonOptions, ...options };
//   let fetchUrl:string = buildFullPath(baseURL, url)
//   return fetch(<string>buildURL(fetchUrl, params), options)
//     .then((res: any) => {
//       const { status, data } = res
//       if (status >= 200 && status < 400) {
//         return { data };
//       }
//       return Promise.reject({ status, data });
//     })
//     .catch((err) => {
//       console.error(err);
//       return Promise.reject(err);
//     });
// };

// export default http;
