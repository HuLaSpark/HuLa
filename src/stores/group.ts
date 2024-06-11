import apis from '@/services/apis'
import { defineStore } from 'pinia'
import { useGlobalStore } from '@/stores/global'
import type { GroupDetailReq, UserItem } from '@/services/types'
import { pageSize, useChatStore } from './chat'
import { OnlineEnum, RoleEnum } from '@/enums'
import { uniqueUserList } from '@/utils/unique'
import { useCachedStore } from '@/stores/cached'
import { useUserStore } from '@/stores/user'
import { cloneDeep } from 'lodash-es'

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
  const cachedStore = useCachedStore()
  const globalStore = useGlobalStore()
  const userStore = useUserStore()
  const chatStore = useChatStore()
  // 消息列表
  const userList = ref<UserItem[]>([])
  const userListOptions = reactive({ isLast: false, loading: true, cursor: '' })
  const currentRoomId = computed(() => globalStore.currentSession?.roomId)
  /**
   * 获取当前群主ID
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
   */
  const adminUidList = computed(() => {
    return userList.value.filter((member) => member.roleId === RoleEnum.ADMIN).map((member) => member.uid)
  })
  /**
   * 获取管理员基本信息列表
   */
  const adminList = computed(() => {
    return cachedStore.filterUsersByUidList(adminUidList.value)
  })
  /**
   * 获取管理员基本信息列表
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
  const countInfo = ref<GroupDetailReq>({
    avatar: '',
    groupName: '',
    onlineNum: 0,
    role: 0,
    roomId: currentRoomId.value
  })

  // 移动端控制显隐
  const showGroupList = ref(false)

  // 获取群成员
  const getGroupUserList = async (refresh = false) => {
    const res = await apis.getGroupList({
      params: {
        pageSize,
        cursor: refresh ? undefined : userListOptions.cursor,
        roomId: currentRoomId.value
      }
    })
    if (!res) return
    const { data } = res
    const tempNew = cloneDeep(uniqueUserList(refresh ? data.list : [...data.list, ...userList.value]))
    tempNew.sort(sorAction)
    userList.value = tempNew
    userListOptions.cursor = data.cursor
    userListOptions.isLast = data.isLast
    userListOptions.loading = false

    /** 收集需要请求用户详情的 uid */
    const uidCollectYet: Set<number> = new Set() // 去重用
    data.list?.forEach((user: UserItem) => uidCollectYet.add(user.uid))
    // 获取用户信息缓存
    await cachedStore.getBatchUserInfo([...uidCollectYet])
  }

  // 获取群成员数量统计
  const getCountStatistic = async () => {
    const { data } = await apis.groupDetail({ id: currentRoomId.value })
    countInfo.value = data
  }

  // 加载更多群成员
  const loadMore = async () => {
    if (userListOptions.isLast) return
    await getGroupUserList()
  }

  // 更新用户在线状态
  const batchUpdateUserStatus = (items: UserItem[]) => {
    const tempNew = cloneDeep(userList.value)
    for (let index = 0, len = items.length; index < len; index++) {
      const curUser = items[index]
      const findIndex = tempNew.findIndex((item) => item.uid === curUser.uid)
      findIndex > -1 && (tempNew[findIndex].activeStatus = curUser.activeStatus)
    }
    tempNew.sort(sorAction)
    userList.value = tempNew
  }

  // 过滤掉小黑子
  const filterUser = (uid: number) => {
    if (typeof uid !== 'number') return
    userList.value = userList.value.filter((item) => item.uid !== uid)
  }

  /**
   * 添加管理员
   * @param uidList
   */
  const addAdmin = async (uidList: number[]) => {
    await apis.addAdmin({ roomId: currentRoomId.value, uidList })

    // 更新群成员列表
    userList.value.forEach((user) => {
      if (uidList.includes(user.uid)) {
        user.roleId = RoleEnum.ADMIN
      }
    })
  }

  /**
   * 撤销管理员
   * @param uidList
   */
  const revokeAdmin = async (uidList: number[]) => {
    await apis.revokeAdmin({ roomId: currentRoomId.value, uidList })

    // 更新群成员列表
    userList.value.forEach((user) => {
      if (uidList.includes(user.uid)) {
        user.roleId = RoleEnum.NORMAL
      }
    })
  }

  /**
   * 退出群聊
   */
  const exitGroup = async () => {
    await apis.exitGroup({ roomId: currentRoomId.value })

    // 更新群成员列表
    const index = userList.value.findIndex((user) => user.uid === userStore.userInfo.uid)
    userList.value.splice(index, 1)

    // 更新会话列表
    chatStore.removeContact(currentRoomId.value)

    // 切换为第一个会话
    globalStore.currentSession.roomId = chatStore.sessionList[0].roomId
  }

  return {
    userList,
    userListOptions,
    loadMore,
    getGroupUserList,
    getCountStatistic,
    currentLordId,
    countInfo,
    batchUpdateUserStatus,
    showGroupList,
    filterUser,
    adminUidList,
    adminList,
    memberList,
    addAdmin,
    revokeAdmin,
    exitGroup
  }
})
