<template>
  <!-- 顶部操作栏和显示用户名 -->
  <main
    v-if="activeItem"
    data-tauri-drag-region
    class="z-999 flex-y-center flex-shrink-0 border-b-(1px solid [--right-chat-footer-line-color]) select-none cursor-default justify-between p-[6px_22px_10px]">
    <Transition name="loading" mode="out-in">
      <n-flex align="center">
        <n-avatar
          :class="[
            'rounded-8px select-none',
            { grayscale: activeItem?.type === RoomTypeEnum.SINGLE && !isOnline && !isBotUser }
          ]"
          :size="28"
          :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
          :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
          :src="currentUserAvatar" />
        <label class="flex-y-center gap-6px">
          <p class="text-(16px [--text-color])">{{ groupStore.countInfo?.remark || activeItem?.name }}</p>
          <p
            v-if="activeItem?.type === RoomTypeEnum.GROUP && groupStore.countInfo?.memberNum"
            class="text-(11px #808080)">
            [{{ groupStore.countInfo?.memberNum }}]
          </p>
          <!-- bot用户标签 -->
          <div
            v-if="isBotUser"
            class="dark:bg-[#13987f40] bg-[#e8f4f1] dark:border-(1px solid #13987f) border-(1px solid #13987f) flex-center px-8px py-4px rounded-6px">
            <p class="text-(11px #13987f)">{{ t('home.chat_header.bot_tag') }}</p>
          </div>
        </label>
        <svg v-if="activeItem?.hotFlag === IsAllUserEnum.Yes" class="size-20px color-#13987f select-none outline-none">
          <use href="#auth"></use>
        </svg>
        <n-flex v-else-if="activeItem?.type === RoomTypeEnum.SINGLE && !isBotUser" align="center">
          <template v-if="shouldShowDeleteFriend">
            <n-flex align="center" :size="6">
              <!-- 状态图标 -->
              <img v-if="hasCustomState && statusIcon" :src="statusIcon" class="size-18px rounded-50%" alt="" />
              <n-badge v-else :color="isOnline ? '#1ab292' : '#909090'" dot />

              <!-- 状态文本 -->
              <p class="text-(12px [--text-color])">
                {{ statusTitle }}
              </p>
            </n-flex>
          </template>

          <template v-else>
            <n-flex align="center" :size="4">
              <svg class="size-16px color-#d03553">
                <use href="#close"></use>
              </svg>
              <p class="text-(12px [--text-color])">{{ t('home.chat_header.status_abnormal') }}</p>
            </n-flex>
          </template>
        </n-flex>
      </n-flex>
    </Transition>
    <!-- 顶部右边选项栏 -->
    <nav v-if="shouldShowDeleteFriend || chatStore.isGroup" class="options flex-y-center gap-20px color-[--icon-color]">
      <div v-if="!isChannel && !isBotUser" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="startRtcCall(CallTypeEnum.AUDIO)">
              <use href="#phone-telephone"></use>
            </svg>
          </template>
          <span>{{ t('home.chat_header.toolbar.audio_call') }}</span>
        </n-popover>
      </div>

      <div v-if="!isChannel && !isBotUser" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="startRtcCall(CallTypeEnum.VIDEO)">
              <use href="#video-one"></use>
            </svg>
          </template>
          <span>{{ t('home.chat_header.toolbar.video_call') }}</span>
        </n-popover>
      </div>

      <div v-if="!isChannel && !isBotUser" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleMedia">
              <use href="#screen-sharing"></use>
            </svg>
          </template>
          <span>{{ t('home.chat_header.toolbar.screen_share') }}</span>
        </n-popover>
      </div>

      <div v-if="!isChannel && !isBotUser" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleAssist">
              <use href="#remote-control"></use>
            </svg>
          </template>
          <span>{{ t('home.chat_header.toolbar.remote_assist') }}</span>
        </n-popover>
      </div>

      <div
        v-if="!isChannel && !isBotUser && currentSessionRoomId !== '1'"
        class="options-box"
        @click="handleCreateGroupOrInvite">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg>
              <use href="#launch"></use>
            </svg>
          </template>
          <span v-if="activeItem?.type === RoomTypeEnum.GROUP">
            {{ t('home.chat_header.toolbar.invite_to_group') }}
          </span>
          <span v-else>{{ t('home.chat_header.toolbar.start_group_chat') }}</span>
        </n-popover>
      </div>

      <div class="options-box" @click="sidebarShow = !sidebarShow">
        <svg>
          <use href="#more"></use>
        </svg>
      </div>
    </nav>

    <ChatInnerDrawer v-model:show="sidebarShow" v-if="shouldShowDeleteFriend || chatStore.isGroup">
      <SingleChatSidebar
        v-if="!chatStore.isGroup"
        :active-item="activeItem"
        :is-bot-user="isBotUser"
        @top="handleTop"
        @notification="handleNotification"
        @shield="handleShield"
        @delete="handleDelete" />

      <GroupChatSidebar
        v-else
        :active-item="activeItem"
        :user-list="userList"
        :is-group-owner="isGroupOwner"
        :is-editing-group-name="isEditingGroupName"
        v-model:editing-group-name="editingGroupName"
        v-model:local-my-name="localMyName"
        v-model:local-remark="localRemark"
        :current-session-room-id="currentSessionRoomId"
        v-model:message-setting-type="messageSettingType"
        :message-setting-options="messageSettingOptions"
        @top="handleTop"
        @notification="handleNotification"
        @shield="handleShield"
        @delete="handleDelete"
        @copy="handleCopy"
        @upload-avatar="handleUploadAvatar"
        @group-name-change="handleGroupNameChange"
        @start-edit-group-name="startEditGroupName"
        @group-info-change="handleGroupInfoChange"
        @manage-group-member="handleManageGroupMember"
        @show-qr-code="showQRCodeModal = true"
        @update-room-info="updateRoomInfo" />
    </ChatInnerDrawer>
  </main>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px rounded-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="isWindows()" @click="modalShow = false" class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px">{{ tips }}</span>

        <n-flex justify="end">
          <n-button @click="handleConfirm" class="w-78px" color="#13987f">
            {{ t('home.chat_header.modal.confirm') }}
          </n-button>
          <n-button @click="handleCancel" class="w-78px" secondary>{{ t('home.chat_header.modal.cancel') }}</n-button>
        </n-flex>
      </div>
    </div>
  </n-modal>

  <!-- 群二维码分享弹窗 -->
  <n-modal v-model:show="showQRCodeModal" class="w-400px rounded-8px">
    <div class="bg-[--bg-popover] w-400px p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="showQRCodeModal = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="isWindows()" @click="showQRCodeModal = false" class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>

      <div class="flex flex-col gap-20px p-[22px_20px_20px_22px] select-none">
        <div class="flex justify-center">
          <div class="w-full max-w-250px flex flex-col gap-20px">
            <div class="flex items-center gap-10px">
              <n-avatar
                round
                :size="44"
                :src="AvatarUtils.getAvatarUrl(activeItem?.avatar || '')"
                class="flex-shrink-0" />
              <div class="flex flex-col overflow-hidden gap-6px w-full cursor-default">
                <p class="text-(18px [--text-color]) font-bold truncate">
                  {{ groupStore.countInfo?.remark || activeItem?.name }}
                </p>
                <span class="flex items-center text-(13px [--chat-text-color]) truncate">
                  {{ t('home.chat_header.qr.group_id_label') }}{{ activeItem?.account || currentSessionRoomId || '--' }}
                  <n-tooltip v-if="activeItem?.account" trigger="hover">
                    <template #trigger>
                      <svg
                        class="size-14px cursor-pointer color-[--icon-color] hover:color-#13987f transition-colors inline-block ml-6px"
                        @click="handleCopy">
                        <use href="#copy"></use>
                      </svg>
                    </template>
                    <span>{{ t('home.chat_header.sidebar.group.copy') }}</span>
                  </n-tooltip>
                </span>
              </div>
            </div>

            <div ref="qrCodeWrapperRef" class="rounded-24px flex flex-col items-center gap-12px">
              <n-qr-code
                style="border-radius: 16px"
                :value="groupQrValue"
                :size="220"
                type="canvas"
                :color="themes.content === ThemeEnum.DARK ? '#202020' : '#000000'"
                :background-color="themes.content === ThemeEnum.DARK ? '#e3e3e3' : '#e3e3e382'"
                :icon-src="AvatarUtils.getAvatarUrl(activeItem?.avatar || '')" />
              <p class="text-(12px [--chat-text-color])">{{ t('home.chat_header.qr.tip') }}</p>
            </div>
          </div>
        </div>

        <div ref="qrCodeExportWrapperRef" class="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
          <n-qr-code
            :value="groupQrValue"
            :size="200"
            type="canvas"
            :color="themes.content === ThemeEnum.DARK ? '#202020' : '#000000'"
            :background-color="themes.content === ThemeEnum.DARK ? '#e3e3e3' : '#e3e3e382'"
            :icon-src="qrExportIconSrc || undefined" />
        </div>

        <div class="flex items-center justify-between gap-12px border-t-(1px solid [--line-color]) pt-12px">
          <div class="QRcode-item" @click="handleForwardGroupQr">
            <svg class="size-20px"><use href="#share-three"></use></svg>
            <span>{{ t('home.chat_header.qr.actions.forward') }}</span>
          </div>
          <div class="QRcode-item" @click="handleCopyGroupId">
            <svg class="size-20px"><use href="#copy"></use></svg>
            <span>{{ t('home.chat_header.qr.actions.copy_group_id') }}</span>
          </div>
          <div class="QRcode-item" @click="handleSaveGroupQrImage">
            <svg class="size-20px"><use href="#Importing"></use></svg>
            <span>{{ t('home.chat_header.qr.actions.save_image') }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-modal>

  <!-- 管理群成员弹窗 -->
  <n-modal v-model:show="showManageGroupMemberModal" class="w-600px rounded-8px" :mask-closable="false">
    <div class="bg-[--bg-popover] w-600px p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="showManageGroupMemberModal = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg
        v-if="isWindows()"
        @click="showManageGroupMemberModal = false"
        class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>

      <div class="flex flex-col h-600px">
        <ManageGroupMember @close="showManageGroupMemberModal = false" />
      </div>
    </div>
  </n-modal>

  <!-- 添加裁剪组件和文件输入框 -->
  <input
    ref="fileInput"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    class="hidden"
    @change="handleFileChange" />
  <AvatarCropper ref="cropperRef" v-model:show="showCropper" :image-url="localImageUrl" @crop="handleCrop" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { fetch as nativeFetch } from '@tauri-apps/plugin-http'
import { ErrorType } from '@/common/exception'
import { useDisplayMedia } from '@vueuse/core'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import ManageGroupMember from '@/views/ManageGroupMember.vue'
import {
  CallTypeEnum,
  MergeMessageType,
  MessageStatusEnum,
  MittEnum,
  NotificationTypeEnum,
  RoleEnum,
  RoomActEnum,
  RoomTypeEnum,
  ThemeEnum,
  TauriCommand,
  UserType,
  MsgEnum
} from '@/enums'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useMyRoomInfoUpdater } from '@/hooks/useMyRoomInfoUpdater'
import { useMitt } from '@/hooks/useMitt.ts'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useWindow } from '@/hooks/useWindow'
import { IsAllUserEnum, type UserItem, type MessageType } from '@/services/types.ts'
import { WsResponseMessageType } from '@/services/wsType'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group.ts'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { notification, setSessionTop, shield, updateRoomInfo } from '@/utils/ImRequestUtils'
import { canvasToImageBytes } from '@/utils/Canvas2Dom'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import ChatInnerDrawer from '../../chat-inner-drawer.vue'
import SingleChatSidebar from './SingleChatSidebar.vue'
import GroupChatSidebar from './GroupChatSidebar.vue'

