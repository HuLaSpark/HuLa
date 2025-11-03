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

    // 动态加载没有的群组 [防止并发冲突加载]
    const groupDetailsCache = ref<Record<string, GroupDetailReq>>({})
    const loadingGroups = ref<Set<string>>(new Set())

    // 群组相关状态
    const currentSessionState = ref({
      roomId: '',
      loading: false,
      lastLoadedRoomId: ''
    })

    type InternalUserItem = UserItem & { __order?: number }

    const userListMap = reactive<Record<string, UserItem[]>>({})
    const memberOrderCounters = reactive<Record<string, number>>({})

    const getRoleSortWeight = (roleId?: number) => {
      switch (roleId) {
        case RoleEnum.LORD:
          return 0
        case RoleEnum.ADMIN:
          return 1
        case RoleEnum.NORMAL:
          return 2
        default:
          return 3
      }
    }

    const ensureMemberOrder = (roomId: string, members: InternalUserItem[]) => {
      if (!memberOrderCounters[roomId]) {
        memberOrderCounters[roomId] = 0
      }

      members.forEach((member) => {
        if (member.__order === undefined) {
          member.__order = memberOrderCounters[roomId]++
        }
      })
    }

    const sortMembersByRole = (roomId: string, members: InternalUserItem[]) => {
      ensureMemberOrder(roomId, members)

      return [...members].sort((a, b) => {
        const roleDiff = getRoleSortWeight(a.roleId) - getRoleSortWeight(b.roleId)
        if (roleDiff !== 0) {
          return roleDiff
        }

        return (a.__order ?? Number.MAX_SAFE_INTEGER) - (b.__order ?? Number.MAX_SAFE_INTEGER)
      })
    }

    const setRoomMemberList = (roomId: string, members: UserItem[]) => {
      if (!Array.isArray(members) || members.length === 0) {
        userListMap[roomId] = []
        memberOrderCounters[roomId] = 0
        return
      }

      const sortedMembers = sortMembersByRole(roomId, members as InternalUserItem[])
      userListMap[roomId] = sortedMembers
    }
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

    // 添加获取当前会话状态的方法
    const getCurrentSessionState = () => {
      return {
        ...currentSessionState.value,
        isCurrentRoom: (roomId: string) => currentSessionState.value.roomId === roomId
      }
    }

    // 添加成员缓存管理方法
    const getCachedMembers = (roomId: string) => {
      return userListMap[roomId] || []
    }

    const updateMemberCache = (roomId: string, members: UserItem[]) => {
      setRoomMemberList(roomId, members)
    }

    /**
     * 添加会话切换方法
     */
    const switchSession = async (newSession: any, _oldSession?: any) => {
      if (!newSession?.roomId || newSession.roomId === currentSessionState.value.roomId) {
        return
      }

      // 设置当前加载的房间ID
      currentSessionState.value.roomId = newSession.roomId
      currentSessionState.value.loading = true

      try {
        // 优先显示缓存
        const cachedMembers = getCachedMembers(newSession.roomId)
        if (cachedMembers && Array.isArray(cachedMembers)) {
          // 先设置缓存数据避免空白
          setRoomMemberList(newSession.roomId, cachedMembers)
        }

        // 重置群组并加载新的群成员数据
        resetGroupData()
        await getGroupUserList(newSession.roomId)

        // 更新缓存
        const currentMembers = userListMap[newSession.roomId] || []
        updateMemberCache(newSession.roomId, currentMembers)
        currentSessionState.value.lastLoadedRoomId = newSession.roomId

        // 返回处理后的数据
        return {
          success: true,
          members: currentMembers,
          roomId: newSession.roomId
        }
      } catch (error) {
        console.error('切换会话失败:', error)
        currentSessionState.value.loading = false
        throw error
      } finally {
        currentSessionState.value.loading = false
      }
    }

    // 获取当前房间的用户列表的计算属性
    const userList = computed(() => {
      if (!globalStore.currentSessionRoomId) return []
      return userListMap[globalStore.currentSessionRoomId] || []
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

    const getUserInfo = computed(() => (uid: string, roomId?: string) => {
      const targetRoomId = roomId ?? globalStore.currentSessionRoomId
      if (targetRoomId) {
        const roomUserList = userListMap[targetRoomId]
        if (roomUserList) {
          const userInRoom = roomUserList.find((item) => item.uid === uid)
          if (userInRoom) {
            return userInRoom
          }
        }
      }

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
      const targetGroup = groupDetails.value.find((item) => item.roomId === roomId)!
      const newData = {
        ...targetGroup,
        ...detail
      }
      Object.assign(targetGroup, newData)
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
     * 更新管理员状态
     * @param roomId 房间ID
     * @param uids 被设置、取消管理员的用户ID列表
     * @param isAdmin 是否为管理员
     */
    const updateAdminStatus = (roomId: string, uids: string[], isAdmin: boolean) => {
      const currentUserList = userListMap[roomId]
      if (!currentUserList) {
        console.warn(`未找到房间 ${roomId} 的用户列表`)
        return
      }

      // 更新用户角色
      const updatedUserList = currentUserList.map((user) => {
        if (uids.includes(user.uid)) {
          return {
            ...user,
            roleId: isAdmin ? RoleEnum.ADMIN : RoleEnum.NORMAL
          }
        }
        return user
      })

      // 更新用户列表
      setRoomMemberList(roomId, updatedUserList)
    }

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

    const isAdminOrLord = () => {
      const currentUser = getCurrentUser()
      return isAdmin.value(currentUser.uid) || isCurrentLord.value(currentUser.uid)
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
      return groupDetails.value.find((item: GroupDetailReq) => item.roomId === globalStore.currentSessionRoomId)
    })

    const getGroupDetailByRoomId = computed(() => (roomId: string) => {
      return groupDetails.value.find((item: GroupDetailReq) => item.roomId === roomId)
    })

    // 状态定义：添加一个用于管理正在进行的请求的Map
    const fetchPromisesMap = ref<Record<string, Promise<GroupDetailReq>>>({})

    /**
     * 智能获取群组详情：如果本地有则直接返回，如果没有则从远程获取并缓存
     * @param roomId 群组ID
     */
    const fetchGroupDetailSafely = async (roomId: string, forceRefresh: boolean = false): Promise<GroupDetailReq> => {
      // 1. 检查本地缓存（除非强制刷新）
      const existingDetail = getGroupDetailByRoomId.value(roomId)
      if (existingDetail && !forceRefresh) {
        return existingDetail
      }

      // 2. 防止并发重复请求
      try {
        // 3. 创建新的请求Promise并缓存
        fetchPromisesMap.value[roomId] = (async () => {
          try {
            // 调用你已有的远程获取方法
            await addGroupDetail(roomId)

            const finalDetail = getGroupDetailByRoomId.value(roomId)
            if (!finalDetail) {
              throw new Error(`群组 ${roomId} 数据获取失败`)
            }
            return finalDetail
          } finally {
            // 清理当前请求的缓存
            delete fetchPromisesMap.value[roomId]
          }
        })()

        // 4. 等待请求完成并返回结果
        return await fetchPromisesMap.value[roomId]
      } catch (error) {
        console.error(`获取群组 ${roomId} 详情失败:`, error)
        throw error
      }
    }

    /**
     * 本地获取房间信息
     */
    const getGroupDetail = computed(() => (roomId: string) => {
      return groupDetailsCache.value[roomId] || getGroupDetailByRoomId.value(roomId)
    })

    const loadGroupDetails = async (roomIds: string[]) => {
      const uniqueRoomIds = [...new Set(roomIds.filter((id) => id))]

      for (const roomId of uniqueRoomIds) {
        if (groupDetailsCache.value[roomId] || loadingGroups.value.has(roomId)) {
          continue
        }

        loadingGroups.value.add(roomId)
        try {
          const detail = await fetchGroupDetailSafely(roomId)
          groupDetailsCache.value[roomId] = detail
        } catch (_error) {
        } finally {
          loadingGroups.value.delete(roomId)
        }
      }
    }

    const updateGroupNumber = (roomId: string, totalNum: number, onlineNum: number) => {
      const group = groupDetails.value.find((item) => item.roomId === roomId)
      if (group) {
        group.memberNum = totalNum
        group.onlineNum = onlineNum
      }
    }

    // 校验合法的群聊/频道才会触发成员刷新
    const isValidGroupRoom = (roomId?: string | null): roomId is string => {
      if (!roomId) return false
      if (roomId === '1') return true
      const session = chatStore.getSession(roomId)
      return session?.type === RoomTypeEnum.GROUP
    }

    /**
     * 获取群成员列表
     * @param roomId 群聊房间ID
     * @param forceRefresh 是否强制刷新,默认false
     */
    const getGroupUserList = async (roomId: string, forceRefresh = false) => {
      if (!isValidGroupRoom(roomId)) {
        console.warn('[group] skip member refresh, invalid room id:', roomId)
        return []
      }

      const cachedList = userListMap[roomId]

      if (!forceRefresh && Array.isArray(cachedList) && cachedList.length > 0) {
        return cachedList
      }

      if (!Array.isArray(cachedList)) {
        setRoomMemberList(roomId, [])
      }

      const data = await ImRequestUtils.groupListMember(roomId)
      if (!data) {
        userListOptions.loading = false
        return []
      }

      userListOptions.loading = false

      const list = Array.isArray(data) ? [...data] : []
      updateMemberCache(roomId, list)

      return userListMap[roomId]
    }

    const cleanupSession = () => {
      currentSessionState.value = {
        roomId: '',
        loading: false,
        lastLoadedRoomId: ''
      }
    }

    /**
     * 加载更多群成员
     * 分页加载，防止重复加载
     */
    const loadMoreGroupMembers = async () => {
      if (userListOptions.isLast || userListOptions.loading) return
      userListOptions.loading = true
      await getGroupUserList(globalStore.currentSessionRoomId)
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
        console.warn('[updateUserItem] invalid uid:', uid)
        return false
      }

      if (!updates || typeof updates !== 'object') {
        console.warn('[updateUserItem] invalid update payload:', updates)
        return false
      }

      const refreshTargets = new Set<string>()

      if (roomId === 'all') {
        getRoomIdsByUid(uid).forEach((room) => {
          if (isValidGroupRoom(room)) {
            refreshTargets.add(room)
          }
        })
      } else {
        const targetRoomId = roomId || globalStore.currentSessionRoomId
        if (!isValidGroupRoom(targetRoomId)) {
          return false
        }
        refreshTargets.add(targetRoomId)
      }

      if (refreshTargets.size === 0) {
        return false
      }

      refreshTargets.forEach((validRoomId) => {
        getGroupUserList(validRoomId, true).catch((error) => {
          console.error('[group] refresh members failed:', error)
        })
      })

      return true
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
        console.warn('[addUserItem] invalid user info:', userItem)
        return false
      }

      const targetRoomId = roomId || globalStore.currentSessionRoomId
      if (!isValidGroupRoom(targetRoomId)) {
        console.warn('[addUserItem] cannot determine target room id')
        return false
      }

      getGroupUserList(targetRoomId, true).catch((error) => {
        console.error('[group] refresh members failed:', error)
      })

      return true
    }

    /**
     * 从 userListMap 中移除指定用户
     * @param uid 要移除的用户ID
     * @param roomId 群聊房间ID，可选，默认使用当前房间；如果传入 'all' 则从所有房间中移除
     * @returns 是否成功移除
     */
    const removeUserItem = (uid: string, roomId?: string): boolean => {
      if (!uid || typeof uid !== 'string') {
        console.warn('[removeUserItem] invalid uid:', uid)
        return false
      }

      const targetRoomId = roomId || globalStore.currentSessionRoomId
      if (!isValidGroupRoom(targetRoomId)) {
        console.warn('[removeUserItem] cannot determine target room id')
        return false
      }

      getGroupUserList(targetRoomId, true).catch((error) => {
        console.error('[group] refresh members failed:', error)
      })

      return true
    }

    /**
     * 移除 某个房间中的所有user 数据
     * @param roomId
     */
    const removeAllUsers = (roomId: string) => {
      setRoomMemberList(roomId, [])
    }

    /**
     * 添加群管理员
     * @param uidList 要添加为管理员的用户ID列表
     */
    const addAdmin = async (uidList: string[]) => {
      await ImRequestUtils.addAdmin({ roomId: globalStore.currentSessionRoomId, uidList })
      // 更新本地群成员列表中的角色信息
      const targetRoomId = globalStore.currentSessionRoomId
      if (!targetRoomId) return

      const currentUserList = userListMap[targetRoomId] || []
      const updatedList = currentUserList.map((user: UserItem) => {
        if (uidList.includes(user.uid)) {
          return { ...user, roleId: RoleEnum.ADMIN }
        }
        return user
      })
      setRoomMemberList(targetRoomId, updatedList)
    }

    /**
     * 撤销群管理员身份
     * @param uidList 要撤销的管理员ID列表
     */
    const revokeAdmin = async (uidList: string[]) => {
      await ImRequestUtils.revokeAdmin({ roomId: globalStore.currentSessionRoomId, uidList })
      // 更新本地群成员列表中的角色信息
      const targetRoomId = globalStore.currentSessionRoomId
      if (!targetRoomId) return

      const currentUserList = userListMap[targetRoomId] || []
      const updatedList = currentUserList.map((user: UserItem) => {
        if (uidList.includes(user.uid)) {
          return { ...user, roleId: RoleEnum.NORMAL }
        }
        return user
      })
      setRoomMemberList(targetRoomId, updatedList)
    }

    /**
     * 踢出群成员
     * @param uidList 要踢出的成员ID列表
     * @param roomId 群聊房间ID，可选，默认使用当前房间
     */
    const removeGroupMembers = async (uidList: string[], roomId?: string) => {
      const targetRoomId = roomId || globalStore.currentSessionRoomId
      if (!targetRoomId) {
        throw new Error('无法确定目标房间ID')
      }

      // 调用踢人接口
      await ImRequestUtils.removeGroupMember({ roomId: targetRoomId, uidList })

      // 更新本地群成员列表，移除被踢出的成员
      const currentUserList = userListMap[targetRoomId] || []
      const updatedList = currentUserList.filter((user: UserItem) => !uidList.includes(user.uid))
      setRoomMemberList(targetRoomId, updatedList)
    }

    /**
     * 退出群聊 / 解散群聊
     * @param roomId 要退出的群聊ID
     */
    const exitGroup = async (roomId: string) => {
      if (!roomId) return

      await ImRequestUtils.exitGroup({ roomId })

      // 更新群成员缓存，移除自己
      const currentUserList = userListMap[roomId] || []
      const updatedList = currentUserList.filter((user: UserItem) => user.uid !== userStore.userInfo!.uid)
      setRoomMemberList(roomId, updatedList)

      // 删除对应的群详情缓存
      removeGroupDetail(roomId)

      // 更新会话列表，使用传入的 roomId
      chatStore.removeSession(roomId)

      // 如果退出的是当前选中的会话，则切换到新的当前会话
      if (globalStore.currentSessionRoomId === roomId) {
        const fallbackSession = chatStore.sessionList[0]
        globalStore.updateCurrentSessionRoomId(fallbackSession ? fallbackSession.roomId : '')
      }
    }

    /**
     * 用于处理在线状态变更时的群成员列表刷新
     */
    const refreshGroupMembers = async () => {
      // 始终刷新频道成员列表
      await getGroupUserList('1', true)

      // 如果当前选中的是群聊且不是频道，则同时刷新当前群聊的成员列表
      if (globalStore.currentSession?.type === RoomTypeEnum.GROUP && globalStore.currentSessionRoomId !== '1') {
        await getGroupUserList(globalStore.currentSessionRoomId, true)
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

    const getUser = (roomId: string, uid: string): UserItem | undefined => {
      const roomUserList = userListMap[roomId]
      if (!roomUserList) {
        return undefined
      }
      return roomUserList.find((item) => item.uid === uid)
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
        if (!Array.isArray(userList) || userList.length === 0) {
          return
        }
        // 检查当前房间是否包含指定的用户
        const hasUser = userList.some((user) => user.uid === uid)
        if (hasUser && isValidGroupRoom(roomId)) {
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
      removeGroupMembers,
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
      getGroupDetail,
      loadGroupDetails,
      updateGroupNumber,
      removeGroupDetail,
      addGroupDetail,
      updateAdminStatus,
      switchSession,
      getCurrentSessionState,
      getCachedMembers,
      updateMemberCache,
      getUserInfo,
      allUserInfo,
      getUserDisplayName,
      isCurrentLord,
      isAdmin,
      isAdminOrLord,
      cleanupSession
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
