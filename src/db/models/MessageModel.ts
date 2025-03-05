/* eslint-disable prettier/prettier */
import { getDbConnection } from '../database'
import { MsgEnum, MessageStatusEnum } from '@/enums'
import { info, error } from '@tauri-apps/plugin-log'
import type { MessageType } from '@/services/types'

/**
 * 数据库消息表结构类型
 */
export interface DbMessage {
  id: string
  room_id: string
  from_uid: string
  type: MsgEnum
  status: MessageStatusEnum
  body: string // 存储JSON字符串
  like_count: number
  dislike_count: number
  reply_to: string | null // 被回复消息的ID
  created_at: number
  updated_at: number
  extra: string | null // 额外数据，JSON字符串
}

/**
 * 用户简化信息类型
 */
export interface DbUser {
  uid: string
  name: string
  avatar: string | null
  updated_at: number
}

/**
 * 消息模型类，提供消息相关的数据库操作
 */
export class MessageModel {
  /**
   * 存储消息到数据库
   * @param message 消息对象
   * @returns 是否成功
   */
  static async saveMessage(message: MessageType): Promise<boolean> {
    try {
      const db = await getDbConnection()

      // 1. 首先保存或更新用户信息
      const userUpdateQuery = `
        INSERT INTO users (uid, name, avatar, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (uid) DO UPDATE
        SET name = $2, avatar = $3, updated_at = $4
      `

      // 将console.log添加到此处输出消息结构，帮助调试
      console.log('保存消息到数据库:', JSON.stringify(message, null, 2))

      const userName = message.fromUser.username || '未知用户'

      await db.execute(userUpdateQuery, [message.fromUser.uid, userName, message.fromUser.avatar || null, Date.now()])

      // 2. 转换消息体为JSON字符串
      const bodyJson = JSON.stringify(message.message.body)
      const messageMarkJson = JSON.stringify(message.message.messageMark)

      // 3. 插入或更新消息
      const query = `
        INSERT INTO messages (
          id, room_id, from_uid, type, status, body, 
          like_count, dislike_count, reply_to, created_at, updated_at, extra
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE
        SET status = $5, body = $6, like_count = $7, dislike_count = $8, 
            updated_at = $11, extra = $12
      `

      // 提取回复的消息ID
      const replyToId = message.message.body?.reply?.id || null

      // 获取消息创建时间，优先使用消息自带时间戳，如果没有就使用当前时间
      const createdTime = message.message.sendTime || message.message.body?.createdAt || Date.now()

      await db.execute(query, [
        message.message.id,
        message.message.roomId,
        message.fromUser.uid,
        message.message.type,
        message.message.status,
        bodyJson,
        message.message.messageMark?.likeCount || 0,
        message.message.messageMark?.dislikeCount || 0,
        replyToId,
        createdTime,
        Date.now(),
        messageMarkJson
      ])

      info(`消息保存成功: ${message.message.id}`)
      return true
    } catch (err) {
      error(`保存消息失败: ${err}`)
      // 输出更详细的错误信息
      console.error('保存消息失败详情:', err)
      return false
    }
  }

  /**
   * 批量保存消息
   * @param messages 消息列表
   * @returns 成功保存的消息数量
   */
  static async saveMessages(messages: MessageType[]): Promise<number> {
    let successCount = 0
    const db = await getDbConnection()

    try {
      // 开始事务
      await db.execute('BEGIN TRANSACTION')

      for (const message of messages) {
        const saved = await this.saveMessage(message)
        if (saved) successCount++
      }

      // 提交事务
      await db.execute('COMMIT')
      return successCount
    } catch (err) {
      // 回滚事务
      await db.execute('ROLLBACK')
      error(`批量保存消息失败: ${err}`)
      return successCount
    }
  }

  /**
   * 根据消息ID获取消息
   * @param messageId 消息ID
   * @returns 消息对象
   */
  static async getMessageById(messageId: string): Promise<MessageType | null> {
    try {
      const db = await getDbConnection()

      // 查询消息和相关用户信息
      const query = `
        SELECT 
          m.*, u.name as user_name, u.avatar as user_avatar
        FROM messages m
        LEFT JOIN users u ON m.from_uid = u.uid
        WHERE m.id = $1
      `

      const result = await db.select<any[]>(query, [messageId])

      if (result.length === 0) {
        return null
      }

      return this.mapToMessageType(result[0])
    } catch (err) {
      error(`获取消息失败: ${err}`)
      return null
    }
  }

  /**
   * 分页获取房间的消息列表
   * @param roomId 房间ID
   * @param pageSize 每页数量
   * @param cursor 游标(消息ID或时间戳)
   * @returns 消息列表和下一个游标
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
    try {
      const db = await getDbConnection()
      let query, params

      if (cursor) {
        // 使用游标分页
        query = `
          SELECT 
            m.*, u.name as user_name, u.avatar as user_avatar
          FROM messages m
          LEFT JOIN users u ON m.from_uid = u.uid
          WHERE m.room_id = $1 AND m.created_at < (
            SELECT created_at FROM messages WHERE id = $2
          )
          ORDER BY m.created_at DESC
          LIMIT $3
        `
        params = [roomId, cursor, pageSize]
      } else {
        // 首次查询，不使用游标
        query = `
          SELECT 
            m.*, u.name as user_name, u.avatar as user_avatar
          FROM messages m
          LEFT JOIN users u ON m.from_uid = u.uid
          WHERE m.room_id = $1
          ORDER BY m.created_at DESC
          LIMIT $2
        `
        params = [roomId, pageSize]
      }

      const results = await db.select<any[]>(query, params)

      // 转换结果
      const messages = results.map((row) => this.mapToMessageType(row))

      // 确定是否为最后一页
      const isLast = results.length < pageSize

      // 确定下一个游标
      const nextCursor = results.length > 0 ? results[results.length - 1].id : ''

      return {
        list: messages,
        cursor: nextCursor,
        isLast
      }
    } catch (err) {
      error(`获取房间消息失败: ${err}`)
      return {
        list: [],
        cursor: '',
        isLast: true
      }
    }
  }

  /**
   * 更新消息状态
   * @param messageId 消息ID
   * @param status 新状态
   * @returns 是否成功
   */
  static async updateMessageStatus(messageId: string, status: MessageStatusEnum): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = `
        UPDATE messages
        SET status = $1, updated_at = $2
        WHERE id = $3
      `

