import { defineStore } from 'pinia'
import apis from '@/services/apis'
import { useGlobalStore } from '@/stores/global'
import type { CacheBadgeItem, CacheUserItem } from '@/services/types'
import { isDiffNow10Min } from '@/utils/ComputedTime.ts'
import { useDebounceFn } from '@vueuse/core'
import { StoresEnum } from '@/enums'

// 定义基础用户信息类型，只包含uid、头像和名称
export type BaseUserItem = Pick<CacheUserItem, 'uid' | 'avatar' | 'name' | 'account'>

export const useCachedStore = defineStore(StoresEnum.CACHED, () => {
  const globalStore = useGlobalStore()
  // 用户信息缓存列表，key为用户ID
  const userCachedList = reactive<Record<string, Partial<CacheUserItem>>>({})
  // 徽章信息缓存列表，key为徽章ID
  const badgeCachedList = reactive<Record<string, Partial<CacheBadgeItem>>>({})

  // 获取当前聊天室ID
  const currentRoomId = computed(() => globalStore.currentSession?.roomId)

  // @ 用户列表的Map，key为房间ID，value为用户列表
  const atUsersMap = reactive<Record<string, BaseUserItem[]>>({ [currentRoomId.value]: [] }) // 消息Map

  // 当前房间可@ 的用户列表
  const currentAtUsersList = computed({
    get: () => {
      const current = atUsersMap[currentRoomId.value]
      if (current === undefined) {
        atUsersMap[currentRoomId.value] = []
      }
      // 如果是大厅（roomId=1），返回所有缓存的用户
      if (currentRoomId.value === '1') {
        return Object.values(userCachedList).map((user) => ({
          uid: user.uid,
          avatar: user.avatar,
          name: user.name,
          account: user.account
        })) as BaseUserItem[]
      }
      return atUsersMap[currentRoomId.value]
    },
    set: (val) => {
      atUsersMap[currentRoomId.value] = val
    }
  })

  /** 用于存储正在请求的用户ID */
  const pendingUids = ref(new Set<string>())

  /**
   * 批量获取用户详细信息的防抖包装函数
   * 300ms 的防抖时间应该足够合并多次快速调用
   */
  const debouncedGetBatchUserInfo = useDebounceFn(async (uids: string[]) => {
    let result: { uid: string; lastModifyTime: number | undefined }[] = []

    try {
      // 去重：过滤掉正在请求的用户ID
      const uniqueUids = uids.filter((uid) => !pendingUids.value.has(uid))
      if (uniqueUids.length === 0) return

      // 筛选需要更新的用户：没有lastModifyTime或距离上次更新超过10分钟的用户
      result = uniqueUids
        .map((uid) => {
          const cacheUser = userCachedList[uid]
          return { uid, lastModifyTime: cacheUser?.lastModifyTime }
        })
        .filter((item) => !item.lastModifyTime || isDiffNow10Min(item.lastModifyTime))

      if (!result.length) return

      // 将要请求的用户ID添加到待处理集合中
      result.forEach((item) => pendingUids.value.add(item.uid))

      // 收集需要获取的徽章ID
      const itemIdSet: Set<string> = new Set()
      const data = await apis.getUserInfoBatch(result)

      for (const item of data || []) {
        // 更新用户信息缓存
        userCachedList[item.uid] = {
          ...userCachedList[item.uid], // 保留旧数据
          ...item, // 用新数据覆盖
          needRefresh: undefined,
          lastModifyTime: Date.now()
        }

        // 收集用户佩戴的徽章ID
        const wearingItemId = item.wearingItemId
        wearingItemId && itemIdSet.add(wearingItemId)

        // 从待处理集合中移除已完成的用户ID
        pendingUids.value.delete(item.uid)
      }

      // 批量获取徽章信息
      await getBatchBadgeInfo([...itemIdSet])
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 发生错误时也要清理待处理集合
      result?.forEach((item) => pendingUids.value.delete(item.uid))
    }
  }, 300)

  /**
   * 批量获取用户详细信息
   * @param uids 用户ID数组
   */
  const getBatchUserInfo = (uids: string[]) => {
    return debouncedGetBatchUserInfo(uids)
  }

  /** 批量获取徽章详细信息
   * @param itemIds 徽章ID数组
   */
  const getBatchBadgeInfo = async (itemIds: string[]) => {
    // 筛选需要更新的徽章：没有lastModifyTime或距离上次更新超过10分钟的徽章
    const result = itemIds
      .map((itemId) => {
        const cacheBadge = badgeCachedList[itemId]
        return { itemId, lastModifyTime: cacheBadge?.lastModifyTime }
      })
      .filter((item) => !item.lastModifyTime || isDiffNow10Min(item.lastModifyTime))
    if (!result.length) return

    // 获取并更新徽章信息缓存
    const data = await apis.getBadgesBatch(result)
    for (const item of data || []) {
      badgeCachedList[item.itemId] = {
        ...(item?.needRefresh ? item : badgeCachedList[item.itemId]),
        needRefresh: undefined,
        lastModifyTime: Date.now()
      }
    }
  }

  /** 初始化房间内所有用户的基本信息（用于@功能）
   * 只在首次加载时执行一次
   */
  const initAllUserBaseInfo = async () => {
    // 这里获取的是全员群的全部用户信息，所以取1作为roomId
    if (localStorage.getItem('IS_INIT_USER_BASE') === null) {
      const data = await apis.getAllUserBaseInfo({ roomId: 1 })
      for (const item of data || []) {
        userCachedList[item.uid] = item
      }
      localStorage.setItem('IS_INIT_USER_BASE', 'true')
    }
  }

  /** 获取群组内可@的用户基本信息
   * 如果是大厅（roomId=1）则不执行
   */
  const getGroupAtUserBaseInfo = async () => {
    if (currentRoomId.value === '1') return
    currentAtUsersList.value = await apis.getAllUserBaseInfo({ roomId: currentRoomId.value })
  }

  /**
   * 根据用户ID列表过滤出对应的用户信息
   * @param uidList 用户ID列表
   * @returns 过滤后的用户列表
   */
  const filterUsersByUidList = (uidList: string[]) => {
    return currentAtUsersList.value.filter((user) => uidList.includes(user.uid))
  }

  /**
   * 更新用户状态并刷新用户信息
   * @param data 用户状态变更数据
   */
  const updateUserState = async (data: { uid: string; userStateId: string }) => {
    const { uid, userStateId } = data

    // 更新缓存中的用户状态
    if (userCachedList[uid]) {
      userCachedList[uid] = {
        ...userCachedList[uid],
        userStateId,
        // 强制更新
        account: userCachedList[uid].account,
        needRefresh: true,
        // 重置最后更新时间，确保能重新获取数据
        lastModifyTime: 0
      }
    }

    // 重新获取该用户的详细信息
    await getBatchUserInfo([uid])
  }

  const userAvatarUpdated = ref(false)

  const updateUserCache = (userInfo: CacheUserItem) => {
    // 更新缓存
    userCachedList[userInfo.uid] = userInfo
    // 标记头像已更新，触发相关组件重新渲染
    userAvatarUpdated.value = !userAvatarUpdated.value
  }

  return {
    userCachedList,
    badgeCachedList,
    getBatchUserInfo,
    getBatchBadgeInfo,
    initAllUserBaseInfo,
    getGroupAtUserBaseInfo,
    currentAtUsersList,
    filterUsersByUidList,
    updateUserState,
    userAvatarUpdated,
    updateUserCache
  }
})
