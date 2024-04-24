/** pinia的store的命名空间 */
declare namespace STO {
  /** 设置 */
  type Setting = {
    /** 主题设置 */
    themes: {
      content: string
      pattern: string
    }
    /** 关闭提示 */
    tips: {
      type: string
      /** 不再显示提示 */
      notTips: boolean
    }
    /** 是否启用ESC关闭窗口 */
    escClose: boolean
    /** 登录设置 */
    login: {
      autoLogin: boolean
      autoStartup: boolean
      /** 用户保存的登录信息 */
      accountInfo: {
        account?: string
        password?: string
        name: string
        avatar: string
        uid: string
      }
    }
    /** 聊天设置 */
    chat: {
      /** 发送快捷键 */
      sendKey: string
      /** 是否双击打开独立会话窗口 */
      isDouble: boolean
    }
  }

  /** 置顶 */
  type AlwaysOnTop = {
    [key: string]: boolean
  }

  /** 历史内容 */
  type History = {
    emoji: string[]
  }
}
