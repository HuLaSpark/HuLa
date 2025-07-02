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
  sendMsg: `${prefix + URLEnum.CHAT}/msg`,
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
  requestFriendList: `${prefix + URLEnum.USER}/friend/apply/page`, // 好友申请列表
  sendAddFriendRequest: `${prefix + URLEnum.USER}/friend/apply`, // 申请好友\同意申请
  rejectFriendRequest: `${prefix + URLEnum.USER}/friend/reject`, // 拒绝好友申请
  ignoreFriendRequest: `${prefix + URLEnum.USER}/friend/ignore`, // 忽略好友申请
  deleteFriend: `${prefix + URLEnum.USER}/friend`, // 删除好友
  newFriendCount: `${prefix + URLEnum.USER}/friend/apply/unread`, // 申请未读数
  modifyFriendRemark: `${prefix + URLEnum.USER}/friend/updateRemark`, // 修改好友备注

  // -------------- 聊天室相关 ---------------
  getSessionList: `${prefix + URLEnum.CHAT}/contact/page`, // 会话列表
  getMsgReadList: `${prefix + URLEnum.CHAT}/msg/read/page`, // 消息的已读未读列表
  getMsgReadCount: `${prefix + URLEnum.CHAT}/msg/read`, // 消息已读未读数
  sessionDetail: `${prefix + URLEnum.CHAT}/contact/detail`, // 会话详情
  sessionDetailWithFriends: `${prefix + URLEnum.CHAT}/contact/detail/friend`, // 会话详情(联系人列表发消息用)
  setSessionTop: `${prefix + URLEnum.CHAT}/setTop`, // 设置会话置顶
  deleteSession: `${prefix + URLEnum.CHAT}/delete`, // 删除会话
  hideSession: `${prefix + URLEnum.CHAT}/setHide`, // 隐藏会话
  notification: `${prefix + URLEnum.CHAT}/notification`, // 免打扰
  shield: `${prefix + URLEnum.CHAT}/setShield`, // 屏蔽消息
  // -------------- 群聊相关 ---------------
  createGroup: `${prefix + URLEnum.ROOM}/group`, // 新增群组
  getGroupUserList: `${prefix + URLEnum.ROOM}/group/member/page`, // 群成员列表
  inviteGroupMember: `${prefix + URLEnum.ROOM}/group/member`, // 邀请群成员 和 移出群成员(post 和 delete)
  exitGroup: `${prefix + URLEnum.ROOM}/group/member/exit`, // 退群
  addAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 添加管理员
  revokeAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 删除管理员
  groupDetail: `${prefix + URLEnum.ROOM}/group`, // 群组详情
  groupList: `${prefix + URLEnum.ROOM}/group/list`, // 群聊列表
  updateRoomInfo: `${prefix + URLEnum.ROOM}/updateRoomInfo`, // 修改群信息(群主)
  updateMyRoomInfo: `${prefix + URLEnum.ROOM}/updateMyRoomInfo`, // 修改“我”的群聊名称
  searchGroup: `${prefix + URLEnum.ROOM}/search`, // 搜索群聊
  applyGroup: `${prefix + URLEnum.ROOM}/applyGroup`, // 申请加群
  getAnnouncementList: `${prefix + URLEnum.ROOM}/announcement/list`, // 获取群公告
  pushAnnouncement: `${prefix + URLEnum.ROOM}/announcement/push`, // 发布群公告
  deleteAnnouncement: `${prefix + URLEnum.ROOM}/announcement/delete`, // 删除群公告
  editAnnouncement: `${prefix + URLEnum.ROOM}/announcement/edit`, // 编辑群公告

  // -------------- 验证码 ---------------
  getCaptcha: `${prefix + URLEnum.CAPTCHA}/captcha`, // 获取图片验证码
  sendCaptcha: `${prefix + URLEnum.CAPTCHA}/sendCode`, // 发送验证码到用户邮箱

  // -------------- 系统相关 ---------------
  fileUpload: `${prefix + URLEnum.SYSTEM + URLEnum.OSS}/upload/url`, // 文件上传
  initConfig: `${prefix + URLEnum.SYSTEM}/config/init`, // 获取配置文件
  getQiniuToken: `${prefix + URLEnum.SYSTEM}/ossToken`, // 获取七牛云上传token

  // -------------- token相关 ---------------
  register: `${prefix + URLEnum.TOKEN}/register`, // 注册
  login: `${prefix + URLEnum.TOKEN}/login`, // 登录
  refreshToken: `${prefix + URLEnum.TOKEN}/refreshToken`, // 续签
  logout: `${prefix + URLEnum.TOKEN}/logout`, // 退出登录
  checkToken: `${prefix + URLEnum.TOKEN}/check`, // 检查token是否有效
  forgetPassword: `${prefix + URLEnum.TOKEN}/forgotPassword` // 忘记密码
}
