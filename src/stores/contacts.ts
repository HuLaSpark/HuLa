import { defineStore } from 'pinia'
import apis from '@/services/apis'
import { useGlobalStore } from '@/stores/global'
import type { ContactItem, GroupListReq, RequestFriendItem } from '@/services/types'
import { RequestFriendAgreeStatus } from '@/services/types'
import { listen, emit } from '@tauri-apps/api/event'

// 定义分页大小常量
export const pageSize = 20
export const useContactStore = defineStore('contact', () => {
  const globalStore = useGlobalStore()

  /** 联系人列表 */
  const contactsList = reactive<ContactItem[]>([])
  /** 好友请求列表 */
  const requestFriendsList = reactive<RequestFriendItem[]>([])

  /** 联系人列表分页选项 */
  const contactsOptions = reactive({ isLast: false, isLoading: false, cursor: '' })
  /** 好友请求列表分页选项 */
  const requestFriendsOptions = reactive({ isLast: false, isLoading: false, cursor: '' })

  /** 群聊列表 */
  const groupChatList = reactive<GroupListReq[]>([])

  /**
   * 获取联系人列表
   * @param isFresh 是否刷新列表，true则重新加载，false则加载更多
   */
  const getContactList = async (isFresh = false) => {
    // 非刷新模式下，如果已经加载完或正在加载中，则直接返回
    if (!isFresh) {
      if (contactsOptions.isLast || contactsOptions.isLoading) return
    }
    contactsOptions.isLoading = true
    const res = await apis
      .getContactList({
        // TODO 先写 100，稍后优化
        pageSize: 100,
        cursor: isFresh || !contactsOptions.cursor ? '' : contactsOptions.cursor
      })
      .catch(() => {
        contactsOptions.isLoading = false
      })
    if (!res) return
    const data = res
    // 刷新模式下替换整个列表，否则追加到列表末尾
    isFresh ? contactsList.splice(0, contactsList.length, ...data.list) : contactsList.push(...data.list)
    contactsOptions.cursor = data.cursor
    contactsOptions.isLast = data.isLast
    contactsOptions.isLoading = false

    // 获取数据后发送更新事件
    emit('contacts-updated', contactsList)
  }

  /**
   * 获取群聊列表
   */
  const getGroupChatList = async () => {
    const response = await apis.groupList({ current: 1, size: 50 })
    groupChatList.push(...response.records)
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
      if (requestFriendsOptions.isLast || requestFriendsOptions.isLoading) return
    }
    requestFriendsOptions.isLoading = true
    const res = await apis
      .requestFriendList({
        pageSize,
        cursor: isFresh || !requestFriendsOptions.cursor ? '' : requestFriendsOptions.cursor
      })
      .catch(() => {
        requestFriendsOptions.isLoading = false
      })
    if (!res) return
    const data = res
    // 刷新模式下替换整个列表，否则追加到列表末尾
    isFresh
      ? requestFriendsList.splice(0, requestFriendsList.length, ...data.list)
      : requestFriendsList.push(...data.list)
    requestFriendsOptions.cursor = data.cursor
    requestFriendsOptions.isLast = data.isLast
    requestFriendsOptions.isLoading = false
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

  // 监听联系人列表更新事件
  listen('contacts-updated', (event: any) => {
    contactsList.splice(0, contactsList.length, ...event.payload)
  })

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
