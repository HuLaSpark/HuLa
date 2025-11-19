import { defineStore } from 'pinia'
import { ref } from 'vue'
import { StoresEnum } from '@/enums'
import type { SessionItem } from '@/services/types'

type UnreadCache = Record<string, number>
type CacheStore = Record<string, UnreadCache>

/**
 * 负责管理「每个账号 -> 会话未读数」的本地缓存
 */
export const useSessionUnreadStore = defineStore(StoresEnum.SESSION_UNREAD, () => {
  // cacheStore 结构为 { [uid]: { [roomId]: unreadCount } }
  const cacheStore = ref<CacheStore>({})

  // 对传入的未读数做兜底处理，避免出现负数或 NaN
  const sanitizeCount = (count?: number) => {
    if (typeof count !== 'number' || Number.isNaN(count)) {
      return 0
    }
    return Math.max(0, Math.floor(count))
  }

  // 根据 uid 获取对应的会话未读缓存，没有则初始化一个空对象
  const ensureUserCache = (uid?: string): UnreadCache | null => {
    if (!uid) {
      return null
    }
    if (!cacheStore.value[uid]) {
      cacheStore.value[uid] = {}
    }
    return cacheStore.value[uid]
  }

  /** 将缓存中的未读数应用到会话列表，并补齐缺失的缓存 */
  const apply = (uid: string | undefined, sessions: SessionItem[]) => {
    if (!uid || sessions.length === 0) {
      return
    }
    const cache = ensureUserCache(uid)
    if (!cache) {
      return
    }

    sessions.forEach((session) => {
      const cached = cache[session.roomId]
      if (typeof cached === 'number') {
        if (session.unreadCount !== cached) {
          session.unreadCount = cached
        }
      } else {
        cache[session.roomId] = sanitizeCount(session.unreadCount)
      }
    })
  }

  /** 更新单个会话的未读数，并同步写入缓存映射 */
  const set = (uid: string | undefined, roomId: string, count: number) => {
    const cache = ensureUserCache(uid)
    if (!cache) {
      return
    }

    const normalized = sanitizeCount(count)
    if (cache[roomId] === normalized) {
      return
    }
    cache[roomId] = normalized
  }

  /** 删除某个会话的未读数缓存，在会话被移除或账号切换时调用 */
  const remove = (uid: string | undefined, roomId: string) => {
    const cache = ensureUserCache(uid)
    if (!cache || !(roomId in cache)) {
      return
    }
    delete cache[roomId]
    if (Object.keys(cache).length === 0 && uid) {
      delete cacheStore.value[uid]
    }
  }

  return {
    cacheStore,
    apply,
    set,
    remove
  }
})
