import { invoke } from '@tauri-apps/api/core'
import { AppException, ErrorType } from '@/common/exception'

/**
 * Tauri invoke 调用的统一错误处理包装器
 * @param command Tauri 命令名称
 * @param args 命令参数
 * @param options 错误处理选项
 * @returns Promise<T>
 */
export async function invokeWithErrorHandler<T = any>(
  command: string,
  args?: Record<string, any>,
  options?: {
    /** 是否显示错误提示，默认为 true */
    showError?: boolean
    /** 自定义错误消息 */
    customErrorMessage?: string
    /** 是否为重试相关的错误，默认为 false */
    isRetryError?: boolean
    /** 错误类型，默认为 Unknown */
    errorType?: ErrorType
  }
): Promise<T> {
  const { showError = true, customErrorMessage, isRetryError = false, errorType = ErrorType.Unknown } = options || {}

  try {
    const result = await invoke<T>(command, args)
    return result
  } catch (error) {
    console.error(`[Tauri Invoke Error] 命令: ${command}`, error)

    // 构造错误消息
    let errorMessage = customErrorMessage
    if (!errorMessage) {
      if (typeof error === 'string') {
        errorMessage = error
      } else if (error instanceof Error) {
        errorMessage = error.message
      } else {
        errorMessage = `调用 ${command} 命令失败`
      }
    }

    // 使用 AppException 统一处理错误
    throw new AppException(errorMessage, {
      type: errorType,
      showError,
      isRetryError,
      details: {
        command,
        args,
        originalError: error
      }
    })
  }
}

/**
 * 静默调用 Tauri 命令（不显示错误提示）
 * @param command Tauri 命令名称
 * @param args 命令参数
 * @returns Promise<T | null> 成功返回结果，失败返回 null
 */
export async function invokeSilently<T = any>(command: string, args?: Record<string, any>): Promise<T | null> {
  try {
    return await invokeWithErrorHandler<T>(command, args, { showError: false })
  } catch {
    return null
  }
}

/**
 * 带重试机制的 Tauri 调用
 * @param command Tauri 命令名称
 * @param args 命令参数
 * @param options 重试选项
 * @returns Promise<T>
 */
export async function invokeWithRetry<T = any>(
  command: string,
  args?: Record<string, any>,
  options?: {
    /** 最大重试次数，默认为 3 */
    maxRetries?: number
    /** 重试间隔（毫秒），默认为 1000 */
    retryDelay?: number
    /** 是否显示错误提示，默认为 true */
    showError?: boolean
    /** 自定义错误消息 */
    customErrorMessage?: string
  }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, showError = true, customErrorMessage } = options || {}

  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await invokeWithErrorHandler<T>(command, args, {
        showError: attempt === maxRetries ? showError : false,
        customErrorMessage: attempt === maxRetries ? customErrorMessage : undefined,
        isRetryError: attempt < maxRetries,
        errorType: ErrorType.Network
      })
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        console.log(`🔄 重试 ${command} 命令 (${attempt}/${maxRetries})...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw lastError
}

export { ErrorType }
