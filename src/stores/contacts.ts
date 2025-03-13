import { defineStore } from 'pinia'
import apis from '@/services/apis'
import { useGlobalStore } from '@/stores/global'
import type { ContactItem, GroupListReq, RequestFriendItem } from '@/services/types'
import { RequestFriendAgreeStatus } from '@/services/types'
import { StoresEnum } from '@/enums'

// 定义分页大小常量
export const pageSize = 20
export const useContactStore = defineStore(StoresEnum.CONTACTS, () => {
  const globalStore = useGlobalStore()

  /** 联系人列表 */
  const contactsList = ref<ContactItem[]>([])
  /** 好友请求列表 */
  const requestFriendsList = ref<RequestFriendItem[]>([])

  /** 联系人列表分页选项 */
  const contactsOptions = ref({ isLast: false, isLoading: false, cursor: '' })
  /** 好友请求列表分页选项 */
  const requestFriendsOptions = ref({ isLast: false, isLoading: false, cursor: '' })

  /** 群聊列表 */
  const groupChatList = ref<GroupListReq[]>([])

  /**
   * 获取联系人列表
   * @param isFresh 是否刷新列表，true则重新加载，false则加载更多
   */
  const getContactList = async (isFresh = false) => {
    // 非刷新模式下，如果已经加载完或正在加载中，则直接返回
    if (!isFresh) {
      if (contactsOptions.value.isLast || contactsOptions.value.isLoading) return
    }
    contactsOptions.value.isLoading = true
    const res = await apis
      .getContactList({
        // TODO 先写 100，稍后优化
        pageSize: 100,
        cursor: isFresh || !contactsOptions.value.cursor ? '' : contactsOptions.value.cursor
      })
      .catch(() => {
        contactsOptions.value.isLoading = false
      })
    if (!res) return
    const data = res
    // 刷新模式下替换整个列表，否则追加到列表末尾
    isFresh
      ? contactsList.value.splice(0, contactsList.value.length, ...data.list)
      : contactsList.value.push(...data.list)
    contactsOptions.value.cursor = data.cursor
    contactsOptions.value.isLast = data.isLast
    contactsOptions.value.isLoading = false

    // 获取数据后更新联系人列表
    contactsList.value.splice(0, contactsList.value.length, ...contactsList.value)
  }

  /**
   * 获取群聊列表
   */
  const getGroupChatList = async () => {
    const response = await apis.groupList({ current: 1, size: 50 })
    groupChatList.value = response.records
  }

  /**
   * 获取好友申请未读数
   * 更新全局store中的未读计数
   */
  const getNewFriendCount = async () => {
    const res = await apis.newFriendCount().catch(() => {
      // 出错时不更新计数
      return null
    })

    if (!res) return

    // 更新全局store中的未读计数
    globalStore.unReadMark.newFriendUnreadCount = res.unReadCount
  }

  /**
   * 获取好友申请列表
   * @param isFresh 是否刷新列表，true则重新加载，false则加载更多
   */
  const getRequestFriendsList = async (isFresh = false) => {
    // 非刷新模式下，如果已经加载完或正在加载中，则直接返回
    if (!isFresh) {
      if (requestFriendsOptions.value.isLast || requestFriendsOptions.value.isLoading) return
    }
    requestFriendsOptions.value.isLoading = true
    const res = await apis
      .requestFriendList({
        pageSize: 50,
        cursor: isFresh || !requestFriendsOptions.value.cursor ? '' : requestFriendsOptions.value.cursor
      })
      .catch(() => {
        requestFriendsOptions.value.isLoading = false
      })
    if (!res) return
    const data = res
    // 刷新模式下替换整个列表，否则追加到列表末尾
    isFresh
      ? requestFriendsList.value.splice(0, requestFriendsList.value.length, ...data.list)
      : requestFriendsList.value.push(...data.list)
    requestFriendsOptions.value.cursor = data.cursor
    requestFriendsOptions.value.isLast = data.isLast
    requestFriendsOptions.value.isLoading = false
  }

  // 初始化时默认执行一次加载
  // getContactList()
  // getRequestFriendsList()

  /**
   * 接受好友请求
   * @param applyId 好友申请ID
   * 处理流程：
   * 1. 调用接口同意好友申请
   * 2. 刷新好友申请列表
   * 3. 刷新好友列表
   * 4. 更新当前选中联系人的状态
   * 5. 更新未读数
   */
  const onAcceptFriend = async (applyId: string) => {
    // 同意好友申请
    apis.applyFriendRequest({ applyId }).then(async () => {
      // 刷新好友申请列表
      await getRequestFriendsList(true)
      // 刷新好友列表
      await getContactList(true)
      // 更新当前选中联系人的状态
      if (globalStore.currentSelectedContact) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        globalStore.currentSelectedContact.status = RequestFriendAgreeStatus.Agree
      }
      // 获取最新的未读数
      await getNewFriendCount()
    })
  }

  /**
   * 删除好友
   * @param uid 要删除的好友用户ID
   * 处理流程：
   * 1. 调用删除好友接口
   * 2. 刷新好友列表
   */
  const onDeleteContact = async (uid: string) => {
    if (!uid) return
    // 删除好友
    await apis.deleteFriend({ targetUid: uid })
    // 刷新好友申请列表
    // getRequestFriendsList(true)
    // 刷新好友列表
    await getContactList(true)
  }

  return {
    getContactList,
    getGroupChatList,
    getRequestFriendsList,
    getNewFriendCount,
    contactsList,
    groupChatList,
    requestFriendsList,
    contactsOptions,
    requestFriendsOptions,
    onAcceptFriend,
    onDeleteContact
  }
})
