/* eslint-disable prettier/prettier */
import Database from '@tauri-apps/plugin-sql'
import { resolveResource } from '@tauri-apps/api/path'
import { info, error } from '@tauri-apps/plugin-log'
import { exists, create, BaseDirectory } from '@tauri-apps/plugin-fs'

// 单例模式确保只有一个数据库连接实例
let dbInstance: Database | null = null

// 数据库文件路径
const DB_FILE_NAME = 'hula_chat.db'

/**
 * 获取数据库连接实例
 * @returns 返回数据库连接实例的Promise
 */
export async function getDbConnection(): Promise<Database> {
  if (dbInstance) {
    return dbInstance
  }

  try {
    // 解析数据库文件路径
    const dbPath = await resolveResource(DB_FILE_NAME)
    info(`连接数据库: ${dbPath}`)
    console.log(`数据库文件路径: ${dbPath}`)

    // 确保数据目录存在
    try {
      const dirExists = await exists('', { baseDir: BaseDirectory.AppData })
      if (!dirExists) {
        await create('', { baseDir: BaseDirectory.AppData })
        console.log('创建数据目录成功')
      }
    } catch (dirErr) {
      console.error('检查或创建数据目录失败:', dirErr)
    }

    // 创建SQLite连接
    console.log('尝试加载数据库...')
    dbInstance = await Database.load(`sqlite:${dbPath}`)
    console.log('数据库加载成功')

    // 初始化数据库
    await initDatabase(dbInstance)

    // 验证数据库连接
    try {
      const testResult = await dbInstance.execute('SELECT 1 as test')
      console.log('数据库连接测试成功:', testResult)
    } catch (testErr) {
      console.error('数据库连接测试失败:', testErr)
    }

    return dbInstance
  } catch (err) {
    error(`数据库连接错误: ${err}`)
    console.error('数据库连接详细错误:', err)
    throw new Error(`无法连接到数据库: ${err}`)
  }
}

/**
 * 初始化数据库结构
 * @param db 数据库连接实例
 */
async function initDatabase(db: Database): Promise<void> {
  try {
    await db.execute(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
    `)
    console.log('数据库PRAGMA设置完成')

    // 创建消息表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        from_uid TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        body TEXT NOT NULL,
        like_count INTEGER DEFAULT 0,
        dislike_count INTEGER DEFAULT 0,
        reply_to TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        extra TEXT
      );
    `)
    console.log('消息表创建或确认完成')

    // 创建用户表 (简化版，用于关联消息)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        updated_at INTEGER NOT NULL
      );
    `)
    console.log('用户表创建或确认完成')

    // 创建会话表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        room_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        avatar TEXT,
        text TEXT,
        unread_count INTEGER DEFAULT 0,
        active_time INTEGER NOT NULL,
        extra TEXT
      );
    `)
    console.log('会话表创建或确认完成')

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages (room_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_from_uid ON messages (from_uid);
    `)
    console.log('索引创建或确认完成')

    info('数据库初始化完成')

    // 检查并记录表是否创建成功
    try {
      const tables = await db.select<{ name: string }[]>(`
        SELECT name FROM sqlite_master WHERE type='table'
      `)
      console.log('已创建的表:', tables.map((t) => t.name).join(', '))
    } catch (err) {
      console.error('获取表列表失败:', err)
    }
  } catch (err) {
    error(`数据库初始化错误: ${err}`)
    console.error('数据库初始化详细错误:', err)
    throw new Error(`数据库初始化失败: ${err}`)
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDbConnection(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
    info('数据库连接已关闭')
    console.log('数据库连接已关闭')
  }
}
