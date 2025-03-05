/* eslint-disable prettier/prettier */
import { getDbConnection, closeDbConnection } from './database'
import { MessageModel } from './models/MessageModel'
import { SessionModel } from './models/SessionModel'
import { DbDiagnostics } from './DbDiagnostics'
import { info, error } from '@tauri-apps/plugin-log'

// 导出模型类和诊断工具
export { MessageModel, SessionModel, DbDiagnostics }

/**
 * 初始化数据库
 * @returns 是否成功初始化
 */
export async function initDatabase(): Promise<boolean> {
  try {
    await getDbConnection()
    info('数据库初始化成功')

    // 打印数据库路径信息
    const dbPath = await DbDiagnostics.getDatabasePath()
    console.log(`数据库文件路径: ${dbPath}`)

    return true
  } catch (err) {
    error(`数据库初始化失败: ${err}`)
    return false
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  await closeDbConnection()
}

/**
 * 执行数据库操作，自动处理错误
 * @param operation 数据库操作函数
 * @param defaultValue 发生错误时返回的默认值
 * @returns 操作结果
 */
export async function withDb<T>(operation: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await operation()
  } catch (err) {
    error(`数据库操作错误: ${err}`)
    console.error('数据库操作详细错误:', err)
    return defaultValue
  }
}

export default {
  initDatabase,
  closeDatabase,
  MessageModel,
  SessionModel,
  DbDiagnostics
}
