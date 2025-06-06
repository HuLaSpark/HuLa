import request from '@/services/request'
const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const POST = <T>(url: string, params?: any, abort?: AbortController) => request.post<T>(url, params, abort)
const PUT = <T>(url: string, params?: any, abort?: AbortController) => request.put<T>(url, params, abort)
const DELETE = <T>(url: string, params?: any, abort?: AbortController) => request.delete<T>(url, params, abort)

// AI 聊天角色 VO
export interface ChatRoleVO {
  id: number // 角色编号
  modelId: number // 模型编号
  name: string // 角色名称
  avatar: string // 角色头像
  category: string // 角色类别
  sort: number // 角色排序
  description: string // 角色描述
  systemMessage: string // 角色设定
  welcomeMessage: string // 角色设定
  publicStatus: boolean // 是否公开
  status: number // 状态
  knowledgeIds?: number[] // 引用的知识库 ID 列表
  toolIds?: number[] // 引用的工具 ID 列表
}

// AI 聊天角色 分页请求 vo
export interface ChatRolePageReqVO {
  name?: string // 角色名称
  category?: string // 角色类别
  publicStatus: boolean // 是否公开
  pageNo: number // 是否公开
  pageSize: number // 是否公开
}

// AI 聊天角色 API
export const ChatRoleApi = {
  // 查询聊天角色分页
  getChatRolePage: async (params: any) => {
    return await GET('/ai/chat-role/page', params)
  },

  // 查询聊天角色详情
  getChatRole: async (id: number) => {
    return await GET('/ai/chat-role/get?id=' + id)
  },

  // 新增聊天角色
  createChatRole: async (data: ChatRoleVO) => {
    return await POST('/ai/chat-role/create', data)
  },

  // 修改聊天角色
  updateChatRole: async (data: ChatRoleVO) => {
    return await PUT('/ai/chat-role/update', data)
  },

  // 删除聊天角色
  deleteChatRole: async (id: number) => {
    return await DELETE('/ai/chat-role/delete', { id })
  },

  // ======= chat 聊天

  // 获取 my role
  getMyPage: async (params: ChatRolePageReqVO) => {
    return await GET('/ai/chat-role/my-page', params)
  },

  // 获取角色分类
  getCategoryList: async () => {
    return await GET('/ai/chat-role/category-list')
  },

  // 创建角色
  createMy: async (data: ChatRoleVO) => {
    return await POST('/ai/chat-role/create-my', data)
  },

  // 更新角色
  updateMy: async (data: ChatRoleVO) => {
    return await PUT('/ai/chat-role/update-my', data)
  },

  // 删除角色 my
  deleteMy: async (id: number) => {
    return await DELETE('/ai/chat-role/delete-my', { id })
  }
}