// 转发群二维码尺寸
const QR_IMAGE_SIZE = 200
const QR_CARD_EXPORT_WIDTH = 360
const QR_CARD_EXPORT_HEIGHT = 460
const QR_CARD_RADIUS = 36

const { t } = useI18n()
const { createModalWindow, startRtcCall } = useWindow()
// 使用useDisplayMedia获取屏幕共享的媒体流
const { stream, stop } = useDisplayMedia()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const contactStore = useContactStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
/** 提醒框标题 */
const tips = ref()
const optionsType = ref<RoomActEnum>()
const modalShow = ref(false)
const sidebarShow = ref(false)
const showQRCodeModal = ref(false)
const showManageGroupMemberModal = ref(false)
const qrCodeWrapperRef = ref<HTMLElement | null>(null)
const qrCodeExportWrapperRef = ref<HTMLElement | null>(null)
const qrExportIconSrc = ref<string | null>(null)
const qrExportIconKey = ref<string>('')
const { currentSession: activeItem, currentSessionRoomId } = storeToRefs(globalStore)
const { persistMyRoomInfo, resolveMyRoomNickname } = useMyRoomInfoUpdater()

const groupQrValue = computed(() => {
  if (!currentSessionRoomId.value) return ''
  return JSON.stringify({ type: 'scanEnterGroup', roomId: currentSessionRoomId.value })
})

