import { defineStore } from 'pinia'
import { StoresEnum, TauriCommand } from '@/enums'
import type { CacheBadgeItem, CacheUserItem } from '@/services/types'
import { getAnnouncementList, getBadgesBatch } from '@/utils/ImRequestUtils'
import { invokeSilently } from '@/utils/TauriInvokeHandler.ts'

// 定义基础用户信息类型，只包含uid、头像和名称
export type BaseUserItem = Pick<CacheUserItem, 'uid' | 'avatar' | 'name' | 'account'>

export const useCachedStore = defineStore(StoresEnum.CACHED, () => {
  const badgeList = ref<CacheBadgeItem[]>([])

  const badgeById = computed(() => (id?: string) => {
    return badgeList.value.find((badge) => badge.itemId === id)
  })

  const getAllBadgeList = async () => {
    await getBadgesBatch([])
      .then((data) => {
        console.log('获取徽章列表成功', data)
        badgeList.value = data
      })
      .catch((e) => {
        console.error('获取徽章列表失败', e)
        window.$message.error('获取徽章列表失败')
      })
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
    badgeById,
    badgeList,
    userAvatarUpdated,
    getGroupAnnouncementList,
    updateMyRoomInfo,
    getAllBadgeList
  }
})
