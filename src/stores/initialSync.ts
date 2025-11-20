import { ref } from 'vue'
import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useInitialSyncStore = defineStore(StoresEnum.INITIAL_SYNC, () => {
  const syncedUsers = ref<string[]>([])

  /** 判断指定 uid 是否已经完成过初始化同步*/
  const isSynced = (uid: string) => {
    if (!uid) {
      return false
    }
    return syncedUsers.value.includes(uid)
  }

  /** 标记指定 uid 已完成初始化同步 */
  const markSynced = (uid: string) => {
    if (!uid) {
      return
    }
    if (!syncedUsers.value.includes(uid)) {
      syncedUsers.value = [...syncedUsers.value, uid]
    }
  }

  return {
    syncedUsers,
    isSynced,
    markSynced
  }
})