const isTauriContext = () =>
  Boolean((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI_INVOKE__)

const convertHttpDataToArrayBuffer = (data: unknown): ArrayBuffer => {
  if (data === null || data === undefined) {
    throw new Error('无法解析图片数据')
  }

  if (data instanceof ArrayBuffer) {
    return data
  }

  if (data instanceof Uint8Array) {
    return data.slice().buffer
  }

  if (Array.isArray(data)) {
    return Uint8Array.from(data).buffer
  }

  if (typeof data === 'object') {
    const maybeData = (data as { data?: number[] }).data
    if (Array.isArray(maybeData)) {
      return Uint8Array.from(maybeData).buffer
    }
  }

  if (typeof data === 'string') {
    const binaryString = atob(data)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  throw new Error('无法解析图片数据')
}

const revokeQrExportIcon = () => {
  if (qrExportIconSrc.value?.startsWith('blob:')) {
    URL.revokeObjectURL(qrExportIconSrc.value)
  }
  qrExportIconSrc.value = null
}

const resolveQrExportIcon = async () => {
  const avatar = activeItem.value?.avatar || ''
  if (!avatar) {
    revokeQrExportIcon()
    qrExportIconKey.value = ''
    return
  }

  const avatarUrl = AvatarUtils.getAvatarUrl(avatar)
  if (!avatarUrl || avatarUrl === qrExportIconKey.value) return
  qrExportIconKey.value = avatarUrl
  revokeQrExportIcon()

  if (!isTauriContext() || !/^https?:\/\//i.test(avatarUrl)) {
    qrExportIconSrc.value = avatarUrl
    return
  }

  try {
    const response = await nativeFetch(avatarUrl, { method: 'GET' })
    const anyResponse = response as any
    const status = typeof anyResponse.status === 'number' ? anyResponse.status : 200
    const statusText = typeof anyResponse.statusText === 'string' ? anyResponse.statusText : ''
    const ok = 'ok' in anyResponse ? Boolean(anyResponse.ok) : status >= 200 && status < 400
    if (!ok) {
      throw new Error(`下载失败: ${status} ${statusText}`.trim())
    }

    let buffer: ArrayBuffer | null = null
    if (typeof anyResponse.arrayBuffer === 'function') {
      const resBuffer = await anyResponse.arrayBuffer()
      if (resBuffer instanceof ArrayBuffer) {
        buffer = resBuffer
      }
    }
    if (!buffer && typeof anyResponse.bytes === 'function') {
      const bytes = await anyResponse.bytes()
      buffer = convertHttpDataToArrayBuffer(bytes)
    }
    if (!buffer && 'data' in anyResponse) {
      buffer = convertHttpDataToArrayBuffer(anyResponse.data)
    }
    if (!buffer) {
      throw new Error('无法解析图片数据')
    }

    const contentType =
      typeof anyResponse.headers?.get === 'function' ? anyResponse.headers.get('content-type') : 'image/png'
    const blob = new Blob([buffer], { type: contentType || 'image/png' })
    qrExportIconSrc.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('获取二维码头像失败:', error)
    qrExportIconSrc.value = null
  }
}

// 是否为频道（仅显示 more 按钮）
const isChannel = computed(() => activeItem.value?.hotFlag === IsAllUserEnum.Yes || currentSessionRoomId.value === '1')
// 是否为bot用户
const isBotUser = computed(() => activeItem.value?.account === UserType.BOT)
// 是否为群主
const isGroupOwner = computed(() => {
  const session = activeItem.value
  if (!session || currentSessionRoomId.value === '1' || session.hotFlag === IsAllUserEnum.Yes) {
    return false
  }

  // 检查groupStore.userList中当前用户的角色
  const currentUser = groupStore.userList.find((user) => user.uid === userStore.userInfo!.uid)
  return currentUser!.roleId === RoleEnum.LORD
})

// 是否正在编辑群名称
const isEditingGroupName = ref(false)
// 编辑中的群名称
const editingGroupName = ref('')
// 待保存的群信息
const pendingGroupInfo = ref<{
  groupName?: string
  myName?: string
  remark?: string
} | null>(null)
// 本地暂存的群昵称和群备注（避免实时修改store）
const localMyName = ref('')
const localRemark = ref('')

// 初始化本地变量
const initLocalValues = () => {
  localMyName.value = resolveMyRoomNickname({
    roomId: currentSessionRoomId.value,
    myName: groupStore.myNameInCurrentGroup || ''
  })
  localRemark.value = groupStore.countInfo?.remark || ''
}

watch(
  () => groupStore.myNameInCurrentGroup,
  (newName) => {
    const normalized = resolveMyRoomNickname({
      roomId: currentSessionRoomId.value,
      myName: newName || ''
    })
    if (localMyName.value !== normalized) {
      localMyName.value = normalized
    }
  }
)
// 监听当前会话变化，重新初始化本地变量
watch(
  () => currentSessionRoomId.value,
  () => {
    if (currentSessionRoomId.value) {
      nextTick(() => {
        initLocalValues()
      })
    }
  }
)

const messageSettingType = computed({
  get() {
    if (activeItem.value?.muteNotification === NotificationTypeEnum.NOT_DISTURB) {
      return activeItem.value?.shield ? 'shield' : 'notification'
    }
    return 'notification'
  },
  set(value: string) {
    const session = activeItem.value
    if (!session) return
    if (value === 'shield' && !session.shield) {
      handleShield(true)
    } else if (value === 'notification' && session.shield) {
      handleShield(false)
    }
  }
})
const messageSettingOptions = computed(() => [
  { label: t('home.chat_header.message_setting.receive_no_alert'), value: 'notification' },
  { label: t('home.chat_header.message_setting.shield'), value: 'shield' }
])

const chatTargetUid = computed(() => {
  const session = activeItem.value
  if (!session || session.type === RoomTypeEnum.GROUP) return undefined
  return session.detailId
})
const { isOnline, statusIcon, statusTitle, hasCustomState } = useOnlineStatus(chatTargetUid)

/** 是否还是好友 */
const shouldShowDeleteFriend = computed(() => {
  const session = activeItem.value
  if (!session || session.type === RoomTypeEnum.GROUP) return false
  return contactStore.contactsList.some((item) => item.uid === session.detailId)
})
const groupUserList = computed(() => groupStore.userList)
const userList = computed(() => {
  return groupUserList.value
    .map((item: UserItem) => {
      const { uid, ...userInfo } = item // 排除uid，获取剩余内容
      return {
        ...userInfo,
        ...groupStore.getUserInfo(item.uid)!,
        uid
      }
    })
    .sort((a, b) => {
      // 将uid转换为数字进行比较
      return Number(a.uid) - Number(b.uid)
    })
    .slice(0, 10)
})

// 获取用户的最新头像
const currentUserAvatar = computed(() => {
  const session = activeItem.value
  if (!session) return ''
  if (session.type === RoomTypeEnum.GROUP) {
    return AvatarUtils.getAvatarUrl(session.avatar)
  }
  if (session.detailId) {
    const detailUser = groupStore.getUserInfo(session.detailId)
    return AvatarUtils.getAvatarUrl(detailUser?.avatar || session.avatar)
  }
  return AvatarUtils.getAvatarUrl(session.avatar)
})
// 使用自定义hook处理头像上传
const {
  localImageUrl,
  showCropper,
  openFileSelector,
  handleFileChange,
  handleCrop: onCrop
} = useAvatarUpload({
  onSuccess: async (downloadUrl) => {
    const session = activeItem.value
    if (!session) return
    await updateRoomInfo({
      id: currentSessionRoomId.value,
      avatar: downloadUrl
    })
  }
})

watchEffect(() => {
  stream.value?.getVideoTracks()[0]?.addEventListener('ended', () => {
    stop()
  })
})

watch(showQRCodeModal, (visible) => {
  if (visible) {
    void resolveQrExportIcon()
  } else {
    revokeQrExportIcon()
  }
})

watch(
  () => activeItem.value?.avatar,
  () => {
    if (showQRCodeModal.value) {
      void resolveQrExportIcon()
    }
  }
)

// 处理复制账号
const handleCopy = () => {
  const session = activeItem.value
  if (!session?.account) return
  navigator.clipboard.writeText(session.account)
  window.$message.success(t('home.chat_header.toast.copy_success', { account: session.account }))
}

const getGroupQrCanvas = () => {
  const wrapper = qrCodeExportWrapperRef.value || qrCodeWrapperRef.value
  if (!wrapper) return null
  const canvas = wrapper.querySelector('canvas')
  return canvas instanceof HTMLCanvasElement ? canvas : null
}

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

const loadImageSafely = (src?: string | null): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    const image = new Image()
    if (/^https?:/i.test(src)) {
      image.crossOrigin = 'anonymous'
    }
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

const truncateCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

const buildGroupQrShareCanvas = async (): Promise<HTMLCanvasElement | null> => {
  const baseCanvas = getGroupQrCanvas()
  if (!baseCanvas) return null
  const canvas = document.createElement('canvas')
  canvas.width = QR_CARD_EXPORT_WIDTH
  canvas.height = QR_CARD_EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  drawRoundedRectPath(ctx, 0, 0, canvas.width, canvas.height, QR_CARD_RADIUS)
  ctx.clip()
  ctx.fillStyle = '#f6f7fb'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const horizontalPadding = 42
  const avatarSize = 44
  const avatarX = horizontalPadding
  const contentAnchorY = 52
  const avatarY = contentAnchorY + 8

  // 头像
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  const avatarSrc = qrExportIconSrc.value || AvatarUtils.getAvatarUrl(activeItem.value?.avatar || '') || undefined
  const avatarImg = await loadImageSafely(avatarSrc)
  if (avatarImg) {
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize)
  } else {
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 20px "PingFang SC", system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const initial = (activeItem.value?.name || 'H').slice(0, 1).toUpperCase()
    ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2)
  }
  ctx.restore()

  // 文本信息
  const textX = avatarX + avatarSize + 16
  const maxTextWidth = canvas.width - textX - horizontalPadding
  const groupName = groupStore.countInfo?.remark || activeItem.value?.name || ''
  const groupId = activeItem.value?.account || currentSessionRoomId.value || ''
  ctx.fillStyle = '#0f172a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 20px "PingFang SC", system-ui'
  const title = truncateCanvasText(ctx, groupName, maxTextWidth)
  ctx.fillText(title, textX, avatarY + 24)

  ctx.fillStyle = '#6b7280'
  ctx.font = '14px "PingFang SC", system-ui'
  const groupLabel = truncateCanvasText(ctx, `群号：${groupId}`, maxTextWidth)
  ctx.fillText(groupLabel, textX, avatarY + 42)

  // 绘制二维码
  const qrSize = 248
  const qrX = (canvas.width - qrSize) / 2
  const qrY = contentAnchorY + avatarSize + 28
  ctx.drawImage(baseCanvas, qrX, qrY, qrSize, qrSize)

  // 提示文字
  ctx.fillStyle = '#4b5563'
  ctx.font = '15px "PingFang SC", system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(t('home.chat_header.qr.tip'), QR_CARD_EXPORT_WIDTH / 2, qrY + qrSize + 34)

  ctx.restore()
  return canvas
}

