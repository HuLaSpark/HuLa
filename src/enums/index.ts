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
  USER = '/im/user',
  /**Token*/
  TOKEN = '/oauth',
  /**聊天*/
  CHAT = '/im/chat',
  /**房间*/
  ROOM = '/im/room',
  /**系统*/
  SYSTEM = '/system',
  /**验证码*/
  CAPTCHA = '/im/captcha',
  /**消息推送服务前缀*/
  WEBSOCKET = '/ws'
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
  LOCK_SCREEN = 'lockScreen',
  /** 多窗口 */
  MULTI_MSG = 'multiMsg'
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
  /** 打开修改群昵称弹窗 */
  OPEN_GROUP_NICKNAME_MODAL = 'openGroupNicknameModal',
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
  VOICE_RECORD_TOGGLE = 'voiceRecordToggle',
  /** 消息多选 */
  MSG_MULTI_CHOOSE = 'msgMultiChoose',
  /** 扫码事件 */
  QR_SCAN_EVENT = 'qrScanEvent',
  /** 移动端通话浮层请求 */
  MOBILE_RTC_CALL_REQUEST = 'mobileRtcCallRequest',
  /** 移动端关闭输入框面板 */
  MOBILE_CLOSE_PANEL = 'mobileClosePanel',
  /** 切换会话 */
  MSG_INIT = 'msg_init'
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
  /** 公告 */
  ANNOUNCEMENT = 'announcement',
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
  FILE_DOWNLOAD = 'fileDownload',
  /** 移动端状态 */
  MOBILE = 'mobile',
  /** 目录扫描器 */
  SCANNER = 'scanner',
  /** 引导状态 */
  GUIDE = 'guide',
  /** Bot 视图状态 */
  BOT = 'bot',
  /** 文件管理 */
  FILE = 'file'
}

/**
 * 消息类型
 * todo: 后续需要补充
 */
export enum MsgEnum {
  /** 未知 0*/
  UNKNOWN,
  /** 文本 1*/
  TEXT,
  /** 撤回 2*/
  RECALL,
  /** 图片 3*/
  IMAGE,
  /** 文件 4*/
  FILE,
  /** 语音 5*/
  VOICE,
  /** 视频 6*/
  VIDEO,
  /** 表情包 7*/
  EMOJI,
  /** 系统消息 8*/
  SYSTEM,
  /** 聊天记录 9*/
  MERGE,
  /** 公告 10*/
  NOTICE,
  /** 机器人 11*/
  BOT,
  /** 视频通话 12*/
  VIDEO_CALL,
  /** 语音通话 13*/
  AUDIO_CALL,
  /** 混合 14*/
  MIXED,
  /** 艾特 15*/
  AIT,
  /** 回复 16*/
  REPLY,
  /** AI 17*/
  AI,
  /** 位置 18*/
  LOCATION
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
  BLOCK_FRIEND,
  /** 修改群名称 */
  UPDATE_GROUP_NAME,
  /** 修改群信息 */
  UPDATE_GROUP_INFO
}

