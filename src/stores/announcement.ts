import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { useCachedStore } from '@/stores/cached'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'

export const useAnnouncementStore = defineStore(StoresEnum.ANNOUNCEMENT, () => {
  const globalStore = useGlobalStore()
  const groupStore = useGroupStore()
  const userStore = useUserStore()
  const cachedStore = useCachedStore()

  // 公告相关状态
  const announList = ref<any[]>([])
  const announNum = ref(0)
  const announError = ref(false)
  const isAddAnnoun = ref(false)

  const announcementContent = computed(() => (announList.value.length > 0 ? (announList.value[0]?.content ?? '') : ''))

  // 判断当前用户是否有权限添加公告
  const canAddAnnouncement = computed(() => {
    if (!userStore.userInfo?.uid) return false

    const isLord = groupStore.isCurrentLord(userStore.userInfo.uid) ?? false
    const isAdmin = groupStore.isAdmin(userStore.userInfo.uid) ?? false

    // 判断当前用户是否拥有id为6的徽章 并且是频道
    const hasBadge6 = () => {
      if (globalStore.currentSession?.roomId !== '1') return false

      const currentUser = groupStore.getUserInfo(userStore.userInfo!.uid)
      return currentUser?.itemIds?.includes('6') ?? false
    }

    return isLord || isAdmin || hasBadge6()
  })

  /**
   * 清空公告
   */
  const clearAnnouncements = () => {
    announList.value = []
    announNum.value = 0
    announError.value = false
  }

  const formatRecords = (records: any[]) => {
    if (!records || records.length === 0) return []
    const topAnnouncement = records.find((item) => item.top)
    if (!topAnnouncement) return records
    return [topAnnouncement, ...records.filter((item) => !item.top)]
  }

  const loadGroupAnnouncements = async (roomId?: string) => {
    const targetRoomId = roomId ?? globalStore.currentSession?.roomId
    if (!targetRoomId) {
      console.error('当前会话没有roomId')
      return
    }

    try {
      // 判断是否可以添加公告
      isAddAnnoun.value = canAddAnnouncement.value

      // 获取群公告列表
      const data = await cachedStore.getGroupAnnouncementList(targetRoomId, 1, 10)

      // 会话已切换，避免覆盖其他房间的数据
      if (targetRoomId !== globalStore.currentSession?.roomId) {
        return
      }

      if (data) {
        announList.value = formatRecords([...(data.records ?? [])])
        announNum.value = parseInt(data.total, 10)
        announError.value = false
      } else {
        announList.value = []
        announNum.value = 0
        announError.value = false
      }
    } catch (error) {
      console.error('加载群公告失败:', error)
      if (targetRoomId === globalStore.currentSession?.roomId) {
        announError.value = true
      }
    }
  }

  return {
    announNum,
    announError,
    isAddAnnoun,
    announcementContent,
    canAddAnnouncement,
    loadGroupAnnouncements,
    clearAnnouncements
  }
})
