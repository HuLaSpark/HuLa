import type { ComputedRef, Ref } from 'vue'
import { useCachedStore } from '@/stores/cached'

/**
 * 统一获取用户信息 hook
 * @param uid 用户 ID
 * @description 引入该Hook后，可响应式获取用户信息
 */
export const useUserInfo = (uid?: number | ComputedRef<number | undefined> | Ref<number>) => {
  const cachedStore = useCachedStore()
  const userInfo = computed(() => (uid && cachedStore.userCachedList[toValue(uid as number)]) || {})
  // 如果没有就请求
  const resultUid = toValue(uid as number)
  if (resultUid && Object.keys(userInfo.value).length === 0) {
    cachedStore.getBatchUserInfo([resultUid])
  }
  return userInfo
}

/**
 * 统一获取用户徽章信息 hook
 * @param itemId 用户徽章ID
 * @description 引入该Hook后，可响应式获取用户徽章信息
 */
export const useBadgeInfo = (itemId?: number | ComputedRef<number | undefined>) => {
  const cachedStore = useCachedStore()
  const badgeInfo = computed(() => (itemId && cachedStore.badgeCachedList[toValue(itemId as number)]) || {})
  // 如果没有就请求
  const resultItemId = toValue(itemId as number)
  if (resultItemId && Object.keys(badgeInfo.value).length === 0) {
    cachedStore.getBatchBadgeInfo([resultItemId])
  }
  return badgeInfo
}
