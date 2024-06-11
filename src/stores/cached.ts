import { defineStore } from 'pinia'
import apis from '@/services/apis'
import { useGlobalStore } from '@/stores/global'
import type { CacheBadgeItem, CacheUserItem } from '@/services/types'
import { isDiffNow10Min } from '@/utils/ComputedTime.ts'

export type BaseUserItem = Pick<CacheUserItem, 'uid' | 'avatar' | 'name'>

export const useCachedStore = defineStore('cached', () => {
  const globalStore = useGlobalStore()
  const userCachedList = reactive<Record<number, Partial<CacheUserItem>>>({})
  const badgeCachedList = reactive<Record<number, Partial<CacheBadgeItem>>>({})

  const currentRoomId = computed(() => globalStore.currentSession?.roomId)

  const atUsersMap = reactive<Record<number, BaseUserItem[]>>({ [currentRoomId.value]: [] }) // 消息Map

  const currentAtUsersList = computed({
    get: () => {
      const current = atUsersMap[currentRoomId.value]
      if (current === undefined) {
        atUsersMap[currentRoomId.value] = []
      }
      if (currentRoomId.value === 1) {
        return Object.values(userCachedList as BaseUserItem[])
      }
      return atUsersMap[currentRoomId.value]
    },
    set: (val) => {
      atUsersMap[currentRoomId.value] = val
    }
  })

  /** 批量获取用户详细信息 */
  const getBatchUserInfo = async (uids: number[]) => {
    // 没有 lastModifyTime 的要更新，lastModifyTime 距离现在 10 分钟已上的也要更新
    const result = uids
      .map((uid) => {
        const cacheUser = userCachedList[uid]
        return { uid, lastModifyTime: cacheUser?.lastModifyTime }
      })
      .filter((item) => !item.lastModifyTime || isDiffNow10Min(item.lastModifyTime))
    if (!result.length) return
    const itemIdSet: Set<number> = new Set()
    const { data } = await apis.getUserInfoBatch(result)
    data?.forEach((item: CacheUserItem) => {
      // 更新最后更新时间。
      userCachedList[item.uid] = {
        ...(item?.needRefresh ? item : userCachedList[item.uid]),
        needRefresh: undefined,
        lastModifyTime: Date.now()
      }

      // 收集徽章 id并缓存
      // 可以改成 itemIds，可以更快收集完成。
      const wearingItemId = item.wearingItemId
      wearingItemId && itemIdSet.add(wearingItemId)
    })
    // 批量请求徽章详情
    await getBatchBadgeInfo([...itemIdSet])
  }

  /** 批量获取用户徽章详细信息 */
  const getBatchBadgeInfo = async (itemIds: number[]) => {
    // 没有 lastModifyTime 的要更新，lastModifyTime 距离现在 10 分钟已上的也要更新
    const result = itemIds
      .map((itemId) => {
        const cacheBadge = badgeCachedList[itemId]
        return { itemId, lastModifyTime: cacheBadge?.lastModifyTime }
      })
      .filter((item) => !item.lastModifyTime || isDiffNow10Min(item.lastModifyTime))
    if (!result.length) return
    const { data } = await apis.getBadgesBatch(result)
    data?.forEach(
      (item: CacheBadgeItem) =>
        // 更新最后更新时间。
        (badgeCachedList[item.itemId] = {
          ...(item?.needRefresh ? item : badgeCachedList[item.itemId]),
          needRefresh: undefined,
          lastModifyTime: Date.now()
        })
    )
  }

  /** 房间内的所有群成员列表-@专用 */
  const initAllUserBaseInfo = async () => {
    if (localStorage.getItem('IS_INIT_USER_BASE') === null) {
      const { data } = await apis.getAllUserBaseInfo({ params: { roomId: currentRoomId.value } })
      data?.forEach((item: CacheUserItem) => (userCachedList[item.uid] = item))
      localStorage.setItem('IS_INIT_USER_BASE', 'true')
    }
  }

  const getGroupAtUserBaseInfo = async () => {
    if (currentRoomId.value === 1) return
    const { data } = await apis.getAllUserBaseInfo({ params: { roomId: currentRoomId.value } })
    currentAtUsersList.value = data
  }

  /**
   * 根据用户名关键字过滤用户
   * @param searchKey 检索的关键字
   */
  // const filterUsers = (searchKey: string) => {
  //   // 需要过滤自己
  //   return currentAtUsersList.value?.filter((item) => item.name?.startsWith(searchKey))
  // }

  /**
   * 通过用户ID列表获取用户基本信息
   * @param uidList
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
