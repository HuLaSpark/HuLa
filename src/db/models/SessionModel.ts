/* eslint-disable prettier/prettier */
import { getDbConnection } from '../database'
import { error } from '@tauri-apps/plugin-log'
import type { IsAllUserEnum, SessionItem } from '@/services/types'
import { RoomTypeEnum, SessionOperateEnum } from '@/enums'

/**
 * 会话模型类，提供会话相关的数据库操作
 */
export class SessionModel {
  /**
   * 保存或更新会话信息
   * @param session 会话信息
   * @returns 是否成功
   */
  static async saveSession(session: SessionItem): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = `
        INSERT INTO sessions (
          room_id, type, name, avatar, text, 
          unread_count, active_time, extra
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (room_id) DO UPDATE
        SET name = $3, avatar = $4, text = $5, 
            unread_count = $6, active_time = $7, extra = $8
      `

      await db.execute(query, [
        session.roomId,
        session.type,
        session.name,
        session.avatar,
        session.text,
        session.unreadCount || 0,
        session.activeTime
      ])

      return true
    } catch (err) {
      error(`保存会话失败: ${err}`)
      return false
    }
  }

  /**
   * 批量保存会话
   * @param sessions 会话列表
   * @returns 成功保存的数量
   */
  static async saveSessions(sessions: SessionItem[]): Promise<number> {
    let successCount = 0
    const db = await getDbConnection()

    try {
      // 开始事务
      await db.execute('BEGIN TRANSACTION')

      for (const session of sessions) {
        const saved = await this.saveSession(session)
        if (saved) successCount++
      }

      // 提交事务
      await db.execute('COMMIT')
      return successCount
    } catch (err) {
      // 回滚事务
      await db.execute('ROLLBACK')
      error(`批量保存会话失败: ${err}`)
      return successCount
    }
  }

  /**
   * 获取会话列表
   * @param pageSize 每页大小
   * @param cursor 游标
   * @returns 会话列表和分页信息
   */
  static async getSessionList(
    pageSize: number = 100,
    cursor: string = ''
  ): Promise<{
    list: SessionItem[]
    cursor: string
    isLast: boolean
  }> {
    try {
      const db = await getDbConnection()
      let query, params

      if (cursor) {
        // 使用游标分页
        query = `
          SELECT * FROM sessions
          WHERE active_time < (
            SELECT active_time FROM sessions WHERE room_id = $1
          )
          ORDER BY active_time DESC
          LIMIT $2
        `
        params = [cursor, pageSize]
      } else {
        // 首次查询，不使用游标
        query = `
          SELECT * FROM sessions
          ORDER BY active_time DESC
          LIMIT $1
        `
        params = [pageSize]
      }

      const results = await db.select<any[]>(query, params)

      // 转换结果
      const sessions = results.map((row) => this.mapToSessionItem(row))

      // 确定是否为最后一页
      const isLast = results.length < pageSize

      // 确定下一个游标
      const nextCursor = results.length > 0 ? results[results.length - 1].roomId : ''

      return {
        list: sessions,
        cursor: nextCursor,
        isLast
      }
    } catch (err) {
      error(`获取会话列表失败: ${err}`)
      return {
        list: [],
        cursor: '',
        isLast: true
      }
    }
  }

  /**
   * 根据ID获取会话
   * @param roomId 房间ID
   * @returns 会话信息
   */
  static async getSessionById(roomId: string): Promise<SessionItem | null> {
    try {
      const db = await getDbConnection()

      const query = 'SELECT * FROM sessions WHERE room_id = $1'
      const result = await db.select<any[]>(query, [roomId])

      if (result.length === 0) {
        return null
      }

      return this.mapToSessionItem(result[0])
    } catch (err) {
      error(`获取会话失败: ${err}`)
      return null
    }
  }

  /**
   * 更新会话的未读数量
   * @param roomId 房间ID
   * @param unreadCount 未读数量
   * @returns 是否成功
   */
  static async updateUnreadCount(roomId: string, unreadCount: number): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = `
        UPDATE sessions
        SET unread_count = $1
        WHERE room_id = $2
      `

      await db.execute(query, [unreadCount, roomId])
      return true
    } catch (err) {
      error(`更新会话未读数量失败: ${err}`)
      return false
    }
  }

  /**
   * 更新会话活跃时间
   * @param roomId 房间ID
   * @param activeTime 活跃时间
   * @returns 是否成功
   */
  static async updateActiveTime(roomId: string, activeTime: number): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = `
        UPDATE sessions
        SET active_time = $1
        WHERE room_id = $2
      `

      await db.execute(query, [activeTime, roomId])
      return true
    } catch (err) {
      error(`更新会话活跃时间失败: ${err}`)
      return false
    }
  }

  /**
   * 更新会话最新消息文本
   * @param roomId 房间ID
   * @param text 消息文本
   * @returns 是否成功
   */
  static async updateMessageText(roomId: string, text: string): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = `
        UPDATE sessions
        SET text = $1
        WHERE room_id = $2
      `

      await db.execute(query, [text, roomId])
      return true
    } catch (err) {
      error(`更新会话消息文本失败: ${err}`)
      return false
    }
  }

  /**
   * 删除会话
   * @param roomId 房间ID
   * @returns 是否成功
   */
  static async deleteSession(roomId: string): Promise<boolean> {
    try {
      const db = await getDbConnection()

      const query = 'DELETE FROM sessions WHERE room_id = $1'
      await db.execute(query, [roomId])

      return true
    } catch (err) {
      error(`删除会话失败: ${err}`)
      return false
    }
  }

  /**
   * 获取总未读消息数
   * @returns 总未读数
   */
  static async getTotalUnreadCount(): Promise<number> {
    try {
      const db = await getDbConnection()

      const query = 'SELECT SUM(unread_count) as total FROM sessions'
      const result = await db.select<{ total: number }[]>(query)

      return result[0]?.total || 0
    } catch (err) {
      error(`获取总未读数失败: ${err}`)
      return 0
    }
  }

  /**
   * 将数据库行记录映射为SessionItem对象
   * @param row 数据库行记录
   * @returns SessionItem对象
   */
  private static mapToSessionItem(row: any): SessionItem {
    return {
      id: row.id,
      roomId: row.room_id,
      type: row.type as RoomTypeEnum,
      name: row.name,
      avatar: row.avatar,
      text: row.text,
      unreadCount: row.unread_count,
      activeTime: row.active_time,
      hotFlag: row.hotFlag as IsAllUserEnum,
      top: row.top,
      operate: row.operate as SessionOperateEnum
    }
  }
}
