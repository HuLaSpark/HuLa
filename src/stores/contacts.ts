import { defineStore } from 'pinia'
import { ImUrlEnum, StoresEnum, TauriCommand } from '@/enums'
import apis from '@/services/apis'
import type { ContactItem, GroupListReq, RequestFriendItem } from '@/services/types'
import { RequestFriendAgreeStatus } from '@/services/types'
import { useGlobalStore } from '@/stores/global'
import { getApplyUnreadCount, imRequest } from '@/utils/ImRequestUtils'
import { ErrorType, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'

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
  const applyPageOptions = ref({ isLast: false, isLoading: false, cursor: '', pageNo: 1 })

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

    const res: any = await imRequest({
      url: ImUrlEnum.GET_CONTACT_LIST,
      params: {
        pageSize: 100,
        cursor: isFresh || !contactsOptions.value.cursor ? '' : contactsOptions.value.cursor
      }
    }).catch(() => {
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
    const response: any = await invokeWithErrorHandler(
      TauriCommand.PAGE_ROOM,
      {
        pageParam: { current: 1, size: 50 }
      },
      {
        customErrorMessage: '获取群聊列表失败',
        errorType: ErrorType.Network
      }
    )
    groupChatList.value = response.records
  }

  /**
   * 获取好友申请未读数
   * 更新全局store中的未读计数
   */
  const getApplyUnReadCount = async () => {
    const res: any = await getApplyUnreadCount()
    if (!res) return
    // 更新全局store中的未读计数
    globalStore.unReadMark.newFriendUnreadCount = res.unReadCount4Friend
    globalStore.unReadMark.newGroupUnreadCount = res.unReadCount4Group
  }

  /**
   * 获取好友申请列表
   * @param isFresh 是否刷新列表，true则重新加载，false则加载更多
   */
  const getApplyPage = async (isFresh = false) => {
    // 非刷新模式下，如果已经加载完或正在加载中，则直接返回
    if (!isFresh) {
      if (applyPageOptions.value.isLast || applyPageOptions.value.isLoading) return
    }

    // 设置加载状态
    applyPageOptions.value.isLoading = true

    // 刷新时重置页码
    if (isFresh) {
      applyPageOptions.value.pageNo = 1
      applyPageOptions.value.cursor = ''
    }

    try {
      const res = await apis.getApplyPage({
        pageNo: applyPageOptions.value.pageNo,
        pageSize: 30,
        cursor: isFresh ? '' : applyPageOptions.value.cursor
      })
      if (!res) return
      // 刷新模式下替换整个列表，否则追加到列表末尾
      if (isFresh) {
        requestFriendsList.value.splice(0, requestFriendsList.value.length, ...res.list)
      } else {
        requestFriendsList.value.push(...res.list)
      }

      // 更新分页信息
      applyPageOptions.value.cursor = res.cursor
      applyPageOptions.value.isLast = res.isLast

      // 如果有返回pageNo，则使用服务器返回的pageNo，否则自增页码
      if (res.pageNo) {
        applyPageOptions.value.pageNo = res.pageNo + 1
      } else {
        applyPageOptions.value.pageNo++
      }
    } catch (error) {
      console.error('获取好友申请列表失败:', error)
    } finally {
      applyPageOptions.value.isLoading = false
    }
  }

  /**
   * 处理好友/群申请
   * @param apply 好友申请信息
   * @param state 处理状态 0拒绝 2同意 3忽略
   */
  const onHandleInvite = async (apply: { applyId: string; state: number }) => {
    // 同意好友申请
    apis.handleInviteApi(apply).then(async () => {
      // 刷新好友申请列表
      await getApplyPage(true)
      // 刷新好友列表
      await getContactList(true)
      // 获取最新的未读数
      await getApplyUnReadCount()
      // 更新当前选中联系人的状态
      if (globalStore.currentSelectedContact) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        globalStore.currentSelectedContact.status = RequestFriendAgreeStatus.Agree
      }
      // 获取最新的未读数
      await getApplyUnReadCount()
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
    getApplyPage,
    getApplyUnReadCount,
    contactsList,
    groupChatList,
    requestFriendsList,
    contactsOptions,
    applyPageOptions,
    onDeleteContact,
    onHandleInvite
  }
})
