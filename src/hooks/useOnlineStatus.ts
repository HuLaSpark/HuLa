import { storeToRefs } from 'pinia'
import { OnlineEnum } from '@/enums'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { useUserStatusStore } from '@/stores/userStatus'

// 在线状态管理(仅是在线和离线)
export const useOnlineStatus = () => {
  const userStore = useUserStore()
  const groupStore = useGroupStore()
  const userStatusStore = useUserStatusStore()
  const { currentState } = storeToRefs(userStatusStore)

  const currentUid = computed(() => userStore.userInfo?.uid)
  const currentUser = computed(() => (currentUid.value ? groupStore.getUserInfo(currentUid.value) : undefined))
  const activeStatus = computed(() => currentUser.value?.activeStatus ?? OnlineEnum.OFFLINE)

  const hasCustomState = computed(() => {
    const stateId = userStore.userInfo?.userStateId
    return !!stateId && stateId !== '0' && stateId !== '1'
  })

  const isOnline = computed(() => activeStatus.value === OnlineEnum.ONLINE)

  const statusIcon = computed(() => {
    if (hasCustomState.value && currentState.value?.url) {
      return currentState.value.url
    }
    return isOnline.value ? '/status/online.png' : '/status/offline.png'
  })

  const statusTitle = computed(() => {
    if (hasCustomState.value && currentState.value?.title) {
      return currentState.value.title
    }
    return isOnline.value ? '在线' : '离线'
  })

  const statusBgColor = computed(() => {
    if (hasCustomState.value && currentState.value?.bgColor) {
      return currentState.value.bgColor
    }
    return isOnline.value ? 'rgba(26, 178, 146, 0.4)' : 'rgba(144, 144, 144, 0.4)'
  })

  return {
    currentState,
    activeStatus,
    statusIcon,
    statusTitle,
    statusBgColor,
    isOnline,
    hasCustomState
  }
}
