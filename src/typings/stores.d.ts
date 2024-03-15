/* pinia的store的命名空间 */
declare namespace STO {
  /* 设置 */
  type Setting = {
    /* 主题设置 */
    themes: {
      content: string
      pattern: string
    }
    /* 登录设置 */
    login: {
      autoLogin: boolean
      autoStartup: boolean
      /* 用户保存的登录信息 */
      accountInfo: {
        account: string
        password: string
        avatar: string
      }
    }
  }
}