      await db.execute(query, [status, Date.now(), messageId])
      return true
    } catch (err) {
      error(`更新消息状态失败: ${err}`)
      return false
    }
  }

  /**
   * 更新消息ID（处理临时ID的情况）
   * @param oldId 旧消息ID
   * @param newId 新消息ID
   * @returns 是否成功
   */
  static async updateMessageId(oldId: string, newId: string): Promise<boolean> {
    if (oldId === newId) return true

    try {
      const db = await getDbConnection()

      // 首先查询消息是否存在
      const existingMessage = await this.getMessageById(oldId)
      if (!existingMessage) return false

      // 开始事务
      await db.execute('BEGIN TRANSACTION')

      // 1. 插入新ID的消息
      const insertQuery = `
        INSERT INTO messages
        SELECT $1 as id, room_id, from_uid, type, status, body, 
               like_count, dislike_count, reply_to, created_at, $2 as updated_at, extra
        FROM messages WHERE id = $3
      `

      await db.execute(insertQuery, [newId, Date.now(), oldId])

      // 2. 更新引用了旧ID的回复消息
      const updateReplyQuery = `
        UPDATE messages
        SET reply_to = $1, updated_at = $2
        WHERE reply_to = $3
      `

      await db.execute(updateReplyQuery, [newId, Date.now(), oldId])

      // 3. 删除旧ID的消息
      const deleteQuery = 'DELETE FROM messages WHERE id = $1'
      await db.execute(deleteQuery, [oldId])

      // 提交事务
      await db.execute('COMMIT')

      return true
    } catch (err) {
      // 回滚事务
      const db = await getDbConnection()
      await db.execute('ROLLBACK')

      error(`更新消息ID失败: ${err}`)
      return false
    }
  }

  /**
   * 删除消息
   * @param messageId 消息ID
   * @returns 是否成功
   */
  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = 'DELETE FROM messages WHERE id = $1'
      await db.execute(query, [messageId])

      return true
    } catch (err) {
      error(`删除消息失败: ${err}`)
      return false
    }
  }

  /**
   * 清理旧消息
   * @param roomId 房间ID
   * @param keepCount 保留最新的消息数量
   * @returns 删除的消息数量
   */
  static async cleanupOldMessages(roomId: string, keepCount: number = 100): Promise<number> {
    try {
      const db = await getDbConnection()

      // 获取需要删除的消息ID
      const findQuery = `
        SELECT id FROM messages
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT -1 OFFSET $2
      `

      const oldMessages = await db.select<{ id: string }[]>(findQuery, [roomId, keepCount])

      if (oldMessages.length === 0) {
        return 0
      }

      // 构建ID列表
      const ids = oldMessages.map((m) => m.id)
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(',')

      // 删除旧消息
      const deleteQuery = `DELETE FROM messages WHERE room_id = $1 AND id IN (${placeholders})`
      const result = await db.execute(deleteQuery, [roomId, ...ids])
      info(`清理旧消息成功: ${result.rowsAffected}`)
      return oldMessages.length
    } catch (err) {
      error(`清理旧消息失败: ${err}`)
      return 0
    }
  }

  /**
   * 获取回复了指定消息的所有消息
   * @param messageId 被回复的消息ID
   * @returns 回复消息列表
   */
  static async getReplyMessages(messageId: string): Promise<MessageType[]> {
    try {
      const db = await getDbConnection()

      const query = `
        SELECT 
          m.*, u.name as user_name, u.avatar as user_avatar
        FROM messages m
        LEFT JOIN users u ON m.from_uid = u.uid
        WHERE m.reply_to = $1
        ORDER BY m.created_at ASC
      `

      const results = await db.select<any[]>(query, [messageId])

      return results.map((row) => this.mapToMessageType(row))
    } catch (err) {
      error(`获取回复消息失败: ${err}`)
      return []
    }
  }

  /**
   * 将数据库行记录映射为MessageType对象
   * @param row 数据库行记录
   * @returns MessageType对象
   */
  private static mapToMessageType(row: any): MessageType {
    // 解析JSON字段
    const body = JSON.parse(row.body)
    const messageMark = row.extra
      ? JSON.parse(row.extra)
      : { likeCount: row.like_count, dislikeCount: row.dislike_count }

    return {
      message: {
        id: row.id,
        roomId: row.room_id,
        type: row.type,
        status: row.status,
        body,
        messageMark,
        sendTime: 0
      },
      fromUser: {
        uid: row.from_uid,
        username: row.user_name,
        avatar: row.user_avatar,
        locPlace: row.loc_place,
        badge: row.badge
      },
      sendTime: ''
    }
  }
}