/** 变更类型 1 加入群组，2： 移除群组 */
export enum ChangeTypeEnum {
  /** 1 加入群组 */
  JOIN = 1,
  /** 2 移除群组 */
  REMOVE,
  /** 3 退出群组 */
  EXIT_GROUP
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
  '⇧' = '⇧',
  '^' = '^'
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
export enum TriggerEnum {
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

/** Tauri 命令 */
export enum TauriCommand {
  /** 更新我的群聊信息 */
  UPDATE_MY_ROOM_INFO = 'update_my_room_info',
  /** 获取房间成员 */
  GET_ROOM_MEMBERS = 'get_room_members',
  /** 分页查询所有房间 */
  PAGE_ROOM = 'page_room',
  /** 分页查询房间成员 */
  CURSOR_PAGE_ROOM_MEMBERS = 'cursor_page_room_members',
  /** 列出所有会话列表 */
  LIST_CONTACTS = 'list_contacts_command',
  /** 分页查询会话消息 */
  PAGE_MSG = 'page_msg',
  /** 保存用户信息 */
  SAVE_USER_INFO = 'save_user_info',
  /** 更新用户最后操作时间 */
  UPDATE_USER_LAST_OPT_TIME = 'update_user_last_opt_time',
  /** 发送消息 */
  SEND_MSG = 'send_msg',
  /** 保存消息 */
  SAVE_MSG = 'save_msg',
  /** 保存消息标记 */
  SAVE_MESSAGE_MARK = 'save_message_mark',
  /** 更新消息撤回状态 */
  UPDATE_MESSAGE_RECALL_STATUS = 'update_message_recall_status',
  /** 获取用户 tokens */
  GET_USER_TOKENS = 'get_user_tokens',
  /** 更新 token */
  UPDATE_TOKEN = 'update_token',
  /** 移除 token */
  REMOVE_TOKENS = 'remove_tokens',
  /** 查询聊天历史记录 */
  QUERY_CHAT_HISTORY = 'query_chat_history'
}

// 通话状态枚举
export enum RTCCallStatus {
  CALLING = 1, // 呼叫
  ACCEPT = 2, // 接听
  END = 3, // 结束
  REJECT = 4, // 拒绝
  ERROR = 5, // 错误中断
  BUSY = 6, // 忙线中
  CANCEL = 7 // 取消
}

// 通话类型枚举
export enum CallTypeEnum {
  AUDIO = 1, // 语音通话
  VIDEO = 2 // 视频通话
}

export enum ImUrlEnum {
  // Token 相关
  /** 登录 */
  LOGIN = 'login',
  /** 刷新token */
  REFRESH_TOKEN = 'refreshToken',
  /** 忘记密码 */
  FORGET_PASSWORD = 'forgetPassword',
  /** 检查token */
  CHECK_TOKEN = 'checkToken',
  /** 退出登录 */
  LOGOUT = 'logout',
  /** 注册 */
  REGISTER = 'register',

  // 系统相关
  /** 获取七牛云token */
  GET_QINIU_TOKEN = 'getQiniuToken',
  /** 初始化配置 */
  INIT_CONFIG = 'initConfig',
  /** 文件上传 */
  FILE_UPLOAD = 'fileUpload',
  /** 获取模型列表 */
  GET_ASSISTANT_MODEL_LIST = 'getAssistantModelList',

  // 验证码相关
  /** 发送验证码 */
  SEND_CAPTCHA = 'sendCaptcha',
  /** 获取验证码 */
  GET_CAPTCHA = 'getCaptcha',

  // 群公告相关
  /** 查看群公告 */
  ANNOUNCEMENT = 'announcement',
  /** 编辑群公告 */
  EDIT_ANNOUNCEMENT = 'editAnnouncement',
  /** 删除群公告 */
  DELETE_ANNOUNCEMENT = 'deleteAnnouncement',
  /** 发布群公告 */
  PUSH_ANNOUNCEMENT = 'pushAnnouncement',
  /** 获取群公告列表 */
  GET_ANNOUNCEMENT_LIST = 'getAnnouncementList',

  // 群聊申请相关
  /** 申请加群 */
  APPLY_GROUP = 'applyGroup',

  // 群聊搜索和管理
  /** 搜索群聊 */
  SEARCH_GROUP = 'searchGroup',
  /** 修改我的群聊信息 */
  UPDATE_MY_ROOM_INFO = 'updateMyRoomInfo',
  /** 修改群聊信息 */
  UPDATE_ROOM_INFO = 'updateRoomInfo',
  /** 群聊列表 */
  GROUP_LIST = 'groupList',
  /** 群聊详情 */
  GROUP_DETAIL = 'groupDetail',

  // 群聊管理员
  /** 撤销管理员 */
  REVOKE_ADMIN = 'revokeAdmin',
  /** 添加管理员 */
  ADD_ADMIN = 'addAdmin',

  // 群聊成员管理
  /** 退出群聊 */
  EXIT_GROUP = 'exitGroup',
  /** 接受邀请 */
  ACCEPT_INVITE = 'acceptInvite',
  /** 邀请列表 */
  INVITE_LIST = 'inviteList',
  /** 邀请群成员 */
  INVITE_GROUP_MEMBER = 'inviteGroupMember',
  /** 创建群聊 */
  CREATE_GROUP = 'createGroup',

  // 聊天会话相关
  /** 屏蔽消息 */
  SHIELD = 'shield',
  /** 通知设置 */
  NOTIFICATION = 'notification',
  /** 删除会话 */
  DELETE_SESSION = 'deleteSession',
  /** 设置会话置顶 */
  SET_SESSION_TOP = 'setSessionTop',
  /** 会话详情（联系人） */
  SESSION_DETAIL_WITH_FRIENDS = 'sessionDetailWithFriends',
  /** 会话详情 */
  SESSION_DETAIL = 'sessionDetail',

