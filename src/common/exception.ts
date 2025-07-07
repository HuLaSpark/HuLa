export enum ErrorType {
  Network = 'Network',
  Server = 'Server',
  Client = 'Client',
  Validation = 'Validation',
  Authentication = 'Authentication',
  Unknown = 'Unknown',
  TokenExpired = 'TokenExpired',
  TokenInvalid = 'TokenInvalid'
}

export interface ErrorDetails {
  type: ErrorType
  code?: number
  details?: Record<string, any>
  showError?: boolean
  isRetryError?: boolean
}

export class AppException extends Error {
  public readonly type: ErrorType
  public readonly code?: number
  public readonly details?: Record<string, any>
  // 使用静态标志位来追踪是否已经显示过错误消息
  private static hasShownError = false

  constructor(message: string, errorDetails?: Partial<ErrorDetails>) {
    super(message)
    this.name = 'AppException'
    this.type = errorDetails?.type || ErrorType.Unknown
    this.code = errorDetails?.code
    this.details = errorDetails?.details

    // 只有在明确指定显示错误时才显示
    if (errorDetails?.showError && !AppException.hasShownError) {
      // 如果是重试相关的错误，使用console.log打印而不是弹窗提示
      if (errorDetails?.isRetryError) {
        console.log('🔄 重试错误:', message, this.details)
      } else if (this.code === 1001) {
        // code为1001的错误只打印日志，不显示弹窗
        console.log(message, this.details)
      } else {
        window.$message.error(message)
        AppException.hasShownError = true

        // 只有在 2 秒内没有显示过错误消息时才会显示
        setTimeout(() => {
          AppException.hasShownError = false
        }, 2000)
      }
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      details: this.details
    }
  }
}