const getGroupQrImageBytes = async (): Promise<{ bytes: Uint8Array; width: number; height: number } | null> => {
  await nextTick()
  const shareCanvas = await buildGroupQrShareCanvas()
  if (!shareCanvas) return null
  return await canvasToImageBytes(shareCanvas, {
    type: 'image/webp'
  })
}

const normalizeSavePath = (path: string) => path.replace(/\\/g, '/')

const handleForwardGroupQr = async () => {
  if (!groupQrValue.value) return
  try {
    const qrResult = await getGroupQrImageBytes()
    if (!qrResult || !qrResult.bytes?.length) {
      return
    }
    const { bytes, width, height } = qrResult

    const canvas = getGroupQrCanvas()
    const previewWidth = width || canvas?.width || QR_IMAGE_SIZE
    const previewHeight = height || canvas?.height || QR_IMAGE_SIZE
    const size = bytes.byteLength
    const mimeType = 'image/webp'
    const arrayBuffer = bytes.slice().buffer
    const blob = new Blob([arrayBuffer], { type: mimeType })
    const previewUrl = URL.createObjectURL(blob)
    const roomId = currentSessionRoomId.value

    if (!roomId) {
      URL.revokeObjectURL(previewUrl)
      return
    }

    const tempMsgId = `QR_${roomId}_${Date.now()}`
    const selfInfo = groupStore.getUserInfo(userStore.userInfo!.uid)
    const fromUser = {
      uid: userStore.userInfo!.uid,
      username: selfInfo?.name || userStore.userInfo!.name || '',
      avatar: selfInfo?.avatar || userStore.userInfo!.avatar || '',
      locPlace: selfInfo?.locPlace || ''
    }

    const tempMessage: MessageType = {
      fromUser,
      message: {
        id: tempMsgId,
        roomId,
        sendTime: Date.now(),
        status: MessageStatusEnum.PENDING,
        type: MsgEnum.IMAGE,
        body: {
          url: previewUrl,
          width: previewWidth,
          height: previewHeight,
          size
        },
        messageMarks: {}
      },
      sendTime: Date.now(),
      loading: false,
      isCheck: true
    }

    chatStore.clearMsgCheck()
    await chatStore.pushMsg(tempMessage)

    chatStore.setCustomForwardTask({
      id: tempMsgId,
      type: MsgEnum.IMAGE,
      fileName: 'group-qr.png',
      mimeType,
      bytes,
      previewUrl,
      width: previewWidth,
      height: previewHeight,
      size
    })

    chatStore.setMsgMultiChoose(true, 'forward')
    await nextTick()
    useMitt.emit(MittEnum.MSG_MULTI_CHOOSE, {
      action: 'open-forward',
      mergeType: MergeMessageType.SINGLE
    })
  } catch (error) {
    console.error('转发二维码失败:', error)
  }
}

