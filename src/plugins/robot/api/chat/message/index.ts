import request from '@/services/request'
import { fetchEventSource } from '@microsoft/fetch-event-source'
const { VITE_SERVICE_URL } = import.meta.env
const prefix = VITE_SERVICE_URL
const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const DELETE = <T>(url: string, params?: any, abort?: AbortController) => request.delete<T>(url, params, abort)

// 聊天VO
export interface ChatMessageVO {
  id: number // 编号
  conversationId: number // 对话编号
  type: string // 消息类型
  userId: string // 用户编号
  roleId: string // 角色编号
  model: number // 模型标志
  modelId: number // 模型编号
  content: string // 聊天内容
  tokens: number // 消耗 Token 数量
  segmentIds?: number[] // 段落编号
  segments?: {
    id: number // 段落编号
    content: string // 段落内容
    documentId: number // 文档编号
    documentName: string // 文档名称
  }[]
  createTime: Date // 创建时间
  roleAvatar: string // 角色头像
  userAvatar: string // 用户头像
}

// AI chat 聊天
export const ChatMessageApi = {
  // 消息列表
  getChatMessageListByConversationId: async (conversationId: number | null) => {
    return await GET(`${prefix}/ai/chat/message/list-by-conversation-id?conversationId=${conversationId}`)
  },

  // 发送 Stream 消息
  // 为什么不用 axios 呢？因为它不支持 SSE 调用
  sendChatMessageStream: async (
    conversationId: number,
    content: string,
    ctrl: AbortController,
    enableContext: boolean,
    onMessage: any,
    onError: any,
    onClose: any
  ) => {
    const token = localStorage.getItem('TOKEN')

    // 使用代理模式避免CORS问题
    const apiUrl = '/api/ai/chat/message/send-stream'
    console.log('🔗 使用代理模式:', apiUrl)

    console.log('🚀 开始SSE连接:', {
      url: apiUrl,
      conversationId,
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      enableContext
    })

    return fetchEventSource(apiUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        Accept: 'text/event-stream'
      },
      openWhenHidden: true,
      body: JSON.stringify({
        conversationId,
        content,
        useContext: enableContext
      }),
      onopen: async (response) => {
        console.log('📡 SSE连接响应:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          url: response.url
        })

        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          console.log('✅ SSE连接已建立')
          return // 连接成功
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error('❌ SSE连接失败，状态码：', response.status)
          throw new Error(`连接失败: ${response.status}`)
        } else {
          console.warn('⚠️ SSE连接异常，尝试重试：', response.status)
          throw new Error(`临时错误: ${response.status}`)
        }
      },
      onmessage: (event) => {
        console.log('📨 收到SSE消息:', event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''))
        onMessage(event)
      },
      onerror: (err) => {
        console.error('❌ SSE连接错误:', err)
        // 检查是否是主动中止
        if (ctrl.signal.aborted) {
          console.log('🛑 连接被主动中止')
          throw err // 不重试，直接抛出错误
        }
        onError(err)
        // 对于网络错误，让库自动重试
        // 抛出错误以触发重试机制
        throw err
      },
      onclose: () => {
        console.log('🔌 SSE连接已关闭')
        onClose()
      },
      signal: ctrl.signal
    })
  },

  // 删除消息
  deleteChatMessage: async (id: string) => {
    return await DELETE(`${prefix}/ai/chat/message/delete`, { id })
  },

  // 删除指定对话的消息
  deleteByConversationId: async (conversationId: number) => {
    return await DELETE(`${prefix}/ai/chat/message/delete-by-conversation-id`, { conversationId })
  },

  // 获得消息分页
  getChatMessagePage: async (params: any) => {
    return await GET(`${prefix}/ai/chat/message/page`, params)
  },

  // 管理员删除消息
  deleteChatMessageByAdmin: async (id: number) => {
    return await DELETE(`${prefix}/ai/chat/message/delete-by-admin`, { id })
  }
}
