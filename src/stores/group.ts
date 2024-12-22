import apis from '@/services/apis'
import { defineStore } from 'pinia'
import { useGlobalStore } from '@/stores/global'
import type { GroupDetailReq, UserItem } from '@/services/types'
import { pageSize, useChatStore } from './chat'
import { OnlineEnum, RoleEnum } from '@/enums'
import { uniqueUserList } from '@/utils/unique'
import { useCachedStore } from '@/stores/cached'
import { useUserStore } from '@/stores/user'

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

export const useGroupStore = defineStore('group', () => {
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
          roleId: RoleEnum.ADMIN
        }
      } else if (member.uid === currentLordId.value) {
        return {
          ...member,
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
    roomId: currentRoomId.value
  })

  /**
   * 获取群成员列表
   * @param refresh 是否刷新（重新加载）
   */
  const getGroupUserList = async (refresh = false) => {
    const data = await apis.getGroupList({
      pageSize: pageSize,
      cursor: refresh ? '' : userListOptions.cursor,
      roomId: currentRoomId.value
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
    const uidCollectYet: Set<number> = new Set()
    data.list?.forEach((user: UserItem) => uidCollectYet.add(user.uid))
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
   * 批量更新用户在线状态
   * @param items 需要更新状态的用户列表
   */
  const batchUpdateUserStatus = (items: UserItem[]) => {
    for (let index = 0, len = items.length; index < len; index++) {
      const curUser = items[index]
      const findIndex = userList.value.findIndex((item) => item.uid === curUser.uid)
      userList.value[findIndex] = {
        ...userList.value[findIndex],
        activeStatus: items[index].activeStatus
      }
    }
  }

  /**
   * 从群成员列表中移除指定用户
   * @param uid 要移除的用户ID
   */
  const filterUser = (uid: number) => {
    if (typeof uid !== 'number') return
    userList.value = userList.value.filter((item) => item.uid !== uid)
  }

  /**
   * 添加群管理员
   * @param uidList 要添加为管理员的用户ID列表
   */
  const addAdmin = async (uidList: number[]) => {
    await apis.addAdmin({ roomId: currentRoomId.value, uidList })
    // 更新本地群成员列表中的角色信息
    userList.value.forEach((user) => {
      if (uidList.includes(user.uid)) {
        user.roleId = RoleEnum.ADMIN
      }
    })
  }

  /**
   * 撤销群管理员身份
   * @param uidList 要撤销的管理员ID列表
   */
  const revokeAdmin = async (uidList: number[]) => {
    await apis.revokeAdmin({ roomId: currentRoomId.value, uidList })
    // 更新本地群成员列表中的角色信息
    userList.value.forEach((user) => {
      if (uidList.includes(user.uid)) {
        user.roleId = RoleEnum.NORMAL
      }
    })
  }

  /**
   * 退出群聊
   * 1. 调用退群API
   * 2. 更新本地群成员列表
   * 3. 更新会话列表
   * 4. 切换到第一个会话
   */
  const exitGroup = async () => {
    await apis.exitGroup({ roomId: currentRoomId.value })
    // 从成员列表中移除自己
    const index = userList.value.findIndex((user) => user.uid === userStore.userInfo.uid)
    userList.value.splice(index, 1)
    // 更新会话列表
    chatStore.removeContact(currentRoomId.value)
    // 切换到第一个会话
    globalStore.currentSession.roomId = chatStore.sessionList[0].roomId
  }

  return {
    userList,
    userListOptions,
    loadMoreGroupMembers,
    getGroupUserList,
    getCountStatistic,
    currentLordId,
    countInfo,
    batchUpdateUserStatus,
    filterUser,
    adminUidList,
    adminList,
    memberList,
    addAdmin,
    revokeAdmin,
    exitGroup
  }
})