const handleCopyGroupId = async () => {
  const groupId = activeItem.value?.account || currentSessionRoomId.value
  if (!groupId) {
    return
  }
  try {
    await navigator.clipboard.writeText(groupId)
    window.$message.success(t('home.chat_header.qr.toast.group_id_copied'))
  } catch (error) {
    console.error('复制群号失败:', error)
  }
}

const handleSaveGroupQrImage = async () => {
  if (!groupQrValue.value) return
  try {
    const qrResult = await getGroupQrImageBytes()
    if (!qrResult) {
      window.$message.error(t('home.chat_header.qr.toast.save_failed'))
      return
    }
    const { bytes } = qrResult
    const defaultName = `group-qr-${currentSessionRoomId.value || 'unknown'}.png`
    const savePath = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'PNG',
          extensions: ['png']
        }
      ]
    })
    if (!savePath) return
    await writeFile(normalizeSavePath(savePath), bytes)
    window.$message.success(t('home.chat_header.qr.toast.save_success'))
  } catch (error) {
    console.error('保存二维码失败:', error)
    window.$message.error(t('home.chat_header.qr.toast.save_failed'))
  }
}

/** 处理创建群聊或邀请进群 */
const handleCreateGroupOrInvite = () => {
  const session = activeItem.value
  if (!session) return
  if (session.type === RoomTypeEnum.GROUP) {
    handleInvite()
  } else {
    handleCreateGroup()
  }
}

