import type { ComputedRef, Ref } from 'vue'
import { useCachedStore } from '@/stores/cached'

/**
 * 统一获取用户信息 hook
 * @param uid 用户 ID
 * @description 引入该Hook后，可响应式获取用户信息
 */
export const useUserInfo = (uid?: string | ComputedRef<string | undefined> | Ref<string>) => {
  const cachedStore = useCachedStore()
  const userInfo = computed(() => (uid && cachedStore.userCachedList[toValue(uid as string)]) || {})
  // 如果没有就请求
  const resultUid = toValue(uid as string)
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
export const useBadgeInfo = (itemId?: string | ComputedRef<string | undefined>) => {
  const cachedStore = useCachedStore()
  const badgeInfo = computed(() => (itemId && cachedStore.badgeCachedList[toValue(itemId as string)]) || {})
  // 如果没有就请求
  const resultItemId = toValue(itemId as string)
  if (resultItemId && Object.keys(badgeInfo.value).length === 0) {
    cachedStore.getBatchBadgeInfo([resultItemId])
  }
  return badgeInfo
}
