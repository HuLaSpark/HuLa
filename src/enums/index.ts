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
  /**Token*/
  TOKEN = '/token',
  /**聊天*/
  CHAT = '/chat',
  /**房间*/
  ROOM = '/room',
  /**oss*/
  OSS = '/oss',
  /**系统*/
  SYSTEM = '/system',
  /**验证码*/
  CAPTCHA = '/captcha'
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
  UPDATE_MSG_TOTAL = 'updateMsgTotal',
  /** 显示消息框 */
  MSG_BOX_SHOW = 'msgBoxShow',
  /** 跳到发送信息 */
  TO_SEND_MSG = 'toSendMsg',
  /** 缩小窗口 */
  SHRINK_WINDOW = 'windowShrink',
  /** 详情页面显示 */
  DETAILS_SHOW = 'detailsShow',
  /** 好友申请页面显示 */
  APPLY_SHOW = 'applyShow',
  /** 回复消息 */
  REPLY_MEG = 'replyMsg',
  /** 手动触发InfoPopover */
  INFO_POPOVER = 'infoPopover',
  /** 打开个人信息编辑窗口 */
  OPEN_EDIT_INFO = 'openEditInfo',
  /** 关闭个人信息浮窗 */
  CLOSE_INFO_SHOW = 'closeInfoShow',
  /** 左边菜单弹窗 */
  LEFT_MODAL_SHOW = 'leftModalShow',
  /** 触发home窗口事件 */
  HOME_WINDOW_RESIZE = 'homeWindowResize',
  /** @ AT */
  AT = 'at',
  /** 重新编辑 */
  RE_EDIT = 'reEdit',
  /** 删除会话 */
  DELETE_SESSION = 'deleteSession',
  /** 隐藏会话 */
  HIDE_SESSION = 'hideSession',
  /** 定位会话 */
  LOCATE_SESSION = 'locateSession',
  /** 消息动画 */
  MESSAGE_ANIMATION = 'messageAnimation',
  /** 聊天框滚动到底部 */
  CHAT_SCROLL_BOTTOM = 'chatScrollBottom',
  /** 创建群聊 */
  CREATE_GROUP = 'createGroup',
  /** 更新提示 */
  CHECK_UPDATE = 'checkUpdate',
  /** 强制更新 */
  DO_UPDATE = 'doUpdate',
  /** 视频下载状态更新 */
  VIDEO_DOWNLOAD_STATUS_UPDATED = 'videoDownloadStatusUpdated',
  /** 切换语言页面 */
  VOICE_RECORD_TOGGLE = 'voiceRecordToggle'
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
  /** 历史内容 */
  HISTORY = 'history',
  /** 聊天列表 */
  CHAT_LIST = 'chatList',
  /** 插件列表 */
  PLUGINS = 'plugins',
  /** 侧边栏头部菜单栏 */
  MENUTOP = 'menuTop',
  /** 账号账号历史记录列表 */
  LOGIN_HISTORY = 'loginHistory',
  /** 好友列表 */
  NOTICE = 'notice',
  /** 图片查看器数据 */
  IMAGEVIEWER = 'imageViewer',
  /** 用户状态 */
  USER_STATE = 'userState',
  /** 用户 */
  USER = 'user',
  /** 群组 */
  GROUP = 'group',
  /** 全局 */
  GLOBAL = 'global',
  /** 表情 */
  EMOJI = 'emoji',
  /** 联系人 */
  CONTACTS = 'contacts',
  /** 聊天 */
  CHAT = 'chat',
  /** 缓存 */
  CACHED = 'cached',
  /** 配置 */
  CONFIG = 'config',
  /** 视频查看器数据 */
  VIDEOVIEWER = 'videoViewer',
  /** 文件下载管理 */
  FILE_DOWNLOAD = 'fileDownload'
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
  /** 合并消息 */
  MERGE,
  /** 公告 */
  NOTICE,
  /** 混合 */
  MIXED,
  /** 艾特 */
  AIT,
  /** 回复 */
  REPLY,
  /** AI */
  AI
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

/** 性别 */
export enum SexEnum {
  /** 男 */
  MAN = 1,
  /** 女 */
  REMALE
}

/** 权限状态 */
export enum PowerEnum {
  /** 用户 */
  USER,
  /** 管理员 */
  ADMIN
}

/** 是否状态 */
export enum IsYesEnum {
  /** 否 */
  NO,
  /** 是 */
  YES
}

export enum MarkEnum {
  /** 点赞 */
  LIKE = 1,
  /** 不满 */
  DISLIKE,
  /** 爱心 */
  HEART,
  /** 愤怒 */
  ANGRY,
  /** 礼炮 */
  CELEBRATE,
  /** 火箭 */
  ROCKET,
  /** 笑哭 */
  LOL,
  /** 鼓掌 */
  APPLAUSE,
  /** 鲜花 */
  FLOWER,
  /** 炸弹 */
  BOMB,
  /** 疑问 */
  CONFUSED,
  /** 胜利 */
  VICTORY,
  /** 灯光 */
  LIGHT,
  /** 红包 */
  MONEY
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

/** 房间操作 */
export enum RoomActEnum {
  /** 退出群聊 */
  EXIT_GROUP,
  /** 解散群聊 */
  DISSOLUTION_GROUP,
  /** 删除好友 */
  DELETE_FRIEND,
  /** 删除记录 */
  DELETE_RECORD,
  /** 屏蔽好友 */
  BLOCK_FRIEND
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
export enum WorkerMsgEnum {
  /** open */
  OPEN = 'open',
  /** message */
  MESSAGE = 'message',
  /** close */
  CLOSE = 'close',
  /** error */
  ERROR = 'error',
  /** ws_error */
  WS_ERROR = 'wsError'
}

/** 左边菜单弹出框类型 */
export enum ModalEnum {
  /** 锁屏弹窗 */
  LOCK_SCREEN,
  /** 检查更新弹窗 */
  CHECK_UPDATE,
  /** 异地登录弹窗 */
  REMOTE_LOGIN
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

/** 菜单显示模式 */
export enum ShowModeEnum {
  /** 图标方式 */
  ICON,
  /** 文字方式 */
  TEXT
}

/**
 * 消息发送状态
 */
export enum MessageStatusEnum {
  PENDING = 'pending',
  SENDING = 'sending',
  SUCCESS = 'success',
  FAILED = 'failed'
}

/** 触发类型枚举 */
export const enum TriggerEnum {
  MENTION = '@',
  AI = '/',
  TOPIC = '#'
}

/** 连接状态枚举 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

/** 上传scene值状态 */
export enum UploadSceneEnum {
  /** 聊天 */
  CHAT = 'chat',
  /** 表情 */
  EMOJI = 'emoji',
  /** 头像 */
  AVATAR = 'avatar'
}

/** 会话操作 */
export enum SessionOperateEnum {
  /** 删除好友 */
  DELETE_FRIEND = 0,
  /** 解散群聊 */
  DISSOLUTION_GROUP = 1,
  /** 退出群聊 */
  EXIT_GROUP = 2 | 3
}

/**
 * 通知类型 0 -> 允许接受消息 1 -> 接收但不提醒[免打扰] 2 -> 屏蔽消息
 */
export enum NotificationTypeEnum {
  /** 允许接受消息 */
  RECEPTION = 0,
  /** 接收但不提醒[免打扰] */
  NOT_DISTURB = 1
}
