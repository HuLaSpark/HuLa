/** API 命名空间 */
declare namespace API {
  /**
   * 登录
   * @param token token
   * @param refreshToken 刷新token
   * @param client 客户端
   */
  type Login = {
    token: string
    refreshToken: string
    client: string
  }

  /**
   * 用户状态
   * @param url 链接
   * @param title 标题
   * @param bgColor 背景颜色
   */
  type UserState = {
    id: string
    title: string
    url: string
    bgColor?: string
  }
}
