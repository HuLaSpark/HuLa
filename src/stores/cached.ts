import { defineStore } from 'pinia'
import { StoresEnum, TauriCommand } from '@/enums'
import type { CacheBadgeItem, CacheUserItem } from '@/services/types'
import { isDiffNow10Min } from '@/utils/ComputedTime.ts'
import { getAnnouncementList, getBadgesBatch } from '@/utils/ImRequestUtils'
import { invokeSilently } from '@/utils/TauriInvokeHandler.ts'

// 定义基础用户信息类型，只包含uid、头像和名称
export type BaseUserItem = Pick<CacheUserItem, 'uid' | 'avatar' | 'name' | 'account'>

export const useCachedStore = defineStore(StoresEnum.CACHED, () => {
  // 徽章信息缓存列表，key为徽章ID
  const badgeCachedList = reactive<Record<string, Partial<CacheBadgeItem>>>({})

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
    const data = await getBadgesBatch(result)
    for (const item of data || []) {
      badgeCachedList[item.itemId] = {
        ...(item?.needRefresh ? item : badgeCachedList[item.itemId]),
        needRefresh: undefined,
        lastModifyTime: Date.now()
      }
    }
  }

  /**
   * 根据用户ID列表过滤出对应的用户信息
   * @param uidList 用户ID列表
   * @returns 过滤后的用户列表
   */
  const filterUsersByUidList = async (uidList: string[]) => {
    const { useGroupStore } = await import('@/stores/group')
    const groupStore = useGroupStore()
    return groupStore.userList.filter((user) => uidList.includes(user.uid))
  }

  const userAvatarUpdated = ref(false)

  /**
   * 获取群组公告
   * @roomId 群组ID
   * @reload 是否强制重新加载
   * @returns 群组公告列表
   */
  const getGroupAnnouncementList = async (roomId: string, page: number, size: number) => {
    const data: any = await getAnnouncementList(roomId, page, size)
    if (data) {
      return data
    }
  }

  const updateMyRoomInfo = async (data: any) => {
    await invokeSilently(TauriCommand.UPDATE_MY_ROOM_INFO, {
      myRoomInfo: data
    })
  }

  return {
    badgeCachedList,
    getBatchBadgeInfo,
    filterUsersByUidList,
    userAvatarUpdated,
    getGroupAnnouncementList,
    updateMyRoomInfo
  }
})
