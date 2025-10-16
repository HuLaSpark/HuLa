import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user.ts'
import { updateMyRoomInfo } from '@/utils/ImRequestUtils'

type UpdatePayload = {
  roomId: string
  myName: string
  remark: string
}

// 记录已经同步过成员列表的房间ID，避免在同一次会话中重复触发同步
const syncedRoomMembers = new Set<string>()

export const useMyRoomInfoUpdater = () => {
  const cacheStore = useCachedStore()
  const chatStore = useChatStore()
  const groupStore = useGroupStore()
  const userStore = useUserStore()

  const persistMyRoomInfo = async ({ roomId, myName, remark }: UpdatePayload) => {
    const payload = {
      id: roomId,
      myName,
      remark
    }

    // 第一次编辑某个房间的昵称/备注时，先尝试同步一次成员列表，保证本地存在对应记录
    if (!syncedRoomMembers.has(roomId)) {
      const synced = await cacheStore.syncRoomMembersToLocal(roomId)
      if (synced) {
        syncedRoomMembers.add(roomId)
      }
    }

    let updated = await cacheStore.updateMyRoomInfo(payload)
    if (!updated) {
      // 如果仍然失败，说明本地缓存可能过期，清除标记并再次强制同步后重试
      syncedRoomMembers.delete(roomId)
      const synced = await cacheStore.syncRoomMembersToLocal(roomId)
      if (synced) {
        syncedRoomMembers.add(roomId)
        updated = await cacheStore.updateMyRoomInfo(payload)
      }
    }
    await updateMyRoomInfo(payload)

    groupStore.myNameInCurrentGroup = myName
    if (groupStore.countInfo) {
      groupStore.countInfo.remark = remark
    }
    chatStore.updateSession(roomId, { remark })
  }

  const resolveMyRoomNickname = ({ roomId, myName }: { roomId?: string; myName?: string }) => {
    if (myName) {
      return myName
    }
    if (!roomId) {
      return ''
    }
    const currentUid = userStore.userInfo?.uid
    if (!currentUid) {
      return ''
    }
    const currentUser = groupStore.getUser(roomId, currentUid) ?? groupStore.getUserInfo(currentUid, roomId)
    return currentUser?.name || userStore.userInfo?.name || ''
  }

  return {
    persistMyRoomInfo,
    resolveMyRoomNickname
  }
}
