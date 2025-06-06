import request from '@/services/request'
const { VITE_SERVICE_URL } = import.meta.env
const prefix = VITE_SERVICE_URL
const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const POST = <T>(url: string, params?: any, abort?: AbortController) => request.post<T>(url, params, abort)
const PUT = <T>(url: string, params?: any, abort?: AbortController) => request.put<T>(url, params, abort)
const DELETE = <T>(url: string, params?: any, abort?: AbortController) => request.delete<T>(url, params, abort)

// AI 模型 VO
export interface ModelVO {
  id: number // 编号
  keyId: number // API 秘钥编号
  name: string // 模型名字
  model: string // 模型标识
  platform: string // 模型平台
  type: number // 模型类型
  sort: number // 排序
  status: number // 状态
  temperature?: number // 温度参数
  maxTokens?: number // 单条回复的最大 Token 数量
  maxContexts?: number // 上下文的最大 Message 数量
}

// AI 模型 API
export const ModelApi = {
  // 查询模型分页
  getModelPage: async (params: any) => {
    return await GET(`${prefix}/ai/model/page`, params)
  },

  // 获得模型列表
  getModelSimpleList: async (type?: number) => {
    return await GET(`${prefix}/ai/model/simple-list?type=${type}`)
  },

  // 查询模型详情
  getModel: async (id: number) => {
    return await GET(`${prefix}/ai/model/get?id=` + id)
  },

  // 新增模型
  createModel: async (data: ModelVO) => {
    return await POST(`${prefix}/ai/model/create`, data)
  },

  // 修改模型
  updateModel: async (data: ModelVO) => {
    return await PUT('/ai/model/update', data)
  },

  // 删除模型
  deleteModel: async (id: number) => {
    return await DELETE(`${prefix}/ai/model/delete?id=` + id)
  }
}
