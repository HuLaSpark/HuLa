import request from '@/services/request'
import { fetch } from '@tauri-apps/plugin-http'
const { VITE_SERVICE_URL } = import.meta.env
const prefix = VITE_SERVICE_URL
const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const POST = <T>(url: string, params?: any, abort?: AbortController) => request.post<T>(url, params, abort)

// 获取会话内容列表
export function listChatMessage<T>(params: object) {
  return GET<T>(`${prefix}/chat/message`, params)
}

// 获取用户可用模型信息
export function fetchModel<T>(params: any) {
  return GET<T>(`${prefix}/gpt/model/userModel`, params)
}

// 创建对话
export function fetchChatAPI<T = any>(data: any) {
  return POST<T>(`${prefix}/chat`, data)
}

// 发送消息
export function fetchChatMessageAPI<T = any>(data: any) {
  return POST<T>(`${prefix}/chat/message`, data)
}

// 根据消息id获取当前内容
export function fetchChatMessageById<T = any>(messageId: string) {
  return GET<T>(`${prefix}/chat/message/${messageId}`)
}

// 获取会话列表
export function listChat<T>(data: any) {
  return POST<T>(`${prefix}/chat/list`, data)
}

// 删除会话列表
export function removeChat<T>(chatNumber: string) {
  return POST<T>(`${prefix}/chat/del/${chatNumber}`, {})
}

// 获取文件列表
export function fileListApi<T>(data: string) {
  return GET<T>(`${prefix}/file/fileList?model=${data}`, data)
}

// 删除文件
export function fileDeleteApi<T>(data: { fileIds: [any]; model: string }) {
  return POST<T>(`${prefix}/file/delete`, data)
}

// 流式响应聊天
export function fetchChatAPIProcess(data: { conversationId: string; fileIds: string[] }) {
  // return POST<T>(`${prefix}/chat/completions`, data,  new AbortController())
  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', `Bearer ${localStorage.getItem('TOKEN')}`)

  const raw = JSON.stringify({
    conversationId: data.conversationId
  })

  const requestOptions: any = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  }

  return fetch(`${prefix}/chat/completions`, requestOptions)
}

// 获取配置信息
export function fetchAgreement<T>(type: number) {
  return GET<T>(`/app/api/content/agreement/${type}`)
}

// 获取助手分类
export function listAssistantType<T>() {
  return GET<T>('/app/api/assistant/type')
}

// 根据分类获取助手
export function listAssistantByType<T>(data: { current: number; size: number; typeId?: number }) {
  return POST<T>(`${prefix}/gpt/assistant/list`, data)
}

// 随机获取助手
export function listAssistantRandom<T>(params: any) {
  return GET<T>(`${prefix}/app/api/assistant/random?`, params)
}
