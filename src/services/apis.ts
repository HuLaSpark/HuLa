import urls from '@/services/urls'
import {
  BadgeType,
  CacheBadgeItem,
  CacheBadgeReq,
  CacheUserItem,
  CacheUserReq,
  ContactItem,
  EmojiItem,
  GroupDetailReq,
  GroupListReq,
  GroupStatisticType,
  ListResponse,
  LoginUserReq,
  MarkMsgReq,
  MessageReq,
  MessageType,
  MsgReadUnReadCountType,
  PageInfo,
  RegisterUserReq,
  RequestFriendItem,
  SessionItem,
  UserInfoType,
  UserItem,
  UserState,
  Login,
  SearchFriend,
  SearchGroup,
  ConfigType,
  AnnouncementItem,
  PageResponse
} from '@/services/types'

import request from '@/services/request'
import { NotificationTypeEnum } from '@/enums'

const GET = <T>(url: string, params?: any, abort?: AbortController) => request.get<T>(url, params, abort)
const POST = <T>(url: string, params?: any, abort?: AbortController) => request.post<T>(url, params, abort)
const PUT = <T>(url: string, params?: any, abort?: AbortController) => request.put<T>(url, params, abort)
const DELETE = <T>(url: string, params?: any, abort?: AbortController) => request.delete<T>(url, params, abort)

