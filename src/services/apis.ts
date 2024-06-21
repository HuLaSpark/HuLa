import { createAxios } from '@/services/request'
import urls from '@/services/urls'
import type {
  Response,
  BadgeType,
  CacheBadgeItem,
  CacheBadgeReq,
  CacheUserItem,
  CacheUserReq,
  ContactItem,
  EmojiItem,
  GroupDetailReq,
  GroupStatisticType,
  ListResponse,
  MarkMsgReq,
  MessageReq,
  MessageType,
  MsgReadUnReadCountType,
  RequestFriendItem,
  SessionItem,
  UserInfoType,
  UserItem
} from '@/services/types'

const request = createAxios()

const GET = <T>(url: string, params?: any) => request.get<T, Response>(url, params)
const POST = <T>(url: string, params?: any) => request.post<T, Response>(url, params)
const PUT = <T>(url: string, params?: any) => request.put<T, Response>(url, params)
const DELETE = <T>(url: string, params?: any) => request.delete<T, Response>(url, params)

export default {
  /** 获取用户信息 */
  getUserInfo: (): Promise<Response> => GET(urls.getUserInfo),
  /** 获取群成员列表 */
  getGroupList: (params?: any) => GET<ListResponse<UserItem>>(urls.getGroupUserList, params),
  /** 获取群成员统计 */
  getMemberStatistic: () => GET<GroupStatisticType>(urls.getMemberStatistic),
  /** 房间内的所有群成员列表-@专用 */
  getAllUserBaseInfo: (params?: any) =>
    GET<Pick<CacheUserItem, 'avatar' | 'name' | 'uid'>[]>(urls.getAllUserBaseInfo, params),
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
  getUserDetail: () => GET<UserInfoType>(urls.getUserInfoDetail, {}),
  /** 获取徽章列表 */
  getBadgeList: (): Promise<Response> => GET<BadgeType[]>(urls.getBadgeList),
  /** 设置用户勋章 */
  setUserBadge: (badgeId: number) => PUT<void>(urls.setUserBadge, { badgeId }),
  /** 修改用户名 */
  modifyUserName: (name: string) => PUT<void>(urls.modifyUserName, { name }),
  /** 撤回消息 */
  recallMsg: (data: { msgId: number; roomId: number }) => PUT<void>(urls.recallMsg, data),
  /** 拉黑用户 */
  blockUser: (data: { uid: number }) => PUT<void>(urls.blockUser, data),
  /** 获取临时上传链接 */
  getUploadUrl: (params: any) => GET<{ downloadUrl: string; uploadUrl: string }>(urls.fileUpload, { params }),
  /** 新增表情包 */
  addEmoji: (data: { uid: number; expressionUrl: string }) => POST<MessageType>(urls.addEmoji, data),
  /** 获取表情 **/
  getEmoji: (params: { uid: number }) => GET<EmojiItem[]>(urls.getEmoji, { params }),
  /** 删除id */
  deleteEmoji: (params: { id: number }) => DELETE<EmojiItem[]>(urls.deleteEmoji, params),
  /** 获取联系人列表 */
  getContactList: (params?: any) => GET<ListResponse<ContactItem>>(urls.getContactList, { params }),
  /** 获取好友申请列表 */
  requestFriendList: (params?: any) => GET<ListResponse<RequestFriendItem>>(urls.requestFriendList, { params }),
  /** 发送添加好友请求 */
  sendAddFriendRequest: (params: { targetUid: number; msg: string }) =>
    POST<EmojiItem[]>(urls.sendAddFriendRequest, params),
  /** 同意好友申请 */
  applyFriendRequest: (params: { applyId: number }) => PUT(urls.sendAddFriendRequest, params),
  /** 同意好友申请 */
  deleteFriend: (params: { targetUid: number }) => DELETE(urls.deleteFriend, params),
  /** 好友申请未读数 */
  newFriendCount: () => GET<{ unReadCount: number }>(urls.newFriendCount),
  /** 会话列表 */
  getSessionList: (params?: any) => GET<ListResponse<SessionItem>>(urls.getSessionList, params),
  /** 消息的已读未读列表 */
  getMsgReadList: (params?: any) => GET<ListResponse<{ uid: number }>>(urls.getMsgReadList, params),
  /** 消息已读未读数 */
  getMsgReadCount: (params?: any) => GET<MsgReadUnReadCountType[]>(urls.getMsgReadCount, params),
  /** 消息阅读上报 */
  markMsgRead: (params?: any) => PUT<MsgReadUnReadCountType[]>(urls.getMsgReadCount, params),
  /** 新增群组 */
  createGroup: (params: { uidList: number[] }) => POST<{ id: number }>(urls.createGroup, params),
  /** 邀请群成员 */
  inviteGroupMember: (params: { roomId: number; uidList: number[] }) => POST(urls.inviteGroupMember, params),
  /** 删除群成员 */
  removeGroupMember: (params: { roomId: number; uid: number }) => DELETE(urls.inviteGroupMember, params),
  /** 群组详情 */
  groupDetail: (params: { id: number }) => GET<GroupDetailReq>(urls.groupDetail, { params }),
  /** 会话详情 */
  sessionDetail: (params: { id: number }) => GET<SessionItem>(urls.sessionDetail, { params }),
  /** 会话详情(联系人列表发消息用) */
  sessionDetailWithFriends: (params: { uid: number }) => GET<SessionItem>(urls.sessionDetailWithFriends, { params }),
  /** 添加群管理 */
  addAdmin: ({ roomId, uidList }: { roomId: number; uidList: number[] }) =>
    PUT<boolean>(urls.addAdmin, {
      roomId,
      uidList
    }),
  /** 撤销群管理 */
  revokeAdmin: ({ roomId, uidList }: { roomId: number; uidList: number[] }) =>
    DELETE<boolean>(urls.revokeAdmin, {
      roomId,
      uidList
    }),
  /** 退群 */
  exitGroup: ({ roomId }: { roomId: number }) =>
    DELETE<boolean>(urls.exitGroup, {
      roomId
    })
}
