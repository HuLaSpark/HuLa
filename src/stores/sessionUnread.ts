import { defineStore } from 'pinia'
import { ref } from 'vue'
import { StoresEnum } from '@/enums'
import type { SessionItem } from '@/services/types'

type UnreadCache = Record<string, number>
type CacheStore = Record<string, UnreadCache>
type LastReadActiveTimeCache = Record<string, Record<string, number>>

/**
 * 负责管理「每个账号 -> 会话未读数」的本地缓存
 */
export const useSessionUnreadStore = defineStore(StoresEnum.SESSION_UNREAD, () => {
  // cacheStore 结构为 { [uid]: { [roomId]: unreadCount } }
  const cacheStore = ref<CacheStore>({})
  // lastReadActiveTime 结构为 { [uid]: { [roomId]: activeTime } }
  const lastReadActiveTimeStore = ref<LastReadActiveTimeCache>({})

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

  // 根据 uid 获取对应的已读活跃时间缓存
  const ensureLastReadCache = (uid?: string): Record<string, number> | null => {
    if (!uid) return null
    if (!lastReadActiveTimeStore.value[uid]) {
      lastReadActiveTimeStore.value[uid] = {}
    }
    return lastReadActiveTimeStore.value[uid]
  }

  /**
   * 将缓存中的未读数应用到会话列表，并补齐缺失的缓存
   * @returns 返回需要更新的会话映射 { roomId: newUnreadCount }
   */
  const apply = (uid: string | undefined, sessions: SessionItem[]): Record<string, number> => {
    const updates: Record<string, number> = {}

    if (!uid || sessions.length === 0) {
      return updates
    }
    const cache = ensureUserCache(uid)
    const lastReadCache = ensureLastReadCache(uid)
    if (!cache) {
      return updates
    }

    sessions.forEach((session) => {
      const activeTime = session.activeTime || 0
      const lastReadTime = lastReadCache?.[session.roomId] || 0
      const currentUnread = sanitizeCount(session.unreadCount)
      const cached = cache[session.roomId]
      const cachedCount = typeof cached === 'number' ? sanitizeCount(cached) : undefined

      // 情况1：有lastReadTime记录，且activeTime <= lastReadTime（用户已读过所有消息）
      // 此时服务端返回的未读数可能是脏数据（已读状态同步延迟），应该清零
      if (lastReadTime > 0 && activeTime > 0 && activeTime <= lastReadTime) {
        // 如果服务端返回的未读数不为0，需要生成更新来修正它
        if (currentUnread !== 0) {
          updates[session.roomId] = 0
        }
        // 确保本地缓存也是0
        cache[session.roomId] = 0
        return
      }

      // 情况2：有lastReadTime记录，且activeTime > lastReadTime（有新消息产生）
      // 此时应该信任服务端的未读数，因为本地缓存可能是脏数据
      if (lastReadTime > 0 && activeTime > lastReadTime) {
        // 如果服务端返回的值与本地缓存不一致，需要生成更新
        if (currentUnread !== cache[session.roomId]) {
          updates[session.roomId] = currentUnread
        }
        // 确保本地缓存与服务端一致
        cache[session.roomId] = currentUnread
        return
      }

      // 情况3：如果activeTime为0（可能是旧数据或初始化状态），且有lastReadTime记录，清零
      if (lastReadTime > 0 && activeTime === 0) {
        // 如果服务端返回的未读数不为0，需要生成更新来修正它
        if (currentUnread !== 0) {
          updates[session.roomId] = 0
        }
        // 确保本地缓存也是0
        cache[session.roomId] = 0
        return
      }

      // 情况3：没有lastReadTime记录（首次加载或从未标记已读）
      // 这种情况下，使用 Math.max 作为兜底策略，防止未读数丢失
      const serverCount = sanitizeCount(session.unreadCount)
      if (typeof cached === 'number') {
        const finalCount = Math.max(cachedCount!, serverCount)
        if (session.unreadCount !== finalCount) {
          updates[session.roomId] = finalCount
          cache[session.roomId] = finalCount
        }
      } else {
        const finalCount = serverCount
        if (session.unreadCount !== finalCount) {
          updates[session.roomId] = finalCount
        }
        cache[session.roomId] = finalCount
      }
    })

    return updates
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

  /** 记录某个会话最后一次已读时的活跃时间 */
  const setLastRead = (uid: string | undefined, roomId: string, activeTime: number) => {
    const cache = ensureLastReadCache(uid)
    if (!cache) return
    if (!activeTime) return
    cache[roomId] = Math.max(activeTime, cache[roomId] || 0)
  }

  /** 删除某个会话的未读数缓存，在会话被移除或账号切换时调用 */
  const remove = (uid: string | undefined, roomId: string) => {
    const cache = ensureUserCache(uid)
    const lastReadCache = ensureLastReadCache(uid)
    if (!cache || !(roomId in cache)) {
      return
    }
    delete cache[roomId]
    if (lastReadCache && roomId in lastReadCache) {
      delete lastReadCache[roomId]
    }
    if (Object.keys(cache).length === 0 && uid) {
      delete cacheStore.value[uid]
      delete lastReadActiveTimeStore.value[uid]
    }
  }

  return {
    cacheStore,
    lastReadActiveTimeStore,
    apply,
    set,
    setLastRead,
    remove
  }
})
