import { URLEnum } from '@/enums'

const { PROD, VITE_SERVICE_URL } = import.meta.env
// 本地配置到 .env.development 里面修改。生产配置在 .env.production 里面
const prefix = PROD ? VITE_SERVICE_URL : ''

export default {
  getUserInfo: `${prefix + URLEnum.USER}/userInfo`, // 获取用户信息
  getBadgeList: `${prefix + URLEnum.USER}/badges`, // 获取徽章列表
  getMemberStatistic: `${prefix + URLEnum.CHAT}/public/member/statistic`,
  getUserInfoBatch: `${prefix + URLEnum.USER}/public/summary/userInfo/batch`,
  getBadgesBatch: `${prefix + URLEnum.USER}/public/badges/batch`,
  getAllUserBaseInfo: `${prefix + URLEnum.ROOM}/group/member/list`, // 房间内的所有群成员列表-@专用
  getMsgList: `${prefix + URLEnum.CHAT}/public/msg/page`,
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

  // -------------- 好友相关 ---------------
  getContactList: `${prefix + URLEnum.USER}/friend/page`, // 联系人列表
  requestFriendList: `${prefix + URLEnum.USER}/friend/apply/page`, // 好友申请列表
  sendAddFriendRequest: `${prefix + URLEnum.USER}/friend/apply`, // 申请好友
  deleteFriend: `${prefix + URLEnum.USER}/friend`, // 删除好友
  newFriendCount: `${prefix + URLEnum.USER}/friend/apply/unread`, // 申请未读数

  // -------------- 聊天室相关 ---------------
  getSessionList: `${prefix + URLEnum.CHAT}/public/contact/page`, // 会话列表
  getMsgReadList: `${prefix + URLEnum.CHAT}/msg/read/page`, // 消息的已读未读列表
  getMsgReadCount: `${prefix + URLEnum.CHAT}/msg/read`, // 消息已读未读数
  createGroup: `${prefix + URLEnum.ROOM}/group`, // 新增群组
  getGroupUserList: `${prefix + URLEnum.ROOM}/public/group/member/page`,
  inviteGroupMember: `${prefix + URLEnum.ROOM}/group/member`, // 邀请群成员
  exitGroup: `${prefix + URLEnum.ROOM}/group/member/exit`, // 退群
  addAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 添加管理员
  revokeAdmin: `${prefix + URLEnum.ROOM}/group/admin`, // 添加管理员
  groupDetail: `${prefix + URLEnum.ROOM}/public/group`, // 群组详情
  sessionDetail: `${prefix + URLEnum.CHAT}/public/contact/detail`, // 会话详情
  sessionDetailWithFriends: `${prefix + URLEnum.CHAT}/public/contact/detail/friend` // 会话详情(联系人列表发消息用)
}
