import { defineStore } from 'pinia'
import apis from '@/services/apis'
import { useGlobalStore } from '@/stores/global'
import type { ContactItem, RequestFriendItem } from '@/services/types'
import { RequestFriendAgreeStatus } from '@/services/types'

export const pageSize = 20
export const useContactStore = defineStore('contact', () => {
  const globalStore = useGlobalStore()
  const contactsList = reactive<ContactItem[]>([])
  const requestFriendsList = reactive<RequestFriendItem[]>([])
  const contactsOptions = reactive({ isLast: false, isLoading: false, cursor: '' })
  const requestFriendsOptions = reactive({ isLast: false, isLoading: false, cursor: '' })
  const getContactList = async (isFresh = false) => {
    if (!isFresh) {
      if (contactsOptions.isLast || contactsOptions.isLoading) return
    }
    contactsOptions.isLoading = true
    const res = await apis
      .getContactList({
        // TODO 先写 100，稍后优化
        pageSize: 100,
        cursor: isFresh || !contactsOptions.cursor ? undefined : contactsOptions.cursor
      })
      .catch(() => {
        contactsOptions.isLoading = false
      })
    if (!res) return
    const { data } = res
    isFresh ? contactsList.splice(0, contactsList.length, ...data.list) : contactsList.push(...data.list)
    contactsOptions.cursor = data.cursor
    contactsOptions.isLast = data.isLast
    contactsOptions.isLoading = false
  }

  /** 好友申请未读数 */
  const getNewFriendCount = async () => {
    const res = await apis.newFriendCount().catch(() => {
      //
    })
    if (!res) return
    const { data } = res
    if (typeof data?.unReadCount === 'number') {
      globalStore.unReadMark.newFriendUnreadCount = data.unReadCount
    }
  }

  const getRequestFriendsList = async (isFresh = false) => {
    if (!isFresh) {
      if (requestFriendsOptions.isLast || requestFriendsOptions.isLoading) return
    }
    requestFriendsOptions.isLoading = true
    const res = await apis
      .requestFriendList({
        pageSize,
        cursor: isFresh || !requestFriendsOptions.cursor ? undefined : requestFriendsOptions.cursor
      })
      .catch(() => {
        requestFriendsOptions.isLoading = false
      })
    // 每次加载完新的好友邀请列表都要更新申请未读数
    await getNewFriendCount()
    if (!res) return
    const { data } = res
    isFresh
      ? requestFriendsList.splice(0, requestFriendsList.length, ...data.list)
      : requestFriendsList.push(...data.list)
    requestFriendsOptions.cursor = data.cursor
    requestFriendsOptions.isLast = data.isLast
    requestFriendsOptions.isLoading = false
  }
  // 默认执行一次
  // getContactList()
  // getRequestFriendsList()
  /** 接受好友请求 */
  const onAcceptFriend = (applyId: number) => {
    // 同意好友申请
    apis.applyFriendRequest({ applyId }).then(() => {
      // 刷新好友申请列表
      getRequestFriendsList(true)
      // 刷新好友列表
      getContactList(true)
      // 标识为可以发消息的人
      if (globalStore.currentSelectedContact) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        globalStore.currentSelectedContact.status = RequestFriendAgreeStatus.Agree
      }
    })
  }
  /** 删除好友 */
  const onDeleteContact = async (uid: number) => {
    if (!uid) return
    // 同意好友申请
    await apis.deleteFriend({ targetUid: uid })
    // 刷新好友申请列表
    // getRequestFriendsList(true)
    // 刷新好友列表
    await getContactList(true)
  }
  return {
    getContactList,
    getRequestFriendsList,
    contactsList,
    requestFriendsList,
    contactsOptions,
    requestFriendsOptions,
    onAcceptFriend,
    onDeleteContact
  }
})
