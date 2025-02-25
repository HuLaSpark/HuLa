import { URLEnum } from '@/enums'

const { VITE_SERVICE_URL } = import.meta.env
const prefix = VITE_SERVICE_URL

export default {
  // 用户相关
  searchUsers: `${prefix + URLEnum.USER}/search/users`, // 好友中搜索用户 @author mint
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
  fileUpload: `${prefix + URLEnum.OSS}/upload/url`, // 文件上传
  addEmoji: `${prefix + URLEnum.USER}/emoji`, // 增加表情
  deleteEmoji: `${prefix + URLEnum.USER}/emoji`, // 删除表情
  getEmoji: `${prefix + URLEnum.USER}/emoji/list`, // 查询表情包
  uploadAvatar: `${prefix + URLEnum.USER}/avatar`, // 上传头像
  getAllUserState: `${prefix + URLEnum.USER}/state/list`, // 获取所有用户状态
  changeUserState: `${prefix + URLEnum.USER}/state/changeState`, // 用户状态改变

  // -------------- 好友相关 ---------------
  getContactList: `${prefix + URLEnum.USER}/friend/page`, // 联系人列表
  requestFriendList: `${prefix + URLEnum.USER}/friend/apply/page`, // 好友申请列表
  sendAddFriendRequest: `${prefix + URLEnum.USER}/friend/apply`, // 申请好友
  deleteFriend: `${prefix + URLEnum.USER}/friend`, // 删除好友
  newFriendCount: `${prefix + URLEnum.USER}/friend/apply/unread`, // 申请未读数

  // -------------- 聊天室相关 ---------------
  getSessionList: `${prefix + URLEnum.CHAT}/contact/page`, // 会话列表
  getMsgReadList: `${prefix + URLEnum.CHAT}/msg/read/page`, // 消息的已读未读列表
  getMsgReadCount: `${prefix + URLEnum.CHAT}/msg/read`, // 消息已读未读数
  sessionDetail: `${prefix + URLEnum.CHAT}/contact/detail`, // 会话详情
  sessionDetailWithFriends: `${prefix + URLEnum.CHAT}/contact/detail/friend`, // 会话详情(联系人列表发消息用)
  setSessionTop: `${prefix + URLEnum.CHAT}/setTop`, // 设置会话置顶
  deleteSession: `${prefix + URLEnum.CHAT}/hide`, // 删除会话

  // -------------- 群聊相关 ---------------
  createGroup: `${prefix + URLEnum.ROOM}/group`, // 新增群组
  getGroupUserList: `${prefix + URLEnum.ROOM}/group/member/page`, // 群成员列表
  inviteGroupMember: `${prefix + URLEnum.ROOM}/group/member`, // 邀请群成员 和 移出群成员(post 和 delete)
  exitGroup: `${prefix + URLEnum.ROOM}/group/member/exit`, // 退群
  addAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 添加管理员
  revokeAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 删除管理员
  groupDetail: `${prefix + URLEnum.ROOM}/group`, // 群组详情
  groupList: `${prefix + URLEnum.ROOM}/group/list`, // 群聊列表
  updateRoomInfo: `${prefix + URLEnum.ROOM}/updateRoomInfo`, // 修改群信息

  // token相关
  // 注册
  register: `${prefix + URLEnum.TOKEN}/register`,
  // 登录
  login: `${prefix + URLEnum.TOKEN}/login`,
  // 续签
  refreshToken: `${prefix + URLEnum.TOKEN}/refreshToken`,
  // 移动端登录
  mobileLogin: `${prefix + URLEnum.TOKEN}/mobileLogin`,
  // 退出登录
  logout: `${prefix + URLEnum.TOKEN}/logout`,
  // 检查token是否有效
  checkToken: `${prefix + URLEnum.TOKEN}/check`,
  // 下线
  offline: `${prefix + URLEnum.TOKEN}/offline`
}