/** 处理创建群聊 */
const handleCreateGroup = () => {
  const session = activeItem.value
  if (!session) return
  useMitt.emit(MittEnum.CREATE_GROUP, { id: session.detailId })
}

/** 处理邀请进群 */
const handleInvite = async () => {
  const session = activeItem.value
  if (!session) return
  // 使用封装后的createModalWindow方法创建模态窗口，并传递当前会话的 roomId
  await createModalWindow(t('home.chat_header.modal.invite_friends'), 'modal-invite', 600, 500, 'home', {
    roomId: currentSessionRoomId.value,
    type: session.type
  })
}

/** 处理管理群成员 */
const handleManageGroupMember = () => {
  // 打开管理群成员弹窗
  showManageGroupMemberModal.value = true
}

// 保存群聊信息
const saveGroupInfo = async () => {
  const session = activeItem.value
  if (!currentSessionRoomId.value || session?.type !== RoomTypeEnum.GROUP) return

  const pendingInfo = pendingGroupInfo.value
  if (!pendingInfo) return

  const myName = pendingInfo.myName ?? ''
  const remark = pendingInfo.remark ?? ''

  try {
    await persistMyRoomInfo({
      roomId: currentSessionRoomId.value,
      myName,
      remark
    })

    localMyName.value = resolveMyRoomNickname({
      roomId: currentSessionRoomId.value,
      myName
    })
    localRemark.value = remark

    window.$message.success(t('home.chat_header.toast.group_info_updated'))
    pendingGroupInfo.value = null
  } catch (error) {
    console.error('更新群聊信息失败:', error)
    window.$message.error(t('home.chat_header.toast.group_info_update_failed'))
  }
}

const handleAssist = () => {
  window.$message.warning(t('home.chat_header.toast.todo'))
}

const handleMedia = () => {
  window.$message.warning(t('home.chat_header.toast.todo'))
}

/** 置顶 */
const handleTop = (value: boolean) => {
  const session = activeItem.value
  if (!session) return
  setSessionTop({ roomId: currentSessionRoomId.value, top: value })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(currentSessionRoomId.value, { top: value })
      window.$message.success(value ? t('home.chat_header.toast.pin_on') : t('home.chat_header.toast.pin_off'))
    })
    .catch(() => {
      window.$message.error(t('home.chat_header.toast.pin_failed'))
    })
}

