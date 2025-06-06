import request from '@/services/request'
const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const POST = <T>(url: string, params?: any, abort?: AbortController) => request.post<T>(url, params, abort)
const PUT = <T>(url: string, params?: any, abort?: AbortController) => request.put<T>(url, params, abort)
const DELETE = <T>(url: string, params?: any, abort?: AbortController) => request.delete<T>(url, params, abort)

// AI 工具 VO
export interface ToolVO {
  id: number // 工具编号
  name: string // 工具名称
  description: string // 工具描述
  status: number // 状态
}

// AI 工具 API
export const ToolApi = {
  // 查询工具分页
  getToolPage: async (params: any) => {
    return await GET('/ai/tool/page', params)
  },

  // 查询工具详情
  getTool: async (id: number) => {
    return await GET('/ai/tool/get?id=' + id)
  },

  // 新增工具
  createTool: async (data: ToolVO) => {
    return await POST('/ai/tool/create', data)
  },

  // 修改工具
  updateTool: async (data: ToolVO) => {
    return await PUT('/ai/tool/update', data)
  },

  // 删除工具
  deleteTool: async (id: number) => {
    return await DELETE('/ai/tool/delete?id=' + id)
  },

  // 获取工具简单列表
  getToolSimpleList: async () => {
    return await GET('/ai/tool/simple-list')
  }
}
