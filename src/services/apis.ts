import { createAxios } from '@/services/request'
import urls from '@/services/urls'
import type { Response } from '@/services/types'

const request = createAxios()

const GET = <T>(url: string, params?: any) => request.get<T, Response>(url, params)
// const POST = <T>(url: string, params?: any) => request.post<T, Response>(url, params)
// const PUT = <T>(url: string, params?: any) => request.put<T, Response>(url, params)
// const DELETE = <T>(url: string, params?: any) => request.delete<T, Response>(url, params)

export default {
  /** 获取用户信息 */
  getUserInfo: (): Promise<Response> => GET(urls.getUserInfo),
  /** 获取徽章列表 */
  getBadgeList: (): Promise<Response> => GET(urls.getBadgeList)
}
