import { useSettingStore } from '@/stores/setting.ts'
import Http, { HttpParams } from './http.ts'
import { ServiceResponse } from '@/services/types.ts'

function getToken() {
  let tempToken = ''
  return {
    get() {
      if (tempToken) return tempToken
      const token = localStorage.getItem('TOKEN')
      if (token) {
        tempToken = token
      }
      return tempToken
    },
    clear() {
      tempToken = ''
    }
  }
}

export const computedToken = getToken()

// fetch 请求响应拦截器
const responseInterceptor = async <T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  query: any,
  body: any
): Promise<T> => {
  const token = useSettingStore().login.accountInfo.token

  const headers = {
    'Content-Type': 'application/json;charset=utf-8',
    Authorization: `Bearer ${token}`
  }

  let httpParams: HttpParams = {
    method,
    headers
  }

  if (method === 'GET') {
    httpParams = {
      ...httpParams,
      query
    }
  } else {
    url = `${url}?${new URLSearchParams(query).toString()}`
    httpParams = {
      ...httpParams,
      body
    }
  }

  try {
    const data = await Http(url, httpParams, true)

    const resp = data.resp
    const serviceData = (await data.data) as ServiceResponse
    console.log(data)
    //检查发送请求是否成功
    if (resp.status > 400) {
      let message = ''
      switch (resp.status) {
        case 400:
          message = '错误请求'
          break
        case 401:
          message = '未授权，请重新登录'
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求错误,未找到该资源'
          window.location.href = '/NotFound'
          break
        case 405:
          message = '请求方法未允许'
          break
        case 408:
          message = '请求超时'
          break
        case 500:
          message = '服务器端出错'
          break
        case 501:
          message = '网络未实现'
          break
        case 502:
          message = '网络错误'
          break
        case 503:
          message = '服务不可用'
          break
        case 504:
          message = '网络超时'
          break
        case 505:
          message = 'http版本不支持该请求'
          break
        default:
          message = '连接错误'
      }
      return Promise.reject(`err: ${message}, status: ${resp.status}`)
    }
    //检查服务端返回是否成功，并且中断请求
    if (!serviceData.success) {
      window.$message.error(serviceData.errMsg)
      return Promise.reject(`http error: ${serviceData.errMsg}`)
    }
    return Promise.resolve(serviceData.data)
  } catch (err) {
    return Promise.reject(`http error: ${err}`)
  }
}

const get = async <T>(url: string, query: T): Promise<T> => {
  return responseInterceptor(url, 'GET', query, {})
}

const post = async <T>(url: string, params: any): Promise<T> => {
  return responseInterceptor(url, 'POST', {}, params)
}

const put = async <T>(url: string, params: any): Promise<T> => {
  return responseInterceptor(url, 'PUT', {}, params)
}

const del = async <T>(url: string, params: any): Promise<T> => {
  return responseInterceptor(url, 'DELETE', {}, params)
}

export default {
  get,
  post,
  put,
  delete: del
}