export default {
  /** 获取群成员列表 */
  getGroupList: (params?: any) => GET<ListResponse<UserItem>>(urls.getGroupUserList, params),
  /** 获取群成员统计 */
  getMemberStatistic: () => GET<GroupStatisticType>(urls.getMemberStatistic),
  /** 房间内的所有群成员列表-@专用 */
  getAllUserBaseInfo: (params?: any) => GET<CacheUserItem[]>(urls.getAllUserBaseInfo, params),
  /** 批量获取成员详细信息 */
  getUserInfoBatch: (users: CacheUserReq[]) => POST<CacheUserItem[]>(urls.getUserInfoBatch, { reqList: users }),
  /** 批量获取徽章信息 */
  getBadgesBatch: (badges: CacheBadgeReq[]) => POST<CacheBadgeItem[]>(urls.getBadgesBatch, { reqList: badges }),
  /** 获取消息列表 */
  getMsgList: (params?: any) => GET<ListResponse<MessageType>>(urls.getMsgList, params),
  /** 发送消息 */
  sendMsg: (data?: MessageReq) => POST<MessageType>(urls.sendMsg, data),
  /** 标记消息，点赞等 */
  markMsg: (data?: MarkMsgReq) => PUT<void>(urls.markMsg, data),
  /** 获取用户详细信息 */
  getUserDetail: () => GET<UserInfoType>(urls.getUserInfoDetail),
  /** 获取徽章列表 */
  getBadgeList: () => GET<BadgeType>(urls.getBadgeList),
  /** 设置用户勋章 */
  setUserBadge: (badgeId: string) => PUT<void>(urls.setUserBadge, { badgeId }),
  /** 修改用户名 */
  modifyUserName: (name: string) => PUT<void>(urls.modifyUserName, { name }),
  /** 修改好友备注 */
  modifyFriendRemark: (data: { targetUid: string; remark: string }) => POST<void>(urls.modifyFriendRemark, data),
  /** 撤回消息 */
  recallMsg: (data: { msgId: string; roomId: string }) => PUT<void>(urls.recallMsg, data),
  /** 拉黑用户 */
  blockUser: (data: { uid: string }) => PUT<void>(urls.blockUser, data),
  /** 获取临时上传链接 */
  getUploadUrl: (params: any) => GET<{ downloadUrl: string; uploadUrl: string }>(urls.fileUpload, params),
  /** 上传头像 */
  uploadAvatar: (data: { avatar: string }) => POST<void>(urls.uploadAvatar, data),
  /** 新增表情包 */
  addEmoji: (data: { expressionUrl: string }) => POST<MessageType>(urls.addEmoji, data),
  /** 获取表情 **/
  getEmoji: (params: { uid: string }) => GET<EmojiItem[]>(urls.getEmoji, { params }),
  /** 删除Emoji */
  deleteEmoji: (params: { id: string }) => DELETE<EmojiItem[]>(urls.deleteEmoji, params),
  /** 获取联系人列表 */
  getContactList: (params?: any) => GET<ListResponse<ContactItem>>(urls.getContactList, params),
  /** 获取好友申请列表 */
  requestFriendList: (params?: any) => GET<ListResponse<RequestFriendItem>>(urls.requestFriendList, params),
  /** 发送添加好友请求 */
  sendAddFriendRequest: (params: { targetUid: string; msg: string }) => POST(urls.sendAddFriendRequest, params),
  /** 同意好友申请 */
  applyFriendRequest: (params: { applyId: string }) => PUT(urls.sendAddFriendRequest, params),
  /** 忽略好友申请 */
  ignoreFriendRequest: (params: { applyId: string }) => PUT(urls.ignoreFriendRequest, params),
  /** 拒绝好友申请 */
  rejectFriendRequest: (params: { applyId: string }) => PUT(urls.rejectFriendRequest, params),
  /** 删除好友 */
  deleteFriend: (params: { targetUid: string }) => DELETE(urls.deleteFriend, params),
  /** 好友申请未读数 */
  newFriendCount: () => GET<{ unReadCount: number }>(urls.newFriendCount),
  /** 会话列表 */
  getSessionList: (params?: any) => GET<ListResponse<SessionItem>>(urls.getSessionList, params),
  /** 消息的已读未读列表 */
  getMsgReadList: (params?: any) => GET<ListResponse<{ uid: string }>>(urls.getMsgReadList, params),
  /** 消息已读未读数 */
  getMsgReadCount: (params?: any) => GET<MsgReadUnReadCountType[]>(urls.getMsgReadCount, params),
  /** 消息阅读上报 */
  markMsgRead: (params?: any) => PUT<MsgReadUnReadCountType[]>(urls.getMsgReadCount, params),
  /** 新增群组 */
  createGroup: (params: { uidList: string[] }) => POST<{ id: number }>(urls.createGroup, params),
  /** 邀请群成员 */
  inviteGroupMember: (params: { roomId: string; uidList: string[] }) => POST(urls.inviteGroupMember, params),
  /** 删除群成员 */
  removeGroupMember: (params: { roomId: string; uid: string }) => DELETE(urls.inviteGroupMember, params),
  /** 群组详情 */
  groupDetail: (params: { id: string }) => GET<GroupDetailReq>(urls.groupDetail, params),
  /** 群聊列表 */
  groupList: (params: { current: number; size: number }) => GET<PageInfo<GroupListReq>>(urls.groupList, params),
  /** 会话详情 */
  sessionDetail: (params: { id: string }) => GET<SessionItem>(urls.sessionDetail, params),
  /** 搜索群聊 */
  searchGroup: (params: { account: string }) => GET<SearchGroup[]>(urls.searchGroup, params),
  /** 搜索好友 */
  searchFriend: (params: { key: string }) => GET<SearchFriend[]>(urls.searchFriend, params),
  /** 免打扰 */
  notification: (params: { roomId: string; type: NotificationTypeEnum }) => POST<void>(urls.notification, params),
  /** 屏蔽消息 */
  shield: (params: { roomId: string; state: boolean }) => POST<void>(urls.shield, params),
  /** 申请加群 */
  applyGroup: (params: { targetGroupId: string; msg: string }) => POST(urls.applyGroup, params),
  /** 会话详情(联系人列表发消息用) */
  sessionDetailWithFriends: (params: { id: string; roomType: number }) =>
    GET<SessionItem>(urls.sessionDetailWithFriends, params),
  /** 设置会话置顶 */
  setSessionTop: (params: { roomId: string; top: boolean }) => POST<void>(urls.setSessionTop, params),
  /** 删除会话 */
  deleteSession: (params: { roomId: string }) => DELETE<void>(urls.deleteSession, params),
  /** 隐藏会话 */
  hideSession: (params: { roomId: string; hide: boolean }) => POST<void>(urls.hideSession, params),
  /** 修改群信息(群主) */
  updateRoomInfo: (params: { id: string; name: string; avatar: string }) => POST<void>(urls.updateRoomInfo, params),
  /** 修改“我”的群聊名称 */
  updateMyRoomInfo: (params: { id: string; myName: string; remark: string }) =>
    POST<void>(urls.updateMyRoomInfo, params),
  /** 添加群管理 */
  addAdmin: ({ roomId, uidList }: { roomId: string; uidList: string[] }) =>
    PUT<boolean>(urls.addAdmin, {
      roomId,
      uidList
    }),
  /** 撤销群管理 */
  revokeAdmin: ({ roomId, uidList }: { roomId: string; uidList: string[] }) =>
    DELETE<boolean>(urls.revokeAdmin, {
      roomId,
      uidList
    }),
  /** 退群 */
  exitGroup: (params: { roomId: string }) => DELETE<boolean>(urls.exitGroup, params),
  /** 账号密码登录 */
  login: (user: LoginUserReq, abort?: AbortController) => POST<Login>(urls.login, user, abort),
  /** 退出登录 */
  logout: (autoLogin: boolean) => POST<string>(urls.logout, { autoLogin }),
  /** 注册 */
  register: (user: RegisterUserReq, abort?: AbortController) => POST<string>(urls.register, user, abort),
  /** 获取验证码 */
  getCaptcha: () => GET<{ img: string; uuid: string }>(urls.getCaptcha),
  /** 发送验证码 */
  sendCaptcha: (params: { email: string; code: string; uuid?: string; operationType?: 'register' | 'forgot' }) =>
    POST<void>(urls.sendCaptcha, params),
  /** 检查token是否有效 */
  checkToken: () => POST<string>(urls.checkToken),
  /** 获取所有用户状态 */
  getAllUserState: () => GET<UserState[]>(urls.getAllUserState),
  /** 用户状态改变 */
  changeUserState: (userStateId: string) => POST(`${urls.changeUserState}/${userStateId}`),
  /** 忘记密码 */
  forgetPassword: (params: { email: string; code: string; uuid: string; password: string }) =>
    POST<void>(urls.forgetPassword, params),
  /** 初始化配置 */
  initConfig: () => GET<ConfigType>(urls.initConfig),
  /** 获取七牛token */
  getQiniuToken: () =>
    GET<{
      storagePrefix: string
      domain: string
      token: string
      region?: string
    }>(urls.getQiniuToken),
  /** 获取群公告列表 */
  getAnnouncementList: (roomId: string, params: { current: number; size: number }) =>
    GET<PageResponse<AnnouncementItem[]>>(`${urls.getAnnouncementList}/${roomId}`, params),
  /** 发布群公告 */
  pushAnnouncement: (params: { roomId: string; content: string; top: boolean }) =>
    POST<{ msg: string; data: boolean }>(urls.pushAnnouncement, params),
  /** 删除群公告 */
  deleteAnnouncement: (id: string) => POST<{ msg: string; data: boolean }>(`${urls.deleteAnnouncement}/${id}`, {}),
  /** 编辑群公告 */
  editAnnouncement: (params: { id: string; roomId: string; content: string; top: boolean }) =>
    POST<any>(urls.editAnnouncement, params)
}
