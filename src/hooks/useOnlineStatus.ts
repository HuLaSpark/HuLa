import { storeToRefs } from 'pinia'
import { OnlineEnum } from '@/enums'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { useUserStatusStore } from '@/stores/userStatus'

// 在线状态管理(仅是在线和离线)
export const useOnlineStatus = (uid?: ComputedRef<string | undefined> | Ref<string | undefined>) => {
  const userStore = useUserStore()
  const groupStore = useGroupStore()
  const userStatusStore = useUserStatusStore()
  const { currentState } = storeToRefs(userStatusStore)

  // 如果传入了uid参数，使用传入的uid对应的用户信息；否则使用当前登录用户的信息
  const currentUser = uid
    ? computed(() => (uid.value ? groupStore.getUserInfo(uid.value) : undefined))
    : computed(() => {
        // 没有传入uid时，从groupStore获取当前用户信息以获得activeStatus
        const currentUid = userStore.userInfo?.uid
        return currentUid ? groupStore.getUserInfo(currentUid) : undefined
      })

  // userStateId优先从userStore获取（保证响应式更新），如果没有则从currentUser获取
  const userStateId = uid
    ? computed(() => currentUser.value?.userStateId)
    : computed(() => userStore.userInfo?.userStateId)

  const activeStatus = computed(() => currentUser.value?.activeStatus ?? OnlineEnum.OFFLINE)

  const hasCustomState = computed(() => {
    const stateId = userStateId.value
    // 只有 '0' 表示清空状态（无自定义状态），其他都是自定义状态
    return !!stateId && stateId !== '0'
  })

  // 获取用户的状态信息
  const userStatus = computed(() => {
    if (!userStateId.value) return null
    return userStatusStore.stateList.find((state: { id: string }) => state.id === userStateId.value)
  })

  const isOnline = computed(() => activeStatus.value === OnlineEnum.ONLINE)

  const statusIcon = computed(() => {
    if (hasCustomState.value && userStatus.value?.url) {
      return userStatus.value.url
    }
    return isOnline.value ? '/status/online.png' : '/status/offline.png'
  })

  const statusTitle = computed(() => {
    if (hasCustomState.value && userStatus.value?.title) {
      return userStatus.value.title
    }
    return isOnline.value ? '在线' : '离线'
  })

  const statusBgColor = computed(() => {
    if (hasCustomState.value && userStatus.value?.bgColor) {
      return userStatus.value.bgColor
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
    hasCustomState,
    userStatus
  }
}
