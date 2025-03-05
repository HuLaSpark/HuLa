/* eslint-disable prettier/prettier */
import { getDbConnection } from './database'
import { resolveResource } from '@tauri-apps/api/path'
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

/**
 * 数据库诊断工具类
 */
export class DbDiagnostics {
  /**
   * 获取数据库文件路径
   */
  static async getDatabasePath(): Promise<string> {
    try {
      const dbPath = await resolveResource('hula_chat.db')
      return dbPath
    } catch (err) {
      console.error('获取数据库路径失败:', err)
      return '未知路径'
    }
  }

  /**
   * 检查数据库能否成功执行查询
   */
  static async testDatabaseQuery(): Promise<boolean> {
    try {
      const db = await getDbConnection()
      const result = await db.execute('SELECT 1 as test')
      console.log('数据库查询测试成功:', result)
      return true
    } catch (err) {
      console.error('数据库查询测试失败:', err)
      return false
    }
  }

  /**
   * 获取数据库中所有表的信息
   */
  static async listTables(): Promise<string[]> {
    try {
      const db = await getDbConnection()
      const tables = await db.select<{ name: string }[]>(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `)
      return tables.map((t) => t.name)
    } catch (err) {
      console.error('获取表列表失败:', err)
      return []
    }
  }

  /**
   * 检查消息表是否有记录
   */
  static async checkMessagesTable(): Promise<{
    exists: boolean
    count: number
    sample?: any[]
  }> {
    try {
      const db = await getDbConnection()

      // 检查表是否存在
      const tableExists = await db.select<{ count: number }[]>(`
        SELECT count(*) as count FROM sqlite_master 
        WHERE type='table' AND name='messages'
      `)

      if (!tableExists[0].count) {
        return { exists: false, count: 0 }
      }

      // 获取记录数
      const countResult = await db.select<{ count: number }[]>(`
        SELECT count(*) as count FROM messages
      `)

      // 获取一些样本数据
      const sample =
        countResult[0].count > 0
          ? await db.select(`
            SELECT * FROM messages ORDER BY created_at DESC LIMIT 3
          `)
          : []

      return {
        exists: true,
        count: countResult[0].count,
        sample: sample as any[]
      }
    } catch (err) {
      console.error('检查消息表失败:', err)
      return { exists: false, count: 0 }
    }
  }

  /**
   * 强制插入一条测试消息
   */
  static async insertTestMessage(): Promise<boolean> {
    try {
      const db = await getDbConnection()
      const now = Date.now()

      // 插入一个简单的测试用户
      await db.execute(
        `
        INSERT INTO users (uid, name, avatar, updated_at)
        VALUES ('test-user', '测试用户', null, ?)
        ON CONFLICT (uid) DO UPDATE
        SET updated_at = ?
      `,
        [now, now]
      )

      // 插入一条测试消息
      const testBody = JSON.stringify({
        content: '这是一条测试消息，用于验证数据库是否正常工作。',
        createdAt: now
      })

      await db.execute(
        `
        INSERT INTO messages (
          id, room_id, from_uid, type, status, body,
          like_count, dislike_count, created_at, updated_at
        )
        VALUES (?, ?, ?, 'text', 'success', ?, 0, 0, ?, ?)
      `,
        [`test-${now}`, 'test-room', 'test-user', testBody, now, now]
      )

      console.log('测试消息插入成功')
      return true
    } catch (err) {
      console.error('插入测试消息失败:', err)
      return false
    }
  }

  /**
   * 检查数据库文件权限
   */
  static async checkDatabasePermissions(): Promise<{
    exists: boolean
    writable: boolean
    size: number
  }> {
    try {
      const dbPath = await this.getDatabasePath()
      const fileExists = await exists(dbPath)

      let writable = false
      let size = 0

      if (fileExists) {
        try {
          // 尝试读取文件大小
          const fileContent = await readTextFile(dbPath)
          size = fileContent.length

          // 尝试写入测试
          await writeTextFile(dbPath, fileContent)
          writable = true
        } catch (writeErr) {
          console.error('数据库文件写入测试失败:', writeErr)
        }
      }

      return { exists: fileExists, writable, size }
    } catch (err) {
      console.error('检查数据库权限失败:', err)
      return { exists: false, writable: false, size: 0 }
    }
  }

  /**
   * 运行完整诊断
   */
  static async runDiagnostics(): Promise<{
    dbPath: string
    connectionWorks: boolean
    tablesList: string[]
    messagesTableInfo: {
      exists: boolean
      count: number
      sample?: any[]
    }
    fileInfo: {
      exists: boolean
      writable: boolean
      size: number
    }
  }> {
    const dbPath = await this.getDatabasePath()
    const connectionWorks = await this.testDatabaseQuery()
    const tablesList = await this.listTables()
    const messagesTableInfo = await this.checkMessagesTable()
    const fileInfo = await this.checkDatabasePermissions()

    return {
      dbPath,
      connectionWorks,
      tablesList,
      messagesTableInfo,
      fileInfo
    }
  }
}
