<template>
  <transition name="rtc-call-float" mode="out-in">
    <div v-if="isVisible" class="fixed inset-x-16px z-9999 pointer-events-none" :style="{ top: topOffset }">
      <div class="mx-auto pointer-events-auto" :style="{ maxWidth: '360px' }">
        <div class="rtc-call-card flex items-center gap-12px">
          <div class="size-48px shrink-0 overflow-hidden rounded-14px avatar-shell">
            <img :src="avatarUrl" alt="incoming-call-avatar" class="size-full object-cover" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="text-15px font-semibold text-white truncate">{{ displayName }}</div>
            <div class="mt-4px text-12px text-#FFFFFFB3 truncate">{{ callMessage }}</div>
          </div>

          <div class="flex items-center gap-18px">
            <div class="rtc-action-button reject" @click="handleReject">
              <svg class="size-20px color-#fff">
                <use href="#PhoneHangup"></use>
              </svg>
            </div>

            <div class="rtc-action-button accept" @click="handleAccept">
              <svg class="size-20px color-#fff">
                <use href="#phone-telephone-entity"></use>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { CallTypeEnum, MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import { useMobileStore } from '@/stores/mobile'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import rustWebSocketClient from '@/services/webSocketRust'
import { CallResponseStatus, WsRequestMsgType, WsResponseMessageType } from '@/services/wsType'

type CallPayload = {
  callerUid?: string
  callerId?: string
  senderId?: string
  targetUid?: string
  targetIds?: string[]
  roomId?: string
  isVideo?: boolean
  video?: boolean
  name?: string
  callerName?: string
  avatar?: string
}

const router = useRouter()
const mobileStore = useMobileStore()
const groupStore = useGroupStore()
const userStore = useUserStore()

const currentCall = ref<{
  callerUid: string
  roomId: string
  callType: CallTypeEnum
  displayName: string
  avatar: string
} | null>(null)

const topOffset = computed(() => {
  const safeTop = mobileStore.safeArea.top
  const base = safeTop > 0 ? safeTop + 16 : 16
  return `${base}px`
})

const isVisible = computed(() => currentCall.value !== null)

const avatarUrl = computed(() => currentCall.value?.avatar ?? AvatarUtils.getAvatarUrl(''))

const displayName = computed(() => currentCall.value?.displayName || '未知用户')

const callMessage = computed(() => {
  if (!currentCall.value) return ''
  return currentCall.value.callType === CallTypeEnum.VIDEO ? '邀请你视频通话...' : '邀请你语音通话...'
})

const toAvatarUrl = (raw?: unknown) => {
  if (typeof raw === 'string') return AvatarUtils.getAvatarUrl(raw)
  if (raw === undefined || raw === null) return AvatarUtils.getAvatarUrl('')
  return AvatarUtils.getAvatarUrl(String(raw))
}

const clearCall = () => {
  currentCall.value = null
}

const matchCurrentRoom = (payload: { roomId?: string }) => {
  if (!currentCall.value) return false
  if (!payload?.roomId) return true
  return payload.roomId === currentCall.value.roomId
}

const extractTargetIds = (payload: CallPayload) => {
  if (Array.isArray(payload.targetIds)) {
    return payload.targetIds.filter((id): id is string => typeof id === 'string')
  }
  if (typeof payload.targetUid === 'string') {
    return [payload.targetUid]
  }
  return []
}

const handleCallRequest = (payload: CallPayload) => {
  const myUid = userStore.userInfo?.uid
  if (!myUid) return

  const targets = extractTargetIds(payload)
  if (targets.length > 0 && !targets.includes(myUid)) {
    return
  }

  const callerUid = payload.callerUid || payload.callerId || payload.senderId
  const roomId = payload.roomId
  if (!callerUid || !roomId) return

  const callType = payload.isVideo || payload.video ? CallTypeEnum.VIDEO : CallTypeEnum.AUDIO
  const remoteUserInfo = groupStore.getUserInfo(callerUid, roomId)
  const displayNameCandidate =
    remoteUserInfo?.myName || remoteUserInfo?.name || payload.callerName || payload.name || '未知用户'
  const avatarCandidate = remoteUserInfo?.avatar ?? payload.avatar

  currentCall.value = {
    callerUid,
    roomId,
    callType,
    displayName: displayNameCandidate,
    avatar: toAvatarUrl(avatarCandidate)
  }
}

const handleCallEnd = (payload: { roomId?: string }) => {
  if (!currentCall.value) return
  if (!matchCurrentRoom(payload)) return
  clearCall()
}

const handleReject = async () => {
  const call = currentCall.value
  if (!call) return

  try {
    await rustWebSocketClient.sendMessage({
      type: WsRequestMsgType.VIDEO_CALL_RESPONSE,
      data: {
        callerUid: call.callerUid,
        roomId: call.roomId,
        accepted: CallResponseStatus.REJECTED
      }
    })
  } catch (error) {
    console.error('发送拒绝响应失败:', error)
  } finally {
    clearCall()
  }
}

const handleAccept = async () => {
  const call = currentCall.value
  if (!call) return

  const query = {
    remoteUserId: call.callerUid,
    roomId: call.roomId,
    callType: String(call.callType),
    isIncoming: 'true',
    autoAccept: '1'
  } as const

  try {
    await router.push({ path: '/mobile/rtcCall', query })
  } catch (error) {
    console.error('跳转通话页面失败:', error)
  } finally {
    clearCall()
  }
}

useMitt.on(MittEnum.MOBILE_RTC_CALL_REQUEST, handleCallRequest)
useMitt.on(WsResponseMessageType.CANCEL, handleCallEnd)
useMitt.on(WsResponseMessageType.DROPPED, handleCallEnd)
useMitt.on(WsResponseMessageType.TIMEOUT, handleCallEnd)
useMitt.on(WsResponseMessageType.CallRejected, handleCallEnd)
useMitt.on(WsResponseMessageType.CallAccepted, handleCallEnd)
useMitt.on(WsResponseMessageType.RoomClosed, handleCallEnd)
</script>

<style scoped lang="scss">
.rtc-call-card {
  background: linear-gradient(135deg, rgba(34, 34, 38, 0.95), rgba(18, 18, 22, 0.92));
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 12px 16px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.34);
}

.avatar-shell {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(14px);
}

.rtc-action-button {
  @apply size-44px flex-center rounded-full transition-transform duration-150 ease-out active:scale-95;

  svg {
    @apply pointer-events-none;
  }

  &.reject {
    background: rgba(213, 48, 79, 0.68);
    box-shadow: 0 12px 26px rgba(213, 48, 79, 0.3);
  }

  &.accept {
    background: rgba(19, 152, 127, 0.68);
    box-shadow: 0 12px 26px rgba(19, 152, 127, 0.3);
  }
}

.rtc-call-float-enter-active,
.rtc-call-float-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.rtc-call-float-enter-from,
.rtc-call-float-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
