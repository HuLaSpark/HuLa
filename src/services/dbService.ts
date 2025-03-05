/* eslint-disable prettier/prettier */
import { MessageModel, SessionModel, withDb } from '@/db'
import type { MessageType, SessionItem } from '@/services/types'
import { computedTimeBlock } from '@/utils/ComputedTime'

/**
 * 消息数据库服务类
 */
export class MessageDbService {
  /**
   * 保存单条消息
   * @param message 消息对象
   * @returns 是否成功
   */
  static async saveMessage(message: MessageType): Promise<boolean> {
    return await withDb(() => MessageModel.saveMessage(message), false)
  }

  /**
   * 批量保存消息
   * @param messages 消息列表
   * @returns 成功保存的消息数量
   */
  static async saveMessages(messages: MessageType[]): Promise<number> {
    return await withDb(() => MessageModel.saveMessages(messages), 0)
  }

  /**
   * a根据房间ID获取消息列表
   * @param roomId 房间ID
   * @param pageSize 每页数量
   * @param cursor 游标
   * @returns 消息列表数据
   */
  static async getMessagesByRoomId(
    roomId: string,
    pageSize: number = 20,
    cursor?: string
  ): Promise<{
    list: MessageType[]
    cursor: string
    isLast: boolean
  }> {
    // 获取原始消息列表
    const result = await withDb(() => MessageModel.getMessagesByRoomId(roomId, pageSize, cursor), {
      list: [],
      cursor: '',
      isLast: true
    })

    // 应用时间分组算法
    if (result.list.length > 0) {
      result.list = computedTimeBlock(result.list)
    }

    return result
  }

  /**
   * 更新消息状态
   * @param messageId 消息ID
   * @param status 新状态
   * @returns 是否成功
   */
  static async updateMessageStatus(messageId: string, status: any): Promise<boolean> {
    return await withDb(() => MessageModel.updateMessageStatus(messageId, status), false)
  }

  /**
   * 更新消息ID（处理临时ID的情况）
   * @param oldId 旧消息ID
   * @param newId 新消息ID
   * @returns 是否成功
   */
  static async updateMessageId(oldId: string, newId: string): Promise<boolean> {
    return await withDb(() => MessageModel.updateMessageId(oldId, newId), false)
  }

  /**
   * 删除消息
   * @param messageId 消息ID
   * @returns 是否成功
   */
  static async deleteMessage(messageId: string): Promise<boolean> {
    return await withDb(() => MessageModel.deleteMessage(messageId), false)
  }

  /**
   * 清理旧消息
   * @param roomId 房间ID
   * @param keepCount 保留的消息数量
   * @returns 删除的消息数量
   */
  static async cleanupOldMessages(roomId: string, keepCount: number = 60): Promise<number> {
    return await withDb(() => MessageModel.cleanupOldMessages(roomId, keepCount), 0)
  }

  /**
   * 根据消息ID获取消息
   * @param messageId 消息ID
   * @returns 消息对象
   */
  static async getMessageById(messageId: string): Promise<MessageType | null> {
    return await withDb(() => MessageModel.getMessageById(messageId), null)
  }

  /**
   * 获取回复了指定消息的所有消息
   * @param messageId 被回复的消息ID
   * @returns 回复消息列表
   */
  static async getReplyMessages(messageId: string): Promise<MessageType[]> {
    return await withDb(() => MessageModel.getReplyMessages(messageId), [])
  }
}

/**
 * 会话数据库服务类
 */
export class SessionDbService {
  /**
   * 保存会话
   * @param session 会话对象
   * @returns 是否成功
   */
  static async saveSession(session: SessionItem): Promise<boolean> {
    return await withDb(() => SessionModel.saveSession(session), false)
  }

  /**
   * 批量保存会话
   * @param sessions 会话列表
   * @returns 成功保存的数量
   */
  static async saveSessions(sessions: SessionItem[]): Promise<number> {
    return await withDb(() => SessionModel.saveSessions(sessions), 0)
  }

  /**
   * 获取会话列表
   * @param pageSize 每页数量
   * @param cursor 游标
   * @returns 会话列表数据
   */
  static async getSessionList(
    pageSize: number = 100,
    cursor: string = ''
  ): Promise<{
    list: SessionItem[]
    cursor: string
    isLast: boolean
  }> {
    return await withDb(() => SessionModel.getSessionList(pageSize, cursor), { list: [], cursor: '', isLast: true })
  }

  /**
   * 根据ID获取会话
   * @param roomId 房间ID
   * @returns 会话信息
   */
  static async getSessionById(roomId: string): Promise<SessionItem | null> {
    return await withDb(() => SessionModel.getSessionById(roomId), null)
  }

  /**
   * 更新会话未读数量
   * @param roomId 房间ID
   * @param unreadCount 未读数量
   * @returns 是否成功
   */
  static async updateUnreadCount(roomId: string, unreadCount: number): Promise<boolean> {
    return await withDb(() => SessionModel.updateUnreadCount(roomId, unreadCount), false)
  }

  /**
   * 更新会话活跃时间
   * @param roomId 房间ID
   * @param activeTime 活跃时间
   * @returns 是否成功
   */
  static async updateActiveTime(roomId: string, activeTime: number): Promise<boolean> {
    return await withDb(() => SessionModel.updateActiveTime(roomId, activeTime), false)
  }

  /**
   * 更新会话最新消息文本
   * @param roomId 房间ID
   * @param text 消息文本
   * @returns 是否成功
   */
  static async updateMessageText(roomId: string, text: string): Promise<boolean> {
    return await withDb(() => SessionModel.updateMessageText(roomId, text), false)
  }

  /**
   * 删除会话
   * @param roomId 房间ID
   * @returns 是否成功
   */
  static async deleteSession(roomId: string): Promise<boolean> {
    return await withDb(() => SessionModel.deleteSession(roomId), false)
  }

  /**
   * 获取总未读消息数
   * @returns 总未读数
   */
  static async getTotalUnreadCount(): Promise<number> {
    return await withDb(() => SessionModel.getTotalUnreadCount(), 0)
  }
}
