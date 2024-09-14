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
  USER = '/api/user',
  /**聊天*/
  CHAT = '/api/chat',
  /**房间*/
  ROOM = '/api/room',
  /**oss*/
  OSS = '/api/oss'
}

/** tauri原生跨窗口通信时传输的类型 */
export enum EventEnum {
  /** 窗口关闭 */
  WIN_CLOSE = 'winClose',
  /** 窗口显示 */
  WIN_SHOW = 'winShow',
  /** 退出程序 */
  EXIT = 'exit',
  /** 退出账号 */
  LOGOUT = 'logout',
  /** 独立窗口 */
  ALONE = 'alone',
  /** 共享屏幕 */
  SHARE_SCREEN = 'shareScreen',
  /** 锁屏 */
  LOCK_SCREEN = 'lockScreen'
}

/** Mitt兄弟组件通信 */
export enum MittEnum {
  /** 更新消息数量 */
  UPDATE_MSG_TOTAL,
  /** 显示消息框 */
  MSG_BOX_SHOW,
  /** 发送消息 */
  SEND_MESSAGE,
  /** 跳到发送信息 */
  TO_SEND_MSG,
  /** 缩小窗口 */
  SHRINK_WINDOW,
  /** 详情页面显示 */
  DETAILS_SHOW,
  /** 消息列表被清空或者暂无消息 */
  NOT_MSG,
  /** 回复消息 */
  REPLY_MEG,
  /** 手动触发InfoPopover */
  INFO_POPOVER,
  /** 打开个人信息编辑窗口 */
  OPEN_EDIT_INFO,
  /** 关闭个人信息浮窗 */
  CLOSE_INFO_SHOW,
  /** 左边菜单弹窗 */
  LEFT_MODAL_SHOW
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

/** pinia存储的名称 */
export enum StoresEnum {
  /** 置顶 */
  ALWAYS_ON_TOP = 'alwaysOnTop',
  /** 设置 */
  SETTING = 'setting',
  /** 在线状态 */
  ONLINE_STATUS = 'onlineStatus',
  /** 历史内容 */
  HISTORY = 'history',
  /** 聊天列表 */
  CHAT_LIST = 'chatList',
  /** 插件列表 */
  PLUGINS = 'plugins',
  /** 侧边栏头部菜单栏 */
  MENUTOP = 'menuTop'
}

/**
 * 消息类型
 * todo: 后续需要补充
 */
export enum MsgEnum {
  /** 未知 */
  UNKNOWN,
  /** 文本 */
  TEXT,
  /** 撤回 */
  RECALL,
  /** 图片 */
  IMAGE,
  /** 文件 */
  FILE,
  /** 语音 */
  VOICE,
  /** 视频 */
  VIDEO,
  /** 表情包 */
  EMOJI,
  /** 系统消息 */
  SYSTEM,
  /** 混合 */
  MIXED,
  /** 艾特 */
  AIT,
  /** 回复 */
  REPLY
}

/**
 * 在线状态
 */
export enum OnlineEnum {
  /** 在线 */
  ONLINE = 1,
  /** 离线 */
  OFFLINE
}

/**
 * 操作类型
 */
export enum ActEnum {
  /** 确认 */
  Confirm = 1,
  /** 取消 */
  Cancel
}

export enum SexEnum {
  MAN = 1,
  REMALE
}

export enum PowerEnum {
  USER,
  ADMIN
}

export enum IsYetEnum {
  NO,
  YES
}

export enum MarkEnum {
  LIKE = 1,
  DISLIKE
}

// 成员角色 1群主 2管理员 3普通成员 4踢出群聊
export enum RoleEnum {
  /** 1群主 */
  LORD = 1,
  /** 2管理员 */
  ADMIN,
  /** 3普通成员 */
  NORMAL,
  /** 4踢出群聊 */
  REMOVED
}

/** 房间类型 1群聊 2单聊 */
export enum RoomTypeEnum {
  /** 1群聊 */
  GROUP = 1,
  /** 2单聊 */
  SINGLE = 2
}

/** 变更类型 1 加入群组，2： 移除群组 */
export enum ChangeTypeEnum {
  /** 1 加入群组 */
  JOIN = 1,
  /** 2 移除群组 */
  REMOVE
}

/** 关闭窗口的行为 */
export enum CloseBxEnum {
  /** 隐藏 */
  HIDE = 'hide',
  /** 关闭 */
  CLOSE = 'close'
}

/** 限制上传 */
export enum LimitEnum {
  /** 通用限制数量 */
  COM_COUNT = 5
}

/** ws请求类型 */
export enum WsReqEnum {
  /** 请求登录二维码 */
  LOGIN = 1,
  /** 心跳包 */
  HEARTBEAT = 2,
  /** 登录认证 */
  AUTHORIZE = 3
}

/** ws响应类型 */
export enum WsResEnum {
  /** 二维码登录 */
  QRCODE_LOGIN = 'qrcodeLogin',
  /** 登录成功 */
  LOGIN_SUCCESS = 'loginSuccess',
  /** ws连接错误 */
  WS_ERROR = 'wsError'
}

/** 左边菜单弹出框类型 */
export enum ModalEnum {
  /** 锁屏弹窗 */
  LOCK_SCREEN,
  /** 检查更新弹窗 */
  CHECK_UPDATE
}

/** MacOS键盘映射 */
export enum MacOsKeyEnum {
  '⌘' = '⌘',
  '⌥' = '⌥',
  '⇧' = '⇧'
}

/** Windows键盘映射 */
export enum WinKeyEnum {
  CTRL = 'Ctrl',
  WIN = 'Win',
  ALT = 'Alt',
  SHIFT = 'Shift'
}

/** 插件状态 */
export enum PluginEnum {
  /** 已内置 */
  BUILTIN,
  /** 已安装 */
  INSTALLED,
  /** 下载中 */
  DOWNLOADING,
  /** 未安装 */
  NOT_INSTALLED,
  /** 卸载中 */
  UNINSTALLING,
  /** 可更新 */
  CAN_UPDATE
}
