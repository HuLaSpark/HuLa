import request from '@/services/request'
const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const POST = <T>(url: string, params?: any, abort?: AbortController) => request.post<T>(url, params, abort)
const PUT = <T>(url: string, params?: any, abort?: AbortController) => request.put<T>(url, params, abort)
const DELETE = <T>(url: string, params?: any, abort?: AbortController) => request.delete<T>(url, params, abort)

// AI API 密钥 VO
export interface ApiKeyVO {
  id: number // 编号
  name: string // 名称
  apiKey: string // 密钥
  platform: string // 平台
  url: string // 自定义 API 地址
  status: number // 状态
}

// AI API 密钥 API
export const ApiKeyApi = {
  // 查询 API 密钥分页
  getApiKeyPage: async (params: any) => {
    return await GET('/ai/api-key/page', params)
  },

  // 获得 API 密钥列表
  getApiKeySimpleList: async () => {
    return await GET('/ai/api-key/simple-list')
  },

  // 查询 API 密钥详情
  getApiKey: async (id: number) => {
    return await GET('/ai/api-key/get?id=' + id)
  },

  // 新增 API 密钥
  createApiKey: async (data: ApiKeyVO) => {
    return await POST('/ai/api-key/create', data)
  },

  // 修改 API 密钥
  updateApiKey: async (data: ApiKeyVO) => {
    return await PUT('/ai/api-key/update', data)
  },

  // 删除 API 密钥
  deleteApiKey: async (id: number) => {
    return await DELETE('/ai/api-key/delete?id=' + id)
  }
}
