export enum ErrorType {
  Network = 'NETWORK_ERROR',
  Authentication = 'AUTH_ERROR',
  Validation = 'VALIDATION_ERROR',
  Server = 'SERVER_ERROR',
  Client = 'CLIENT_ERROR',
  Unknown = 'UNKNOWN_ERROR'
}

export interface ErrorDetails {
  type: ErrorType
  code?: number
  details?: Record<string, any>
}

export class AppException extends Error {
  public readonly type: ErrorType
  public readonly code?: number
  public readonly details?: Record<string, any>

  constructor(message: string, errorDetails?: Partial<ErrorDetails>) {
    super(message)
    this.name = 'AppException'
    this.type = errorDetails?.type || ErrorType.Unknown
    this.code = errorDetails?.code
    this.details = errorDetails?.details

    // Show error message to user if window.$message is available
    if (window.$message) {
      window.$message.error(message)
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
