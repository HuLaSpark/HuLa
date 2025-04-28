import apis from '@/services/apis'
import { defineStore } from 'pinia'
import { useGlobalStore } from '@/stores/global'
import type { GroupDetailReq, UserItem } from '@/services/types'
import { pageSize, useChatStore } from './chat'
import { OnlineEnum, RoleEnum, RoomTypeEnum, StoresEnum } from '@/enums'
import { uniqueUserList } from '@/utils/Unique.ts'
import { useCachedStore } from '@/stores/cached'
import { useUserStore } from '@/stores/user'
import { OnStatusChangeType } from '@/services/wsType'

/**
 * 用户排序函数
 * 排序规则：
 * 1. 在线用户优先显示
 * 2. 同为在线或离线状态时，按最后操作时间倒序排序
 */
const sorAction = (pre: UserItem, next: UserItem) => {
  if (pre.activeStatus === OnlineEnum.ONLINE && next.activeStatus === OnlineEnum.ONLINE) {
    return next.lastOptTime < pre.lastOptTime ? -1 : 1
  } else if (pre.activeStatus !== OnlineEnum.ONLINE && next.activeStatus !== OnlineEnum.ONLINE) {
    return next.lastOptTime < pre.lastOptTime ? -1 : 1
  } else if (pre.activeStatus === OnlineEnum.ONLINE && next.activeStatus !== OnlineEnum.ONLINE) {
    return -1
  } else if (pre.activeStatus !== OnlineEnum.ONLINE && next.activeStatus === OnlineEnum.ONLINE) {
    return 1
  } else {
    return next.lastOptTime < pre.lastOptTime ? -1 : 1
  }
}

export const useGroupStore = defineStore(StoresEnum.GROUP, () => {
  // 初始化需要使用的store
  const cachedStore = useCachedStore()
  const globalStore = useGlobalStore()
  const userStore = useUserStore()
  const chatStore = useChatStore()

  // 群组相关状态
  const userList = ref<UserItem[]>([]) // 群成员列表
  const userListOptions = reactive({ isLast: false, loading: true, cursor: '' }) // 分页加载相关状态
  const currentRoomId = computed(() => globalStore.currentSession?.roomId) // 当前聊天室ID

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
    role: 0,
    account: '',
    memberNum: 0,
    remark: '',
    myName: '',
    roomId: currentRoomId.value
  })

  /**
   * 获取群成员列表
   * @param refresh 是否刷新（重新加载）
   */
  const getGroupUserList = async (refresh = false, specifiedRoomId?: string) => {
    const data = await apis.getGroupList({
      pageSize: pageSize,
      cursor: refresh ? '' : userListOptions.cursor,
      roomId: specifiedRoomId || currentRoomId.value
    })
    if (!data) return
    // 合并并去重用户列表，然后按在线状态和时间排序
    const newUserList = uniqueUserList(refresh ? data.list : [...data.list, ...userList.value])
    newUserList.sort(sorAction)
    userList.value = newUserList
    userListOptions.cursor = data.cursor
    userListOptions.isLast = data.isLast
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
  const getCountStatistic = async () => {
    countInfo.value = await apis.groupDetail({ id: currentRoomId.value })
  }

  /**
   * 加载更多群成员
   * 分页加载，防止重复加载
   */
  const loadMoreGroupMembers = async () => {
    if (userListOptions.isLast || userListOptions.loading) return
    userListOptions.loading = true
    await getGroupUserList()
    userListOptions.loading = false
  }

  /**
   * 更新用户在线状态
   * @param item 需要更新状态的用户
   */
  const updateUserStatus = async (item: UserItem | OnStatusChangeType['member']) => {
    const findIndex = userList.value.findIndex((i) => i.uid === item.uid)
    if (findIndex !== -1) {
      userList.value[findIndex] = { ...userList.value[findIndex], ...item }
    }
  }

  /**
   * 从群成员列表中移除指定用户
   * @param uid 要移除的用户ID
   */
  const filterUser = (uid: string) => {
    if (typeof uid !== 'string') return
    userList.value = userList.value.filter((item) => item.uid !== uid)
  }

  /**
   * 添加群管理员
   * @param uidList 要添加为管理员的用户ID列表
   */
  const addAdmin = async (uidList: string[]) => {
    await apis.addAdmin({ roomId: currentRoomId.value, uidList })
    // 更新本地群成员列表中的角色信息
    for (const user of userList.value) {
      if (uidList.includes(user.uid)) {
        user.roleId = RoleEnum.ADMIN
      }
    }
  }

  /**
   * 撤销群管理员身份
   * @param uidList 要撤销的管理员ID列表
   */
  const revokeAdmin = async (uidList: string[]) => {
    await apis.revokeAdmin({ roomId: currentRoomId.value, uidList })
    // 更新本地群成员列表中的角色信息
    for (const user of userList.value) {
      if (uidList.includes(user.uid)) {
        user.roleId = RoleEnum.NORMAL
      }
    }
  }

  /**
   * 退出群聊 / 解散群聊
   * @param roomId 要退出的群聊ID
   */
  const exitGroup = async (roomId: string) => {
    await apis.exitGroup({ roomId: roomId })
    // 从成员列表中移除自己
    const index = userList.value.findIndex((user) => user.uid === userStore.userInfo.uid)
    userList.value.splice(index, 1)
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
    await getGroupUserList(true, '1')

    // 如果当前选中的是群聊且不是频道，则同时刷新当前群聊的成员列表
    if (globalStore.currentSession?.type === RoomTypeEnum.GROUP && currentRoomId.value !== '1') {
      await getGroupUserList(true, currentRoomId.value)
    }
  }

  /**
   * 重置群组数据
   * 用于切换会话时清空当前群组的数据
   */
  const resetGroupData = () => {
    userList.value = []
    userListOptions.cursor = ''
    userListOptions.isLast = false
    userListOptions.loading = false
    countInfo.value = {
      avatar: '',
      groupName: '',
      onlineNum: 0,
      role: 0,
      roomId: '',
      account: '',
      memberNum: 0,
      remark: '',
      myName: ''
    }
  }

  return {
    userList,
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
    countInfo
  }
})
