import { createAxios } from '@/services/request'
import urls from '@/services/urls'
import type { login, Response } from '@/services/types'
import { parameter } from '@/services/types'

const request = createAxios()

const GET = <T>(url: string, params?: any) => request.get<T, Response>(url, params)
const POST = <T>(url: string, params?: any) => request.post<T, Response>(url, params)
// const PUT = <T>(url: string, params?: any) => request.put<T, Response>(url, params)
// const DELETE = <T>(url: string, params?: any) => request.delete<T, Response>(url, params)

export default {
  /**登录 请求*/
  login: (form: login): Promise<Response> => POST(urls.login, form),
  /**退出 请求*/
  logout: (): Promise<Response> => GET(urls.logout),
  /**获取文章列表*/
  getArticlePage: (params: parameter): Promise<Response> => GET(urls.articlePage, { params })
}