  // 消息已读未读
  /** 获取消息已读数 */
  GET_MSG_READ_COUNT = 'getMsgReadCount',
  /** 获取消息已读列表 */
  GET_MSG_READ_LIST = 'getMsgReadList',

  // 好友相关
  /** 修改好友备注 */
  MODIFY_FRIEND_REMARK = 'modifyFriendRemark',
  /** 删除好友 */
  DELETE_FRIEND = 'deleteFriend',
  /** 发送添加好友请求 */
  SEND_ADD_FRIEND_REQUEST = 'sendAddFriendRequest',
  /** 处理邀请 */
  HANDLE_INVITE = 'handleInvite',
  /** 通知未读数 */
  NOTICE_UN_READ_COUNT = 'noticeUnReadCount',
  /** 请求通知页面 */
  REQUEST_NOTICE_PAGE = 'requestNoticePage',
  /** 通知已读 */
  REQUEST_NOTICE_READ = 'RequestNoticeRead',
  /** 获取联系人列表 */
  GET_CONTACT_LIST = 'getContactList',
  /** 搜索好友 */
  SEARCH_FRIEND = 'searchFriend',

  // 用户状态相关
  /** 改变用户状态 */
  CHANGE_USER_STATE = 'changeUserState',
  /** 获取所有用户状态 */
  GET_ALL_USER_STATE = 'getAllUserState',

  // 二维码相关
  /** 生成二维码 */
  GENERATE_QR_CODE = 'generateQRCode',
  /** 检查二维码状态 */
  CHECK_QR_STATUS = 'checkQRStatus',
  /** 扫描二维码 */
  SCAN_QR_CODE = 'scanQRCode',
  /** 确认登录 */
  CONFIRM_QR_CODE = 'confirmQRCode',

  // 用户信息相关
  /** 上传头像 */
  UPLOAD_AVATAR = 'uploadAvatar',
  /** 获取表情 */
  GET_EMOJI = 'getEmoji',
  /** 删除表情 */
  DELETE_EMOJI = 'deleteEmoji',
  /** 添加表情 */
  ADD_EMOJI = 'addEmoji',
  /** 设置用户徽章 */
  SET_USER_BADGE = 'setUserBadge',
  /** 修改用户基础信息 */
  MODIFY_USER_INFO = 'ModifyUserInfo',
  /** 获取用户信息详情 */
  GET_USER_INFO_DETAIL = 'getUserInfoDetail',
  /** 批量获取徽章 */
  GET_BADGES_BATCH = 'getBadgesBatch',
  /** 获取徽章列表 */
  GET_BADGE_LIST = 'getBadgeList',
  /** 拉黑用户 */
  BLOCK_USER = 'blockUser',

  // 消息相关
  /** 撤回消息 */
  RECALL_MSG = 'recallMsg',
  /** 标记消息 */
  MARK_MSG = 'markMsg',
  /** 获取消息列表 */
  GET_MSG_LIST = 'getMsgList',
  /** 获取成员统计 */
  GET_MEMBER_STATISTIC = 'getMemberStatistic',

  // 群成员信息
  /** 获取所有用户基础信息 */
  GET_ALL_USER_BASE_INFO = 'getAllUserBaseInfo',

  GROUP_LIST_MEMBER = 'groupListMember',
  SEND_MSG = 'sendMsg',
  SET_HIDE = 'setHide',
  GET_FRIEND_PAGE = 'getFriendPage',
  MARK_MSG_READ = 'markMsgRead',
  /** 移出群成员 */
  REMOVE_GROUP_MEMBER = 'removeGroupMember',
  CHECK_EMAIL = 'checkEmail',

  MERGE_MSG = 'mergeMsg',
  GET_USER_BY_IDS = 'getUserByIds'
}

// 滚动意图管理枚举
export enum ScrollIntentEnum {
  NONE = 'none',
  INITIAL = 'initial', // 初始化或切换房间
  NEW_MESSAGE = 'new_message', // 新消息到达
  LOAD_MORE = 'load_more' // 加载更多历史消息
}

export enum MergeMessageType {
  SINGLE = 1,
  MERGE = 2
}

// 用户类型
export enum UserType {
  BOT = 'bot'
}
