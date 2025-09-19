import { defineStore } from 'pinia'
import { RoleEnum, RoomTypeEnum, StoresEnum } from '@/enums'
import type { GroupDetailReq, UserItem } from '@/services/types'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user'
import * as ImRequestUtils from '@/utils/ImRequestUtils'
import { useChatStore } from './chat'

export const useGroupStore = defineStore(
  StoresEnum.GROUP,
  () => {
    const globalStore = useGlobalStore()
    const userStore = useUserStore()
    const chatStore = useChatStore()

    // 群组相关状态
    const userListMap = reactive<Record<string, UserItem[]>>({}) // 群成员列表Map，key为roomId
    const groupDetails = ref<GroupDetailReq[]>([])
    const userListOptions = reactive({ isLast: false, loading: true, cursor: '' }) // 分页加载相关状态
    const myNameInCurrentGroup = computed({
      get() {
        const user = getCurrentUser()
        return user?.myName || user?.name || ''
      },
      set(value: string) {
        // 这里可以添加设置昵称的逻辑
        const user = getCurrentUser()
        if (user) {
          user.myName = value
        }
      }
    })

    const myRoleIdInCurrentGroup = computed({
      get() {
        return getCurrentUser()?.roleId || RoleEnum.NORMAL
      },
      set(value: number) {
        // 这里可以添加设置角色的逻辑
        const user = getCurrentUser()
        if (user) {
          user.roleId = value
        }
      }
    })

    // 获取当前房间的用户列表的计算属性
    const userList = computed(() => {
      if (!globalStore.currentSession?.roomId) return []
      return userListMap[globalStore.currentSession.roomId] || []
    })

    const setGroupDetails = async () => {
      const data = await ImRequestUtils.groupList()
      groupDetails.value = data
    }

    const addGroupDetail = async (roomId: string) => {
      if (groupDetails.value.find((item) => item.roomId === roomId)) {
        return
      }
      const data = await ImRequestUtils.getGroupDetail(roomId)
      groupDetails.value.push(data)
    }

    const getUserInfo = computed(() => (uid: string) => {
      return allUserInfo.value.find((item) => item.uid === uid)
    })

    const getUserDisplayName = computed(() => (uid: string) => {
      const user = userList.value.find((item) => item.uid === uid)
      return user?.myName || user?.name || ''
    })

    const allUserInfo = computed(() => {
      const set = new Set<UserItem>()
      Object.values(userListMap)
        .flat()
        .forEach((user) => {
          set.add(user)
        })
      return Array.from(set)
    })

    const updateGroupDetail = async (roomId: string, detail: Partial<GroupDetailReq>) => {
      let targetGroup = groupDetails.value.find((item) => item.roomId === roomId)!
      targetGroup = {
        ...targetGroup,
        ...detail
      }
    }

    const updateOnlineNum = (options: { uid?: string; roomId?: string; onlineNum?: number; isAdd?: boolean }) => {
      const { uid, roomId, onlineNum, isAdd } = options

      if (roomId) {
        // 如果传了 roomId，只修改该房间的 onlineNum
        const groupDetail = groupDetails.value.find((detail) => detail.roomId === roomId)
        if (groupDetail) {
          if (onlineNum) {
            groupDetail.onlineNum = onlineNum
          } else {
            if (isAdd) {
              groupDetail.onlineNum++
            } else {
              groupDetail.onlineNum--
            }
          }
        }
      } else {
        // 如果没有传 roomId, 说明是全局更新
        const roomIds = getRoomIdsByUid(uid!)

        // 遍历找到的所有房间ID，更新对应群组的在线人数
        roomIds.forEach((roomId) => {
          const groupDetail = groupDetails.value.find((detail) => detail.roomId === roomId)
          if (groupDetail) {
            if (isAdd) {
              groupDetail.onlineNum++
            } else {
              groupDetail.onlineNum--
            }
          }
        })
      }
    }

    /**
     * 获取当前群主ID
     * 从成员列表中筛选出角色为群主的用户
     */
    const currentLordId = computed(() => {
      const list = userList.value.filter((member: UserItem) => member.roleId === RoleEnum.LORD)
      if (list.length) {
        return list[0]?.uid
      }
      return -99
    })

    const isCurrentLord = computed(() => (uid: string) => {
      return chatStore.isGroup && currentLordId.value === uid
    })

    /**
     * 获取当前管理员ID列表
     * 从成员列表中筛选出所有管理员的uid
     */
    const adminUidList = computed(() => {
      return userList.value
        .filter((member: UserItem) => member.roleId === RoleEnum.ADMIN)
        .map((member: UserItem) => member.uid)
    })

    /**
     * 检查用户是否为管理员
     * @param uid 用户ID
     * @returns 是否为管理员
     */
    const isAdmin = computed(() => (uid: string) => {
      return chatStore.isGroup && adminUidList.value.includes(uid)
    })

    /**
     * 获取管理员基本信息列表
     * 根据管理员ID列表获取详细信息
     */
    const adminList = computed<UserItem[]>(() => {
      return userList.value.filter((member: UserItem) => adminUidList.value.includes(member.uid))
    })

    const getCurrentUser = (): UserItem => {
      return userList.value.find((member: UserItem) => member.uid === userStore.userInfo!.uid)!
    }

    const removeGroupDetail = (roomId: string) => {
      groupDetails.value = groupDetails.value.filter((item) => item.roomId !== roomId)
    }

    /**
     * 获取所有成员的基本信息列表
     * 包含角色信息（群主/管理员/普通成员）
     */
    const memberList = computed(() => {
      const memberInfoList = userList.value
      return memberInfoList.map((member: UserItem) => {
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
    const countInfo = computed(() => {
      return groupDetails.value.find((item: GroupDetailReq) => item.roomId === globalStore.currentSession!.roomId)
    })

    const getGroupDetailByRoomId = computed(() => (roomId: string) => {
      return groupDetails.value.find((item: GroupDetailReq) => item.roomId === roomId)
    })

    const updateGroupNumber = (roomId: string, totalNum: number, onlineNum: number) => {
      const group = groupDetails.value.find((item) => item.roomId === roomId)
      if (group) {
        group.memberNum = totalNum
        group.onlineNum = onlineNum
      }
    }

    /**
     * 获取群成员列表
     * @param roomId 群聊房间ID
     * @param forceRefresh 是否强制刷新，默认false
     */
    const getGroupUserList = async (roomId: string, forceRefresh = false) => {
      // 如果已经有缓存且不需要强制刷新，则直接返回
      if (!forceRefresh && userListMap[roomId] && userListMap[roomId].length > 0) {
        return
      }

      const data: any = await ImRequestUtils.groupListMember(roomId)
      if (!data) return

      // 将数据存储到Record中
      userListMap[roomId] = data
      userListOptions.loading = false
    }

    /**
     * 加载更多群成员
     * 分页加载，防止重复加载
     */
    const loadMoreGroupMembers = async () => {
      if (userListOptions.isLast || userListOptions.loading) return
      userListOptions.loading = true
      await getGroupUserList(globalStore.currentSession!.roomId)
      userListOptions.loading = false
    }

    /**
     * 更新 userListMap 中某个用户的信息
     * @param uid 用户ID
     * @param updates 要更新的用户信息（部分字段）
     * @param roomId 群聊房间ID，可选，默认使用当前房间；如果传入 'all' 则更新所有房间中的该用户
     * @returns 是否成功更新
     */
    const updateUserItem = (uid: string, updates: Partial<UserItem>, roomId: string | 'all' = 'all'): boolean => {
      if (!uid || typeof uid !== 'string') {
        console.warn('[updateUserItem] 无效的用户ID:', uid)
        return false
      }

      if (!updates || typeof updates !== 'object') {
        console.warn('[updateUserItem] 无效的更新数据:', updates)
        return false
      }

      let updated = false

      if (roomId === 'all') {
        // 更新所有房间中的该用户
        Object.keys(userListMap).forEach((room) => {
          const userList = userListMap[room] || []
          const userIndex = userList.findIndex((user: UserItem) => user.uid === uid)
          if (userIndex !== -1) {
            const updatedList = [...userList]
            updatedList[userIndex] = { ...updatedList[userIndex], ...updates }
            userListMap[room] = updatedList
            updated = true
          }
        })
      } else {
        // 更新指定房间中的用户
        const targetRoomId = roomId || globalStore.currentSession!.roomId
        if (!targetRoomId) {
          console.warn('[updateUserItem] 无法确定目标房间ID')
          return false
        }

        const currentUserList = userListMap[targetRoomId] || []
        const userIndex = currentUserList.findIndex((user: UserItem) => user.uid === uid)
        if (userIndex !== -1) {
          const updatedList = [...currentUserList]
          updatedList[userIndex] = { ...updatedList[userIndex], ...updates }
          userListMap[targetRoomId] = updatedList
          updated = true
        }
      }

      return updated
    }

    /**
     * 向 userListMap 中添加新的用户
     * @param userItem 要添加的用户信息
     * @param roomId 群聊房间ID，可选，默认使用当前房间；如果传入 'all' 则添加到所有房间中
     * @param allowDuplicate 是否允许重复添加，默认为 false
     * @returns 是否成功添加
     */
    const addUserItem = (userItem: UserItem, roomId?: string): boolean => {
      if (!userItem || typeof userItem !== 'object' || !userItem.uid) {
        console.warn('[addUserItem] 无效的用户信息:', userItem)
        return false
      }

      let added = false

      // 添加到指定房间中
      const targetRoomId = roomId || globalStore.currentSession!.roomId
      if (!targetRoomId) {
        console.warn('[addUserItem] 无法确定目标房间ID')
        return false
      }

      const currentUserList = userListMap[targetRoomId] || []

      const existIndex = currentUserList.findIndex((user: UserItem) => user.uid === userItem.uid)

      if (existIndex !== -1) {
        currentUserList[existIndex] = userItem
        added = true
      } else {
        currentUserList.push(userItem)
        added = true
      }

      return added
    }

    /**
     * 从 userListMap 中移除指定用户
     * @param uid 要移除的用户ID
     * @param roomId 群聊房间ID，可选，默认使用当前房间；如果传入 'all' 则从所有房间中移除
     * @returns 是否成功移除
     */
    const removeUserItem = (uid: string, roomId?: string): boolean => {
      if (!uid || typeof uid !== 'string') {
        console.warn('[removeUserItem] 无效的用户ID:', uid)
        return false
      }

      let removed = false

      // 从指定房间中移除
      const targetRoomId = roomId || globalStore.currentSession!.roomId
      if (!targetRoomId) {
        console.warn('[removeUserItem] 无法确定目标房间ID')
        return false
      }

      const currentUserList = userListMap[targetRoomId] || []
      const initialLength = currentUserList.length
      const filteredList = currentUserList.filter((user: UserItem) => user.uid !== uid)

      if (filteredList.length < initialLength) {
        userListMap[targetRoomId] = filteredList
        removed = true
      }

      return removed
    }

    /**
     * 移除 某个房间中的所有user 数据
     * @param roomId
     */
    const removeAllUsers = (roomId: string) => {
      userListMap[roomId] = []
    }

    /**
     * 添加群管理员
     * @param uidList 要添加为管理员的用户ID列表
     */
    const addAdmin = async (uidList: string[]) => {
      await ImRequestUtils.addAdmin({ roomId: globalStore.currentSession!.roomId, uidList })
      // 更新本地群成员列表中的角色信息
      const targetRoomId = globalStore.currentSession!.roomId
      if (!targetRoomId) return

      const currentUserList = userListMap[targetRoomId] || []
      const updatedList = currentUserList.map((user: UserItem) => {
        if (uidList.includes(user.uid)) {
          return { ...user, roleId: RoleEnum.ADMIN }
        }
        return user
      })
      userListMap[targetRoomId] = updatedList
    }

    /**
     * 撤销群管理员身份
     * @param uidList 要撤销的管理员ID列表
     */
    const revokeAdmin = async (uidList: string[]) => {
      await ImRequestUtils.revokeAdmin({ roomId: globalStore.currentSession!.roomId, uidList })
      // 更新本地群成员列表中的角色信息
      const targetRoomId = globalStore.currentSession!.roomId
      if (!targetRoomId) return

      const currentUserList = userListMap[targetRoomId] || []
      const updatedList = currentUserList.map((user: UserItem) => {
        if (uidList.includes(user.uid)) {
          return { ...user, roleId: RoleEnum.NORMAL }
        }
        return user
      })
      userListMap[targetRoomId] = updatedList
    }

    /**
     * 退出群聊 / 解散群聊
     * @param roomId 要退出的群聊ID
     */
    const exitGroup = async (roomId: string) => {
      await ImRequestUtils.exitGroup({ roomId: roomId })
      // 从成员列表中移除自己
      const currentUserList = userListMap[roomId] || []
      const updatedList = currentUserList.filter((user: UserItem) => user.uid !== userStore.userInfo!.uid)
      userListMap[roomId] = updatedList
      // 更新会话列表
      chatStore.removeSession(globalStore.currentSession!.roomId)
      // 切换到第一个会话
      globalStore.currentSession!.roomId = chatStore.sessionList[0].roomId
    }

    /**
     * 用于处理在线状态变更时的群成员列表刷新
     */
    const refreshGroupMembers = async () => {
      // 始终刷新频道成员列表
      await getGroupUserList('1', true)

      // 如果当前选中的是群聊且不是频道，则同时刷新当前群聊的成员列表
      if (globalStore.currentSession?.type === RoomTypeEnum.GROUP && globalStore.currentSession!.roomId !== '1') {
        await getGroupUserList(globalStore.currentSession!.roomId, true)
      }
    }

    /**
     * 重置群组数据
     * 用于切换会话时清空当前群组的数据
     * @param roomId 可选，指定要清理的房间ID，不传则清理所有
     */
    const resetGroupData = () => {
      userListOptions.cursor = ''
      userListOptions.isLast = false
      userListOptions.loading = false
    }

    /**
     * 获取指定房间的用户列表
     * @param roomId 房间ID
     * @returns 用户列表
     */
    const getUserListByRoomId = (roomId: string): UserItem[] => {
      return userListMap[roomId] || []
    }

    const getUser = (roomId: string, uid: string): UserItem => {
      return userListMap[roomId].filter((item) => item.uid === uid)[0]
    }

    /**
     * 根据用户ID查找该用户所在的所有房间ID
     * @param uid 用户ID
     * @returns 包含该用户的所有房间ID数组
     */
    const getRoomIdsByUid = (uid: string): string[] => {
      const roomIds: string[] = []

      // 遍历所有房间的用户列表
      Object.keys(userListMap).forEach((roomId) => {
        const userList = userListMap[roomId]
        // 检查当前房间是否包含指定的用户
        const hasUser = userList.some((user) => user.uid === uid)
        if (hasUser) {
          roomIds.push(roomId)
        }
      })

      return roomIds
    }

    return {
      userList,
      userListMap,
      userListOptions,
      loadMoreGroupMembers,
      getGroupUserList,
      updateUserItem,
      addUserItem,
      removeUserItem,
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
      countInfo,
      getUser,
      getRoomIdsByUid,
      updateOnlineNum,
      removeAllUsers,
      getCurrentUser,
      myNameInCurrentGroup,
      myRoleIdInCurrentGroup,
      setGroupDetails,
      updateGroupDetail,
      groupDetails,
      getGroupDetailByRoomId,
      updateGroupNumber,
      removeGroupDetail,
      addGroupDetail,
      getUserInfo,
      allUserInfo,
      getUserDisplayName,
      isCurrentLord,
      isAdmin
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
