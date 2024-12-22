import { defineStore } from 'pinia'
import apis from '@/services/apis'
import { useGlobalStore } from '@/stores/global'
import type { CacheBadgeItem, CacheUserItem } from '@/services/types'
import { isDiffNow10Min } from '@/utils/ComputedTime.ts'

// 定义基础用户信息类型，只包含uid、头像和名称
export type BaseUserItem = Pick<CacheUserItem, 'uid' | 'avatar' | 'name'>

export const useCachedStore = defineStore('cached', () => {
  const globalStore = useGlobalStore()
  // 用户信息缓存列表，key为用户ID
  const userCachedList = reactive<Record<number, Partial<CacheUserItem>>>({})
  // 徽章信息缓存列表，key为徽章ID
  const badgeCachedList = reactive<Record<number, Partial<CacheBadgeItem>>>({})

  // 获取当前聊天室ID
  const currentRoomId = computed(() => globalStore.currentSession?.roomId)

  // @ 用户列表的Map，key为房间ID，value为用户列表
  const atUsersMap = reactive<Record<number, BaseUserItem[]>>({ [currentRoomId.value]: [] }) // 消息Map

  // 当前房间可@ 的用户列表
  const currentAtUsersList = computed({
    get: () => {
      const current = atUsersMap[currentRoomId.value]
      if (current === undefined) {
        atUsersMap[currentRoomId.value] = []
      }
      // 如果是大厅（roomId=1），返回所有缓存的用户
      if (currentRoomId.value === 1) {
        return Object.values(userCachedList as BaseUserItem[])
      }
      return atUsersMap[currentRoomId.value]
    },
    set: (val) => {
      atUsersMap[currentRoomId.value] = val
    }
  })

  /** 批量获取用户详细信息
   * @param uids 用户ID数组
   */
  const getBatchUserInfo = async (uids: number[]) => {
    // 筛选需要更新的用户：没有lastModifyTime或距离上次更新超过10分钟的用户
    const result = uids
      .map((uid) => {
        const cacheUser = userCachedList[uid]
        return { uid, lastModifyTime: cacheUser?.lastModifyTime }
      })
      .filter((item) => !item.lastModifyTime || isDiffNow10Min(item.lastModifyTime))
    if (!result.length) return

    // 收集需要获取的徽章ID
    const itemIdSet: Set<number> = new Set()
    const data = await apis.getUserInfoBatch(result)
    data?.forEach((item: CacheUserItem) => {
      // 更新用户信息缓存
      userCachedList[item.uid] = {
        ...(item?.needRefresh ? item : userCachedList[item.uid]),
        needRefresh: undefined,
        lastModifyTime: Date.now()
      }

      // 收集用户佩戴的徽章ID
      const wearingItemId = item.wearingItemId
      wearingItemId && itemIdSet.add(wearingItemId)
    })
    // 批量获取徽章信息
    await getBatchBadgeInfo([...itemIdSet])
  }

  /** 批量获取徽章详细信息
   * @param itemIds 徽章ID数组
   */
  const getBatchBadgeInfo = async (itemIds: number[]) => {
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
    data?.forEach(
      (item: CacheBadgeItem) =>
        (badgeCachedList[item.itemId] = {
          ...(item?.needRefresh ? item : badgeCachedList[item.itemId]),
          needRefresh: undefined,
          lastModifyTime: Date.now()
        })
    )
  }

  /** 初始化房间内所有用户的基本信息（用于@功能）
   * 只在首次加载时执行一次
   */
  const initAllUserBaseInfo = async () => {
    if (localStorage.getItem('IS_INIT_USER_BASE') === null) {
      const data = await apis.getAllUserBaseInfo({ roomId: currentRoomId.value })
      data?.forEach((item: CacheUserItem) => (userCachedList[item.uid] = item))
      localStorage.setItem('IS_INIT_USER_BASE', 'true')
    }
  }

  /** 获取群组内可@的用户基本信息
   * 如果是大厅（roomId=1）则不执行
   */
  const getGroupAtUserBaseInfo = async () => {
    if (currentRoomId.value === 1) return
    currentAtUsersList.value = await apis.getAllUserBaseInfo({ roomId: currentRoomId.value })
  }

  /**
   * 根据用户ID列表过滤出对应的用户信息
   * @param uidList 用户ID列表
   * @returns 过滤后的用户列表
   */
  const filterUsersByUidList = (uidList: number[]) => {
    return currentAtUsersList.value.filter((user) => uidList.includes(user.uid))
  }

  return {
    userCachedList,
    badgeCachedList,
    getBatchUserInfo,
    getBatchBadgeInfo,
    initAllUserBaseInfo,
    getGroupAtUserBaseInfo,
    currentAtUsersList,
    filterUsersByUidList
  }
})
