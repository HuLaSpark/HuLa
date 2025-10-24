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

  // 计算属性
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
   * 加载群公告
   */
  const loadGroupAnnouncements = async () => {
    try {
      const roomId = globalStore.currentSession?.roomId
      if (!roomId) {
        console.error('当前会话没有roomId')
        return
      }

      // 设置是否可以添加公告
      isAddAnnoun.value = canAddAnnouncement.value

      // 获取群公告列表
      const data = await cachedStore.getGroupAnnouncementList(roomId, 1, 10)
      if (data) {
        announList.value = data.records
        // 处理置顶公告
        if (announList.value && announList.value.length > 0) {
          const topAnnouncement = announList.value.find((item: any) => item.top)
          if (topAnnouncement) {
            announList.value = [topAnnouncement, ...announList.value.filter((item: any) => !item.top)]
          }
        }
        announNum.value = parseInt(data.total, 10)
        announError.value = false
      } else {
        announError.value = false
      }
    } catch (error) {
      console.error('加载群公告失败:', error)
      announError.value = true
    }
  }

  /**
   * 清空公告
   */
  const clearAnnouncements = () => {
    announNum.value = 0
    announList.value = []
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
