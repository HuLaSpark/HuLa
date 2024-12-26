export class AppException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppException'
  }
}
