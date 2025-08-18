import { URLEnum } from '@/enums'

let { VITE_SERVICE_URL } = import.meta.env
const savedProxy = localStorage.getItem('proxySettings')
if (savedProxy) {
  const settings = JSON.parse(savedProxy)
  const suffix = settings.apiIp + ':' + settings.apiPort + (settings.apiSuffix ? '/' + settings.apiSuffix : '')
  switch (settings.apiType) {
    case 'http':
    case 'https':
    case 'socket5':
      VITE_SERVICE_URL = settings.apiType + '://' + suffix
      break
    default:
      break
  }
}
const prefix = VITE_SERVICE_URL

export default {
  // 用户相关
  getBadgeList: `${prefix + URLEnum.USER}/badges`, // 获取徽章列表
  getMemberStatistic: `${prefix + URLEnum.CHAT}/member/statistic`,
  getUserInfoBatch: `${prefix + URLEnum.USER}/summary/userInfo/batch`,
  getBadgesBatch: `${prefix + URLEnum.USER}/badges/batch`,
  getAllUserBaseInfo: `${prefix + URLEnum.ROOM}/group/member/list`, // 房间内的所有群成员列表-@专用
  getMsgList: `${prefix + URLEnum.CHAT}/msg/page`,
  // sendMsg: `${prefix + URLEnum.CHAT}/msg`,
  getUserInfoDetail: `${prefix + URLEnum.USER}/userInfo`, // 获取用户信息详情
  modifyUserName: `${prefix + URLEnum.USER}/name`, // 修改用户名
  setUserBadge: `${prefix + URLEnum.USER}/badge`, // 设置用户徽章
  markMsg: `${prefix + URLEnum.CHAT}/msg/mark`, // 消息标记
  blockUser: `${prefix + URLEnum.USER}/black`, // 拉黑用户
  recallMsg: `${prefix + URLEnum.CHAT}/msg/recall`, // 撤回消息
  addEmoji: `${prefix + URLEnum.USER}/emoji`, // 增加表情
  deleteEmoji: `${prefix + URLEnum.USER}/emoji`, // 删除表情
  getEmoji: `${prefix + URLEnum.USER}/emoji/list`, // 查询表情包
  uploadAvatar: `${prefix + URLEnum.USER}/avatar`, // 上传头像
  getAllUserState: `${prefix + URLEnum.USER}/state/list`, // 获取所有用户状态
  changeUserState: `${prefix + URLEnum.USER}/state/changeState`, // 用户状态改变
  searchFriend: `${prefix + URLEnum.USER}/friend/search`, // 搜索好友

  // -------------- 好友相关 ---------------
  getContactList: `${prefix + URLEnum.USER}/friend/page`, // 联系人列表
  requestFriendList: `${prefix + URLEnum.ROOM}/apply/page`, // 好友申请、群聊邀请列表
  newFriendCount: `${prefix + URLEnum.ROOM}/apply/unread`, // 申请未读数
  handleInvite: `${prefix + URLEnum.ROOM}/apply/handler/apply`, // 审批别人邀请的进群
  sendAddFriendRequest: `${prefix + URLEnum.ROOM}/apply/apply`, // 申请好友\同意申请
  deleteFriend: `${prefix + URLEnum.USER}/friend`, // 删除好友
  modifyFriendRemark: `${prefix + URLEnum.USER}/friend/updateRemark`, // 修改好友备注

  // -------------- 聊天室相关 ---------------
  // getSessionList: `${prefix + URLEnum.CHAT}/contact/page`, // 会话列表
  getMsgReadList: `${prefix + URLEnum.CHAT}/msg/read/page`, // 消息的已读未读列表
  getMsgReadCount: `${prefix + URLEnum.CHAT}/msg/read`, // 消息已读未读数
  sessionDetail: `${prefix + URLEnum.CHAT}/contact/detail`, // 会话详情
  sessionDetailWithFriends: `${prefix + URLEnum.CHAT}/contact/detail/friend`, // 会话详情(联系人列表发消息用)
  setSessionTop: `${prefix + URLEnum.CHAT}/setTop`, // 设置会话置顶
  deleteSession: `${prefix + URLEnum.CHAT}/delete`, // 删除会话
  // hideSession: `${prefix + URLEnum.CHAT}/setHide`, // 隐藏会话
  notification: `${prefix + URLEnum.CHAT}/notification`, // 免打扰
  shield: `${prefix + URLEnum.CHAT}/setShield`, // 屏蔽消息
  // -------------- 群聊相关 ---------------
  createGroup: `${prefix + URLEnum.ROOM}/group`, // 新增群组
  // getGroupUserList: `${prefix + URLEnum.ROOM}/group/member/page`, // 群成员列表
  inviteGroupMember: `${prefix + URLEnum.ROOM}/group/member`, // 邀请群成员 和 移出群成员(post 和 delete)
  exitGroup: `${prefix + URLEnum.ROOM}/group/member/exit`, // 退群
  addAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 添加管理员
  revokeAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 删除管理员
  groupDetail: `${prefix + URLEnum.ROOM}/group`, // 群组详情
  groupList: `${prefix + URLEnum.ROOM}/group/list`, // 群聊列表
  updateRoomInfo: `${prefix + URLEnum.ROOM}/updateRoomInfo`, // 修改群信息(群主)
  updateMyRoomInfo: `${prefix + URLEnum.ROOM}/updateMyRoomInfo`, // 修改“我”的群聊名称
  searchGroup: `${prefix + URLEnum.ROOM}/search`, // 搜索群聊
  applyGroup: `${prefix + URLEnum.ROOM}/apply/group`, // 申请加群
  applyHandle: `${prefix + URLEnum.ROOM}/apply/adminHandleApply`, // 处理加群申请 [仅仅管理员、群主可调用]
  applyGroupList: `${prefix + URLEnum.ROOM}/apply/group/list`, // 申请加群列表 [仅仅管理员、群主可见]
  getAnnouncementList: `${prefix + URLEnum.ROOM}/announcement/list`, // 获取群公告
  pushAnnouncement: `${prefix + URLEnum.ROOM}/announcement/push`, // 发布群公告
  deleteAnnouncement: `${prefix + URLEnum.ROOM}/announcement/delete`, // 删除群公告
  editAnnouncement: `${prefix + URLEnum.ROOM}/announcement/edit`, // 编辑群公告

  // -------------- 验证码 ---------------
  getCaptcha: `${prefix + URLEnum.TOKEN}/anyTenant/captcha`, // 获取图片验证码
  sendCaptcha: `${prefix + URLEnum.TOKEN}/anyTenant/sendEmailCode`, // 发送验证码到用户邮箱

  // -------------- 系统相关 ---------------
  fileUpload: `${prefix + URLEnum.SYSTEM}/upload/url`, // 文件上传
  initConfig: `${prefix + URLEnum.SYSTEM}/anyTenant/config/init`, // 获取配置文件
  getQiniuToken: `${prefix + URLEnum.SYSTEM}/anyTenant/ossToken`, // 获取七牛云上传token

  // -------------- token相关 ---------------
  register: `${prefix + URLEnum.TOKEN}/anyTenant/registerByEmail`, // 注册
  login: `${prefix + URLEnum.TOKEN}/anyTenant/login`, // 登录
  refreshToken: `${prefix + URLEnum.TOKEN}/anyTenant/refresh`, // 续签
  logout: `${prefix + URLEnum.TOKEN}/anyUser/logout`, // 退出登录
  checkToken: `${prefix + URLEnum.TOKEN}/check`, // 检查token是否有效
  forgetPassword: `${prefix + URLEnum.TOKEN}/anyTenant/password` // 忘记密码
}
