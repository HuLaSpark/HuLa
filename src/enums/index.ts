/**
 * 全局枚举文件
 * 如果枚举值需要在全局使用，那么请在此文件中定义。其他枚举值请在对应的文件中定义。
 * 定义规则：
 *  枚举名：XxxEnum
 *  枚举值：全部大写，单词间用下划线分割
 */

/**请求响应码类型*/
export enum RCodeEnum {
  /**成功请求*/
  OK = '200',
  /**请求错误*/
  FAIL = '400',
  /**服务器出现问题*/
  SERVE_EXCEPTION = '500',
  /**业务出现问题*/
  BUSINESS_EXCEPTION = '600'
}
/**URL*/
export enum URLEnum {
  /**用户*/
  USER = '/user',
  /**文章*/
  ARTICLE = '/article'
}

/** tauri原生跨窗口通信时传输的类型 */
export enum EventEnum {
  /** 主题 */
  THEME = 'theme',
  /** 窗口关闭 */
  WIN_CLOSE = 'winClose',
  /** 窗口显示 */
  WIN_SHOW = 'winShow',
  /** 退出程序 */
  EXIT = 'exit',
  /** 设置在线状态 */
  SET_OL_STS = 'setOnlineStatus',
  /** 独立窗口 */
  ALONE = 'alone',
  /** 修改关闭主面板的行为 */
  CLOSE_HOME = 'closeHome'
}

/** 主题类型 */
export enum ThemeEnum {
  /** 亮色 */
  LIGHT = 'light',
  /** 暗色 */
  DARK = 'dark',
  /** 跟随系统 */
  OS = 'os'
}

/* pinia存储的名称 */
export enum StoresEnum {
  /* 置顶 */
  ALWAYS_ON_TOP = 'alwaysOnTop',
  /* 设置 */
  SETTING = 'setting',
  /* 在线状态 */
  ONLINE_STATUS = 'onlineStatus'
}

/**
 * 消息类型
 */
export enum MsgEnum {
  /** 文本 */
  TEXT,
  /** 图片 */
  IMAGE,
  /** 混合 */
  MIXED,
  /** 语音 */
  VOICE,
  /** 视频 */
  VIDEO,
  /** 文件 */
  FILE,
  /** 表情 */
  EMOTICON,
  /** 超链接 */
  HYPERLINK
}

/** 房间类型 1群聊 2单聊 */
export enum RoomTypeEnum {
  /** 1群聊 */
  GROUP = 1,
  /** 2单聊 */
  SINGLE
}

/** 关闭窗口的行为 */
export enum CloseBxEnum {
  /** 隐藏 */
  HIDE = 'hide',
  /** 关闭 */
  CLOSE = 'close'
}