/** 处理消息免打扰 */
const handleNotification = (value: boolean) => {
  const session = activeItem.value
  if (!session) return
  const newType = value ? NotificationTypeEnum.NOT_DISTURB : NotificationTypeEnum.RECEPTION
  // 如果当前是屏蔽状态，需要先取消屏蔽
  if (session.shield) {
    handleShield(false)
  }
  notification({
    roomId: currentSessionRoomId.value,
    type: newType
  })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(currentSessionRoomId.value, {
        muteNotification: newType
      })

      // 如果从免打扰切换到允许提醒，需要重新计算全局未读数
      if (session.muteNotification === NotificationTypeEnum.NOT_DISTURB && newType === NotificationTypeEnum.RECEPTION) {
        chatStore.updateTotalUnreadCount()
      }

      // 如果设置为免打扰，也需要更新全局未读数，因为该会话的未读数将不再计入
      if (newType === NotificationTypeEnum.NOT_DISTURB) {
        chatStore.updateTotalUnreadCount()
      }

      window.$message.success(value ? t('home.chat_header.toast.mute_on') : t('home.chat_header.toast.mute_off'))
    })
    .catch(() => {
      window.$message.error(t('home.chat_header.toast.action_failed'))
    })
}

/** 处理屏蔽消息 */
const handleShield = (value: boolean) => {
  const session = activeItem.value
  if (!session) return
  shield({
    roomId: currentSessionRoomId.value,
    state: value
  })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(currentSessionRoomId.value, {
        shield: value
      })

      // 1. 先保存当前聊天室ID
      const tempRoomId = globalStore.currentSessionRoomId

      // 3. 在下一个tick中恢复原来的聊天室ID，触发重新加载消息
      nextTick(() => {
        globalStore.updateCurrentSessionRoomId(tempRoomId)
      })

      window.$message.success(value ? t('home.chat_header.toast.shield_on') : t('home.chat_header.toast.shield_off'))
    })
    .catch(() => {
      window.$message.error(t('home.chat_header.toast.action_failed'))
    })
}

/** 处理群名称修改失焦 */
const handleGroupNameChange = () => {
  const session = activeItem.value
  if (!session) return
  const trimmedName = editingGroupName.value.trim()

  // 检查名称是否有变化
  if (trimmedName !== session.name) {
    // 检查名称是否为空或超过12个字符
    if (trimmedName === '') {
      window.$message.warning(t('home.chat_header.toast.group_name_empty'))
      return
    }
    if (trimmedName.length > 12) {
      window.$message.warning(t('home.chat_header.toast.group_name_too_long'))
      return
    }

    // 保存待修改的群名称并触发确认弹窗
    pendingGroupInfo.value = { groupName: trimmedName }
    handleDelete(RoomActEnum.UPDATE_GROUP_NAME)
  } else {
    // 名称没有变化，直接退出编辑模式
    isEditingGroupName.value = false
  }
}

/** 处理群信息修改失焦 */
const handleGroupInfoChange = () => {
  // 检查是否有修改
  const originalMyName = groupStore.myNameInCurrentGroup || ''
  const originalRemark = groupStore.countInfo?.remark || ''

  if (localMyName.value !== originalMyName || localRemark.value !== originalRemark) {
    // 保存待修改的群信息并触发确认弹窗
    pendingGroupInfo.value = {
      myName: localMyName.value,
      remark: localRemark.value
    }
    handleDelete(RoomActEnum.UPDATE_GROUP_INFO)
  }
}

const deleteRoomMessages = async (roomId: string) => {
  if (!roomId) return
  try {
    await invokeWithErrorHandler(
      TauriCommand.DELETE_ROOM_MESSAGES,
      { roomId },
      {
        customErrorMessage: t('home.chat_header.toast.delete_history_failed'),
        errorType: ErrorType.Client
      }
    )
    chatStore.clearRoomMessages(roomId)
    useMitt.emit(MittEnum.UPDATE_SESSION_LAST_MSG, { roomId })
    window.$message?.success(t('home.chat_header.toast.delete_history_success'))
    modalShow.value = false
    sidebarShow.value = false
  } catch (error) {
    console.error('删除聊天记录失败:', error)
  }
}

/** 删除操作二次提醒 */
const handleDelete = (label: RoomActEnum) => {
  modalShow.value = true
  optionsType.value = label
  if (label === RoomActEnum.DELETE_FRIEND) {
    tips.value = t('home.chat_header.modal.tips.delete_friend')
  } else if (label === RoomActEnum.DISSOLUTION_GROUP) {
    tips.value = t('home.chat_header.modal.tips.dissolve_group')
  } else if (label === RoomActEnum.EXIT_GROUP) {
    tips.value = t('home.chat_header.modal.tips.exit_group')
  } else if (label === RoomActEnum.UPDATE_GROUP_NAME) {
    tips.value = t('home.chat_header.modal.tips.rename_group', {
      name: pendingGroupInfo.value?.groupName ?? ''
    })
  } else if (label === RoomActEnum.UPDATE_GROUP_INFO) {
    tips.value = t('home.chat_header.modal.tips.update_info')
  } else {
    tips.value = t('home.chat_header.modal.tips.delete_history')
    optionsType.value = RoomActEnum.DELETE_RECORD
  }
}

