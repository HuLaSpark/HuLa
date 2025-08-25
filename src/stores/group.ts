import { defineStore } from 'pinia'
import { RoleEnum, RoomTypeEnum, StoresEnum, TauriCommand } from '@/enums'
import type { GroupDetailReq, UserItem } from '@/services/types'
import type { OnStatusChangeType } from '@/services/wsType'
import { useCachedStore } from '@/stores/cached'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user'
import * as ImRequestUtils from '@/utils/ImRequestUtils'
import { ErrorType, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'
import { useChatStore } from './chat'

export const useGroupStore = defineStore(StoresEnum.GROUP, () => {
  // 初始化需要使用的store
  const cachedStore = useCachedStore()
  const globalStore = useGlobalStore()
  const userStore = useUserStore()
  const chatStore = useChatStore()

  // 群组相关状态
  const userListMap = ref<Map<string, UserItem[]>>(new Map()) // 群成员列表Map，key为roomId
  const userListOptions = reactive({ isLast: false, loading: true, cursor: '' }) // 分页加载相关状态
  const currentRoomId = computed(() => globalStore.currentSession?.roomId) // 当前聊天室ID

  // 获取当前房间的用户列表的计算属性
  const userList = computed(() => {
    if (!currentRoomId.value) return []
    return userListMap.value.get(currentRoomId.value) || []
  })

  /**
   * 获取当前群主ID
   * 从成员列表中筛选出角色为群主的用户
   */
  const currentLordId = computed(() => {
    const list = userList.value.filter((member) => member.roleId === RoleEnum.LORD)
    if (list.length) {
      return list[0]?.uid
    }
    return -99
  })

  /**
   * 获取当前管理员ID列表
   * 从成员列表中筛选出所有管理员的uid
   */
  const adminUidList = computed(() => {
    return userList.value.filter((member) => member.roleId === RoleEnum.ADMIN).map((member) => member.uid)
  })

  /**
   * 获取管理员基本信息列表
   * 根据管理员ID列表获取详细信息
   */
  const adminList = computed(() => {
    return cachedStore.filterUsersByUidList(adminUidList.value)
  })

  /**
   * 获取所有成员的基本信息列表
   * 包含角色信息（群主/管理员/普通成员）
   */
  const memberList = computed(() => {
    const memberInfoList = cachedStore.filterUsersByUidList(userList.value.map((item) => item.uid))
    return memberInfoList.map((member) => {
      if (adminUidList.value.includes(member.uid)) {
        return {
          ...member,
          account: member.account,
          roleId: RoleEnum.ADMIN
        }
      } else if (member.uid === currentLordId.value) {
        return {
          ...member,
          account: member.account,
          roleId: RoleEnum.LORD
        }
      }
      return member
    })
  })

  // 群组基本信息
  const countInfo = ref<GroupDetailReq>({
    avatar: '',
    groupName: '',
    onlineNum: 0,
    roleId: 0,
    account: '',
    memberNum: 0,
    remark: '',
    myName: '',
    roomId: currentRoomId.value
  })

  /**
   * 获取群成员列表
   * @param roomId 群聊房间ID
   * @param forceRefresh 是否强制刷新，默认false
   */
  const getGroupUserList = async (roomId: string, forceRefresh = false) => {
    // 如果已经有缓存且不需要强制刷新，则直接返回
    if (!forceRefresh && userListMap.value.has(roomId) && userListMap.value.get(roomId)!.length > 0) {
      return
    }

    const data: any = await invokeWithErrorHandler(
      TauriCommand.GET_ROOM_MEMBERS,
      {
        roomId: roomId
      },
      {
        customErrorMessage: '获取群成员列表失败',
        errorType: ErrorType.Network
      }
    )
    if (!data) return

    // 将数据存储到Map中
    userListMap.value.set(roomId, data)
    userListOptions.loading = false

    // 收集并获取用户详细信息
    const uidCollectYet: Set<string> = new Set()
    for (const user of data.list || []) {
      uidCollectYet.add(user.uid)
    }
    await cachedStore.getBatchUserInfo([...uidCollectYet])
  }

  /**
   * 获取群组统计信息
   * 包括群名称、头像、在线人数等
   */
  const getCountStatistic = async (currentRoomId: string) => {
    countInfo.value = await ImRequestUtils.getGroupDetail(currentRoomId)
  }

  /**
   * 加载更多群成员
   * 分页加载，防止重复加载
   */
  const loadMoreGroupMembers = async () => {
    if (userListOptions.isLast || userListOptions.loading) return
    userListOptions.loading = true
    await getGroupUserList(currentRoomId.value)
    userListOptions.loading = false
  }

  /**
   * 更新用户在线状态
   * @param item 需要更新状态的用户
   * @param roomId 群聊房间ID，可选，默认使用当前房间
   */
  const updateUserStatus = async (item: UserItem | OnStatusChangeType['member'], roomId?: string) => {
    const targetRoomId = roomId || currentRoomId.value
    if (!targetRoomId) return

    const currentUserList = userListMap.value.get(targetRoomId) || []
    const findIndex = currentUserList.findIndex((i) => i.uid === item.uid)
    if (findIndex !== -1) {
      const updatedList = [...currentUserList]
      updatedList[findIndex] = { ...updatedList[findIndex], ...item }
      userListMap.value.set(targetRoomId, updatedList)
    }
  }

  /**
   * 从群成员列表中移除指定用户
   * @param uid 要移除的用户ID
   * @param roomId 群聊房间ID，可选，默认使用当前房间
   */
  const filterUser = (uid: string, roomId?: string) => {
    if (typeof uid !== 'string') return
    const targetRoomId = roomId || currentRoomId.value
    if (!targetRoomId) return

    const currentUserList = userListMap.value.get(targetRoomId) || []
    const filteredList = currentUserList.filter((item) => item.uid !== uid)
    userListMap.value.set(targetRoomId, filteredList)
  }

  /**
   * 添加群管理员
   * @param uidList 要添加为管理员的用户ID列表
   */
  const addAdmin = async (uidList: string[]) => {
    await ImRequestUtils.addAdmin({ roomId: currentRoomId.value, uidList })
    // 更新本地群成员列表中的角色信息
    const targetRoomId = currentRoomId.value
    if (!targetRoomId) return

    const currentUserList = userListMap.value.get(targetRoomId) || []
    const updatedList = currentUserList.map((user) => {
      if (uidList.includes(user.uid)) {
        return { ...user, roleId: RoleEnum.ADMIN }
      }
      return user
    })
    userListMap.value.set(targetRoomId, updatedList)
  }

  /**
   * 撤销群管理员身份
   * @param uidList 要撤销的管理员ID列表
   */
  const revokeAdmin = async (uidList: string[]) => {
    await ImRequestUtils.revokeAdmin({ roomId: currentRoomId.value, uidList })
    // 更新本地群成员列表中的角色信息
    const targetRoomId = currentRoomId.value
    if (!targetRoomId) return

    const currentUserList = userListMap.value.get(targetRoomId) || []
    const updatedList = currentUserList.map((user) => {
      if (uidList.includes(user.uid)) {
        return { ...user, roleId: RoleEnum.NORMAL }
      }
      return user
    })
    userListMap.value.set(targetRoomId, updatedList)
  }

  /**
   * 退出群聊 / 解散群聊
   * @param roomId 要退出的群聊ID
   */
  const exitGroup = async (roomId: string) => {
    await ImRequestUtils.exitGroup({ roomId: roomId })
    // 从成员列表中移除自己
    const currentUserList = userListMap.value.get(roomId) || []
    const updatedList = currentUserList.filter((user) => user.uid !== userStore.userInfo.uid)
    userListMap.value.set(roomId, updatedList)
    // 更新会话列表
    chatStore.removeContact(currentRoomId.value)
    // 切换到第一个会话
    globalStore.currentSession.roomId = chatStore.sessionList[0].roomId
  }

  /**
   * 用于处理在线状态变更时的群成员列表刷新
   */
  const refreshGroupMembers = async () => {
    // 始终刷新频道成员列表
    await getGroupUserList('1', true)

    // 如果当前选中的是群聊且不是频道，则同时刷新当前群聊的成员列表
    if (globalStore.currentSession?.type === RoomTypeEnum.GROUP && currentRoomId.value !== '1') {
      await getGroupUserList(currentRoomId.value, true)
    }
  }

  /**
   * 重置群组数据
   * 用于切换会话时清空当前群组的数据
   * @param roomId 可选，指定要清理的房间ID，不传则清理所有
   */
  const resetGroupData = (roomId?: string) => {
    if (roomId) {
      // 清理指定房间的数据
      userListMap.value.delete(roomId)
    } else {
      // 清理所有数据
      userListMap.value.clear()
    }
    userListOptions.cursor = ''
    userListOptions.isLast = false
    userListOptions.loading = false
    countInfo.value = {
      avatar: '',
      groupName: '',
      onlineNum: 0,
      roleId: 0,
      roomId: '',
      account: '',
      memberNum: 0,
      remark: '',
      myName: ''
    }
  }

  /**
   * 获取指定房间的用户列表
   * @param roomId 房间ID
   * @returns 用户列表
   */
  const getUserListByRoomId = (roomId: string): UserItem[] => {
    return userListMap.value.get(roomId) || []
  }

  return {
    userList,
    userListMap,
    userListOptions,
    loadMoreGroupMembers,
    getGroupUserList,
    getCountStatistic,
    updateUserStatus,
    filterUser,
    currentLordId,
    adminUidList,
    adminList,
    memberList,
    addAdmin,
    revokeAdmin,
    exitGroup,
    refreshGroupMembers,
    resetGroupData,
    getUserListByRoomId,
    countInfo
  }
})
