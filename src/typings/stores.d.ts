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
    /** 是否锁屏 */
    lockScreen: {
      /** 是否启用锁屏 */
      enable: boolean
      /** 锁屏密码 */
      password: string
    }
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
        uid: number
        token: string
      }
      /* 用户徽章列表 */
      badgeList: T
    }
    /** 聊天设置 */
    chat: {
      /** 发送快捷键 */
      sendKey: string
      /** 是否双击打开独立会话窗口 */
      isDouble: boolean
    }
    /** 界面设置 */
    page: {
      /** 是否开启阴影 */
      shadow: boolean
    }
  }

  /** 置顶窗口列表 */
  type AlwaysOnTop = {
    /** 是否置顶窗口列表 */
    [key: string]: boolean
  }

  /** 隐藏窗口列表 */
  type HideWindow = {
    /** 是否隐藏窗口列表 */
    [key: string]: boolean
  }

  /** 历史内容 */
  type History = {
    /** emoji列表 */
    emoji: string[]
  }
}