const handleConfirm = async () => {
  const currentOption = optionsType.value
  const targetRoomId = currentSessionRoomId.value
  const targetDetailId = activeItem.value?.detailId

  if (currentOption === undefined || currentOption === null || !targetRoomId) return

  if (currentOption === RoomActEnum.DELETE_FRIEND && targetDetailId) {
    try {
      await contactStore.onDeleteFriend(targetDetailId)
      useMitt.emit(MittEnum.DELETE_SESSION, targetRoomId)
      window.$message.success(t('home.chat_header.toast.delete_friend_success'))
      modalShow.value = false
      sidebarShow.value = false
    } catch (error) {
      console.error('删除好友失败:', error)
    }
  } else if (currentOption === RoomActEnum.DISSOLUTION_GROUP) {
    if (targetRoomId === '1') {
      window.$message.warning(t('home.chat_header.toast.dissolve_not_allowed'))
      modalShow.value = false
      return
    }

    try {
      await groupStore.exitGroup(targetRoomId)
      window.$message.success(t('home.chat_header.toast.dissolve_success'))
      // 删除当前的会话
      useMitt.emit(MittEnum.DELETE_SESSION, targetRoomId)
      modalShow.value = false
      sidebarShow.value = false
    } catch (error) {
      console.error('解散群聊失败:', error)
    }
  } else if (currentOption === RoomActEnum.EXIT_GROUP) {
    if (targetRoomId === '1') {
      window.$message.warning(t('home.chat_header.toast.exit_not_allowed'))
      modalShow.value = false
      return
    }

    try {
      await groupStore.exitGroup(targetRoomId)
      window.$message.success(t('home.chat_header.toast.exit_success'))
      // 删除当前的会话
      useMitt.emit(MittEnum.DELETE_SESSION, targetRoomId)
      modalShow.value = false
      sidebarShow.value = false
    } catch (error) {
      console.error('退出群聊失败:', error)
    }
  } else if (currentOption === RoomActEnum.DELETE_RECORD) {
    await deleteRoomMessages(targetRoomId)
  } else if (currentOption === RoomActEnum.UPDATE_GROUP_NAME) {
    // 确认修改群名称
    await saveGroupName()
    modalShow.value = false
  } else if (currentOption === RoomActEnum.UPDATE_GROUP_INFO) {
    // 确认修改群信息
    await saveGroupInfo()
    modalShow.value = false
  }
}

const handleCancel = () => {
  const session = activeItem.value
  // 如果是取消群信息修改，需要恢复原始值
  if (optionsType.value === RoomActEnum.UPDATE_GROUP_NAME) {
    // 取消群名称修改，退出编辑模式
    isEditingGroupName.value = false
    editingGroupName.value = session?.name || ''
  } else if (optionsType.value === RoomActEnum.UPDATE_GROUP_INFO) {
    // 取消群信息修改，恢复本地变量到原始值
    localMyName.value = groupStore.myNameInCurrentGroup || ''
    localRemark.value = groupStore.countInfo?.remark || ''
  }

  // 清空待保存的群信息
  pendingGroupInfo.value = null
  modalShow.value = false
}

// 开始编辑群名称
const startEditGroupName = () => {
  if (!isGroupOwner.value) return

  editingGroupName.value = activeItem.value?.name || ''
  isEditingGroupName.value = true
}

// 保存群名称
const saveGroupName = async () => {
  if (!isGroupOwner.value || !currentSessionRoomId.value) return

  isEditingGroupName.value = false

  // 使用 pendingGroupInfo 中的群名称
  const trimmedName = pendingGroupInfo.value?.groupName
  if (!trimmedName) return

  try {
    // 调用更新群信息的API
    await updateRoomInfo({
      id: currentSessionRoomId.value,
      name: trimmedName
    })
    // 清空待保存的群信息
    pendingGroupInfo.value = null
  } catch (error) {
    window.$message.error(t('home.chat_header.toast.group_name_update_failed'))
    console.error('更新群名称失败:', error)
  }
}

// 处理上传头像
const handleUploadAvatar = () => {
  if (!isGroupOwner.value || !currentSessionRoomId.value) return

  openFileSelector()
}

// 处理裁剪，调用hook中的方法
const handleCrop = async (cropBlob: Blob) => {
  await onCrop(cropBlob)
}

const closeMenu = (event: any) => {
  /** 点击非侧边栏元素时，关闭侧边栏，但点击弹出框元素、侧边栏图标、还有侧边栏里面的元素时不关闭 */
  if (!event.target.matches('.sidebar, .sidebar *, .n-modal-mask, .options-box *, .n-modal *') && !modalShow.value) {
    sidebarShow.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
  // 初始化本地变量
  initLocalValues()
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
  useMitt.off(WsResponseMessageType.VideoCallRequest, () => {})
  revokeQrExportIcon()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-header';

.loading-enter-active,
.loading-leave-active {
  transition: opacity 0.3s ease;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}

.QRcode-item {
  @apply flex flex-1 flex-col items-center gap-10px cursor-pointer text-(12px [--chat-text-color]) p-8px rounded-12px transition-colors hover:bg-#e3e3e360 dark:hover:bg-#262626;
}

:deep(.n-scrollbar > .n-scrollbar-container > .n-scrollbar-content) {
  padding-left: 2px;
}
</style>
