<template>
  <!-- 顶部操作栏和显示用户名 -->
  <main
    data-tauri-drag-region
    class="relative z-999 flex-y-center border-b-(1px solid [--right-chat-footer-line-color]) select-none cursor-default justify-between p-[6px_22px_10px]">
    <n-flex align="center">
      <Transition name="loading" mode="out-in">
        <n-flex align="center">
          <n-avatar
            :class="['rounded-8px select-none', { grayscale: activeItem.type === RoomTypeEnum.SINGLE && !isOnline }]"
            :size="28"
            :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
            :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
            :src="currentUserAvatar" />
          <label class="flex-y-center gap-6px">
            <p class="text-(16px [--text-color])">{{ groupStore.countInfo?.remark || activeItem.name }}</p>
            <p
              v-if="activeItem.type === RoomTypeEnum.GROUP && groupStore.countInfo?.memberNum"
              class="text-(11px #808080)">
              [{{ groupStore.countInfo?.memberNum }}]
            </p>
          </label>
          <svg v-if="activeItem.hotFlag === IsAllUserEnum.Yes" class="size-20px color-#13987f select-none outline-none">
            <use href="#auth"></use>
          </svg>
          <n-flex v-else-if="activeItem.type === RoomTypeEnum.SINGLE" align="center">
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
                <p class="text-(12px [--text-color])">好友状态异常</p>
              </n-flex>
            </template>
          </n-flex>
        </n-flex>
      </Transition>
    </n-flex>
    <!-- 顶部右边选项栏 -->
    <nav v-if="shouldShowDeleteFriend || chatStore.isGroup" class="options flex-y-center gap-20px color-[--icon-color]">
      <div v-if="!isChannel" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="startRtcCall(CallTypeEnum.AUDIO)">
              <use href="#phone-telephone"></use>
            </svg>
          </template>
          <span>语音通话</span>
        </n-popover>
      </div>

      <div v-if="!isChannel" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="startRtcCall(CallTypeEnum.VIDEO)">
              <use href="#video-one"></use>
            </svg>
          </template>
          <span>视频通话</span>
        </n-popover>
      </div>

      <div v-if="!isChannel" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleMedia">
              <use href="#screen-sharing"></use>
            </svg>
          </template>
          <span>屏幕共享</span>
        </n-popover>
      </div>

      <div v-if="!isChannel" class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleAssist">
              <use href="#remote-control"></use>
            </svg>
          </template>
          <span>远程协助</span>
        </n-popover>
      </div>

      <div v-if="!isChannel && activeItem.roomId !== '1'" class="options-box" @click="handleCreateGroupOrInvite">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg>
              <use href="#launch"></use>
            </svg>
          </template>
          <span v-if="activeItem.type === RoomTypeEnum.GROUP">邀请进群</span>
          <span v-else>发起群聊</span>
        </n-popover>
      </div>

      <div class="options-box" @click="sidebarShow = !sidebarShow">
        <svg>
          <use href="#more"></use>
        </svg>
      </div>
    </nav>

    <!-- 侧边选项栏 -->
    <Transition v-if="shouldShowDeleteFriend || chatStore.isGroup" name="sidebar">
      <div v-if="sidebarShow" style="border: 1px solid rgba(90, 90, 90, 0.1)" class="sidebar">
        <n-scrollbar style="height: calc(100vh / var(--page-scale, 1) - 50px)" class="p-22px box-border">
          <!-- 单聊侧边栏选项 -->
          <template v-if="!chatStore.isGroup">
            <div class="box-item flex-col-y-center">
              <div class="flex-between-center">
                <p>设为置顶</p>
                <n-switch size="small" :value="activeItem.top" @update:value="handleTop" />
              </div>
              <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>
              <div class="flex-between-center">
                <p>消息免打扰</p>
                <n-switch
                  size="small"
                  :value="activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB"
                  @update:value="handleNotification" />
              </div>
            </div>

            <div class="box-item">
              <div class="flex-between-center">
                <p>屏蔽此人</p>
                <n-switch size="small" :value="activeItem.shield" @update:value="handleShield" />
              </div>
            </div>

            <div class="box-item cursor-pointer" @click="handleDelete(RoomActEnum.DELETE_RECORD)">
              <p>删除聊天记录</p>
            </div>

            <div class="box-item flex-x-center cursor-pointer" @click="handleDelete(RoomActEnum.DELETE_FRIEND)">
              <p class="color-#d03553">删除好友</p>
            </div>

            <p class="m-[0_auto] text-(12px #13987f center) mt-20px cursor-pointer">被骚扰了?&nbsp;&nbsp;举报该用户</p>
          </template>

          <!-- 群聊侧边栏选项 -->
          <template v-else>
            <div class="box-item cursor-default">
              <n-flex
                align="center"
                :justify="groupStore.countInfo!.allowScanEnter ? 'space-between' : ''"
                :size="groupStore.countInfo!.allowScanEnter ? 0 : 12">
                <!-- 群头像 -->
                <div class="relative group">
                  <!-- 群主可以编辑头像，显示黑色蒙层和上传图标 -->
                  <div v-if="isGroupOwner" class="avatar-wrapper relative" @click="handleUploadAvatar">
                    <n-avatar round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />
                    <div class="avatar-hover absolute size-full rounded-50% flex-center">
                      <svg class="size-14px color-#fefefe">
                        <use href="#Export"></use>
                      </svg>
                    </div>
                  </div>

                  <n-avatar v-else round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />
                </div>

                <n-flex vertical :size="6">
                  <!-- 群名称 -->
                  <n-flex :size="10" align="center">
                    <div v-if="isGroupOwner && isEditingGroupName">
                      <n-input
                        ref="groupNameInputRef"
                        v-model:value="editingGroupName"
                        @blur.stop="handleGroupNameChange"
                        @keydown.enter.stop="handleGroupNameChange"
                        size="tiny"
                        style="width: 100px; height: 22px"
                        maxlength="12"
                        spellCheck="false"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        class="border-(solid 1px [--line-color])"
                        placeholder="请输入群名称(最多12字)" />
                    </div>
                    <div
                      v-else
                      class="text-(14px --text-color) cursor-default h-22px flex-center"
                      :class="{ 'cursor-pointer': isGroupOwner }"
                      @click="isGroupOwner && startEditGroupName()">
                      <p class="max-w-100px truncate">{{ activeItem.name }}</p>
                      <!-- 显示编辑图标 -->
                      <svg v-if="isGroupOwner" class="size-14px ml-1 inline-block color-[--icon-color]">
                        <use href="#edit"></use>
                      </svg>
                    </div>

                    <n-popover trigger="hover" v-if="activeItem.hotFlag === IsAllUserEnum.Yes && !isEditingGroupName">
                      <template #trigger>
                        <svg class="size-20px select-none outline-none cursor-pointer color-#13987f">
                          <use href="#auth"></use>
                        </svg>
                      </template>
                      <span>官方群聊认证</span>
                    </n-popover>
                  </n-flex>

                  <n-flex align="center" :size="8">
                    <!-- hula号 -->
                    <p
                      class="text-(12px center [--chat-text-color]) rounded-4px w-100px py-2px bg-[#e3e3e3] dark:bg-[#505050]">
                      {{ activeItem.account }}
                    </p>

                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <svg
                          class="size-12px cursor-pointer hover:color-#909090 hover:transition-colors"
                          @click="handleCopy">
                          <use href="#copy"></use>
                        </svg>
                      </template>
                      <span>复制</span>
                    </n-tooltip>
                  </n-flex>
                </n-flex>

                <div
                  v-if="groupStore.countInfo!.allowScanEnter"
                  class="flex-center cursor-pointer bg-#e3e3e3 dark:bg-#303030 border-(1px solid #90909080) gap-6px px-4px py-6px rounded-6px"
                  @click="showQRCodeModal = true">
                  <svg class="size-16px"><use href="#pay-code-one"></use></svg>
                  <p class="text-(12px [--chat-text-color])">二维码</p>
                </div>
              </n-flex>
            </div>

            <!-- 群聊成员列表 -->
            <div class="box-item cursor-default">
              <n-flex vertical justify="center" :size="16">
                <p class="text-(14px --text-color)">
                  {{ activeItem.hotFlag !== IsAllUserEnum.Yes ? '群成员' : '频道成员' }}
                </p>

                <n-flex align="center" justify="start" :size="[24, 20]">
                  <template v-for="(item, _index) in userList" :key="_index">
                    <n-flex vertical justify="center" align="center" :size="10">
                      <n-avatar round :size="30" :src="AvatarUtils.getAvatarUrl(item.avatar)" />

                      <p class="text-(10px --text-color center) w-30px truncate">{{ item.name }}</p>
                    </n-flex>
                  </template>
                </n-flex>
              </n-flex>
            </div>

            <!-- 我本群的昵称 -->
            <p class="text-(12px [--chat-text-color]) mt-20px mb-10px">我本群的昵称</p>
            <n-input
              class="border-(solid 1px [--line-color]) custom-shadow"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              :maxlength="12"
              clearable
              v-model:value="localMyName"
              @blur.stop="handleGroupInfoChange" />
            <!-- 群备注 -->
            <p class="flex-start-center gap-10px text-(12px [--chat-text-color]) mt-20px mb-10px">
              群备注
              <span class="text-(10px #909090)">(群备注仅自己可见)</span>
            </p>
            <n-input
              class="border-(solid 1px [--line-color]) custom-shadow"
              v-model:value="localRemark"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              clearable
              @blur.stop="handleGroupInfoChange" />

            <!-- 群设置选项 -->
            <div class="box-item cursor-default">
              <n-flex vertical justify="center" :size="4">
                <p class="text-(12px #909090) pb-14px">群设置</p>

                <div class="flex-between-center">
                  <p>设为置顶</p>
                  <n-switch size="small" :value="activeItem.top" @update:value="handleTop" />
                </div>

                <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>

                <div class="flex-between-center">
                  <p>消息免打扰</p>
                  <n-switch
                    size="small"
                    :value="activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB"
                    @update:value="handleNotification" />
                </div>
                <template v-if="groupStore.isAdminOrLord()">
                  <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>

                  <div class="flex-between-center">
                    <p>允许扫码进群</p>
                    <n-switch
                      size="small"
                      :value="groupStore.countInfo!.allowScanEnter"
                      @update:value="
                        (val: any) => {
                          updateRoomInfo({
                            id: groupStore.countInfo!.roomId,
                            allowScanEnter: val
                          })
                        }
                      " />
                  </div>
                </template>
              </n-flex>
            </div>

            <!-- 群消息设置（仅在消息免打扰开启时显示） -->
            <div
              v-if="activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB"
              class="box-item cursor-default">
              <n-flex vertical justify="center" :size="4">
                <p class="text-(12px #909090) pb-14px">群消息设置</p>

                <div class="flex-between-center">
                  <n-select
                    v-model:value="messageSettingType"
                    :options="messageSettingOptions"
                    @update:value="handleMessageSetting" />
                </div>
              </n-flex>
            </div>

            <div class="box-item cursor-pointer mb-20px" @click="handleDelete(RoomActEnum.DELETE_RECORD)">
              <p>删除聊天记录</p>
            </div>

            <div
              v-if="activeItem.hotFlag !== IsAllUserEnum.Yes"
              class="box-item flex-x-center cursor-pointer mb-20px"
              @click="
                handleDelete(
                  activeItem.operate === SessionOperateEnum.DISSOLUTION_GROUP
                    ? RoomActEnum.DISSOLUTION_GROUP
                    : RoomActEnum.EXIT_GROUP
                )
              ">
              <p class="color-#d03553">
                {{ activeItem.operate === SessionOperateEnum.DISSOLUTION_GROUP ? '解散群聊' : '退出群聊' }}
              </p>
            </div>

            <p
              v-if="activeItem.hotFlag !== IsAllUserEnum.Yes"
              class="text-(12px #13987f center) my-20px cursor-pointer">
              被骚扰了?&nbsp;&nbsp;举报该群
            </p>
          </template>
        </n-scrollbar>
      </div>
    </Transition>
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
          <n-button @click="handleConfirm" class="w-78px" color="#13987f">确定</n-button>
          <n-button @click="handleCancel" class="w-78px" secondary>取消</n-button>
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
        <div class="flex flex-col items-center gap-16px">
          <n-qr-code
            style="border-radius: 16px"
            :value="JSON.stringify({ type: 'scanEnterGroup', roomId: activeItem.roomId })"
            :size="200"
            :color="themes.content === ThemeEnum.DARK ? '#202020' : '#000000'"
            :background-color="themes.content === ThemeEnum.DARK ? '#e3e3e3' : '#e3e3e382'"
            :icon-src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />

          <div class="text-center">
            <p class="text-(16px [--text-color]) font-bold pb-24px">{{ activeItem.name }}</p>
            <p class="text-(12px [--chat-text-color])">扫描二维码加入群聊</p>
          </div>
        </div>
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
import { useDisplayMedia } from '@vueuse/core'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import {
  CallTypeEnum,
  MittEnum,
  NotificationTypeEnum,
  RoleEnum,
  RoomActEnum,
  RoomTypeEnum,
  SessionOperateEnum,
  ThemeEnum
} from '@/enums'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useMyRoomInfoUpdater } from '@/hooks/useMyRoomInfoUpdater'
import { useMitt } from '@/hooks/useMitt.ts'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useWindow } from '@/hooks/useWindow'
import { IsAllUserEnum, type UserItem } from '@/services/types.ts'
import { WsResponseMessageType } from '@/services/wsType'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group.ts'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { notification, setSessionTop, shield, updateRoomInfo } from '@/utils/ImRequestUtils'
import { isMac, isWindows } from '@/utils/PlatformConstants'

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
const { currentSession: activeItem } = storeToRefs(globalStore)
const { persistMyRoomInfo, resolveMyRoomNickname } = useMyRoomInfoUpdater()

// 是否为频道（仅显示 more 按钮）
const isChannel = computed(() => activeItem.value?.hotFlag === IsAllUserEnum.Yes || activeItem.value?.roomId === '1')
// 是否为群主
const isGroupOwner = computed(() => {
  // 频道不能修改群头像和群名称
  if (!activeItem.value || activeItem.value.roomId === '1' || activeItem.value.hotFlag === IsAllUserEnum.Yes) {
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
// 群名称输入框引用
const groupNameInputRef = useTemplateRef<HTMLInputElement | null>('groupNameInputRef')
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
    roomId: activeItem.value?.roomId,
    myName: groupStore.myNameInCurrentGroup || ''
  })
  localRemark.value = groupStore.countInfo?.remark || ''
}

watch(
  () => groupStore.myNameInCurrentGroup,
  (newName) => {
    const normalized = resolveMyRoomNickname({
      roomId: activeItem.value?.roomId,
      myName: newName || ''
    })
    if (localMyName.value !== normalized) {
      localMyName.value = normalized
    }
  }
)
// 监听当前会话变化，重新初始化本地变量
watch(
  () => activeItem.value?.roomId,
  () => {
    if (activeItem.value?.roomId) {
      nextTick(() => {
        initLocalValues()
      })
    }
  }
)

const messageSettingType = computed(() => {
  // 群消息设置只在免打扰模式下有意义
  if (activeItem.value?.muteNotification === NotificationTypeEnum.NOT_DISTURB) {
    return activeItem.value?.shield ? 'shield' : 'notification'
  }
  // 非免打扰模式下，默认返回 notification
  return 'notification'
})
const messageSettingOptions = ref([
  { label: '接收消息但不提醒', value: 'notification' },
  { label: '屏蔽消息', value: 'shield' }
])

const chatTargetUid = computed(() => {
  if (!activeItem.value || activeItem.value.type === RoomTypeEnum.GROUP) return undefined
  return activeItem.value.detailId
})
const { isOnline, statusIcon, statusTitle, hasCustomState } = useOnlineStatus(chatTargetUid)

/** 是否还是好友 */
const shouldShowDeleteFriend = computed(() => {
  if (!activeItem.value || activeItem.value.type === RoomTypeEnum.GROUP) return false
  return contactStore.contactsList.some((item) => item.uid === activeItem.value.detailId)
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
  if (!activeItem.value) return ''
  if (activeItem.value.type === RoomTypeEnum.GROUP) {
    return AvatarUtils.getAvatarUrl(activeItem.value.avatar)
  } else if (activeItem.value.detailId) {
    return AvatarUtils.getAvatarUrl(
      groupStore.getUserInfo(activeItem.value.detailId)!.avatar || activeItem.value.avatar
    )
  }
  return AvatarUtils.getAvatarUrl(activeItem.value.avatar)
})
// 使用自定义hook处理头像上传
const {
  fileInput,
  localImageUrl,
  showCropper,
  cropperRef,
  openFileSelector,
  handleFileChange,
  handleCrop: onCrop
} = useAvatarUpload({
  onSuccess: async (downloadUrl) => {
    // 调用更新群头像的API
    await updateRoomInfo({
      id: activeItem.value.roomId,
      avatar: downloadUrl
    })
  }
})

watchEffect(() => {
  stream.value?.getVideoTracks()[0]?.addEventListener('ended', () => {
    stop()
  })
})

// 处理复制账号
const handleCopy = () => {
  if (activeItem.value.account) {
    navigator.clipboard.writeText(activeItem.value.account)
    window.$message.success(`复制成功 ${activeItem.value.account}`)
  }
}

/** 处理创建群聊或邀请进群 */
const handleCreateGroupOrInvite = () => {
  if (activeItem.value.type === RoomTypeEnum.GROUP) {
    handleInvite()
  } else {
    handleCreateGroup()
  }
}

/** 处理创建群聊 */
const handleCreateGroup = () => {
  useMitt.emit(MittEnum.CREATE_GROUP, { id: activeItem.value.detailId })
}

/** 处理邀请进群 */
const handleInvite = async () => {
  // 使用封装后的createModalWindow方法创建模态窗口
  await createModalWindow('邀请好友进群', 'modal-invite', 600, 500, 'home')
}

// 保存群聊信息
const saveGroupInfo = async () => {
  if (!activeItem.value.roomId || activeItem.value.type !== RoomTypeEnum.GROUP) return

  const pendingInfo = pendingGroupInfo.value
  if (!pendingInfo) return

  const myName = pendingInfo.myName ?? ''
  const remark = pendingInfo.remark ?? ''

  try {
    await persistMyRoomInfo({
      roomId: activeItem.value.roomId,
      myName,
      remark
    })

    localMyName.value = resolveMyRoomNickname({
      roomId: activeItem.value.roomId,
      myName
    })
    localRemark.value = remark

    window.$message.success('群聊信息已更新')
    pendingGroupInfo.value = null
  } catch (error) {
    console.error('更新群聊信息失败:', error)
    window.$message.error('群聊信息更新失败')
  }
}

const handleAssist = () => {
  window.$message.warning('暂未实现')
}

const handleMedia = () => {
  window.$message.warning('暂未实现')
}

/** 置顶 */
const handleTop = (value: boolean) => {
  setSessionTop({ roomId: activeItem.value.roomId, top: value })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.value.roomId, { top: value })
      window.$message.success(value ? '已置顶' : '已取消置顶')
    })
    .catch(() => {
      window.$message.error('置顶失败')
    })
}

/** 处理消息免打扰 */
const handleNotification = (value: boolean) => {
  const newType = value ? NotificationTypeEnum.NOT_DISTURB : NotificationTypeEnum.RECEPTION
  // 如果当前是屏蔽状态，需要先取消屏蔽
  if (activeItem.value.shield) {
    handleShield(false)
  }
  notification({
    roomId: activeItem.value.roomId,
    type: newType
  })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.value.roomId, {
        muteNotification: newType
      })

      // 如果从免打扰切换到允许提醒，需要重新计算全局未读数
      if (
        activeItem.value.muteNotification === NotificationTypeEnum.NOT_DISTURB &&
        newType === NotificationTypeEnum.RECEPTION
      ) {
        chatStore.updateTotalUnreadCount()
      }

      // 如果设置为免打扰，也需要更新全局未读数，因为该会话的未读数将不再计入
      if (newType === NotificationTypeEnum.NOT_DISTURB) {
        chatStore.updateTotalUnreadCount()
      }

      window.$message.success(value ? '已设置接收消息但不提醒' : '已允许消息提醒')
    })
    .catch(() => {
      window.$message.error('设置失败')
    })
}

/** 处理屏蔽消息 */
const handleShield = (value: boolean) => {
  shield({
    roomId: activeItem.value.roomId,
    state: value
  })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.value.roomId, {
        shield: value
      })

      // 1. 先保存当前聊天室ID
      const tempRoomId = globalStore.currentSession!.roomId

      // 3. 在下一个tick中恢复原来的聊天室ID，触发重新加载消息
      nextTick(() => {
        globalStore.updateCurrentSessionRoomId(tempRoomId)
      })

      window.$message.success(value ? '已屏蔽消息' : '已取消屏蔽')
    })
    .catch(() => {
      window.$message.error('设置失败')
    })
}

const handleMessageSetting = (value: string) => {
  if (value === 'shield') {
    // 设置为屏蔽消息
    if (!activeItem.value.shield) {
      handleShield(true)
    }
  } else if (value === 'notification') {
    // 设置为接收消息但不提醒
    if (activeItem.value.shield) {
      handleShield(false)
    }
  }
}

/** 处理群名称修改失焦 */
const handleGroupNameChange = () => {
  const trimmedName = editingGroupName.value.trim()

  // 检查名称是否有变化
  if (trimmedName !== activeItem.value.name) {
    // 检查名称是否为空或超过12个字符
    if (trimmedName === '') {
      window.$message.warning('群名称不能为空')
      return
    }
    if (trimmedName.length > 12) {
      window.$message.warning('群名称不能超过12个字符')
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

/** 删除操作二次提醒 */
const handleDelete = (label: RoomActEnum) => {
  modalShow.value = true
  optionsType.value = label
  if (label === RoomActEnum.DELETE_FRIEND) {
    tips.value = '确定删除该好友吗?'
  } else if (label === RoomActEnum.DISSOLUTION_GROUP) {
    tips.value = '确定解散该群聊?'
  } else if (label === RoomActEnum.EXIT_GROUP) {
    tips.value = '确定退出该群聊?'
  } else if (label === RoomActEnum.UPDATE_GROUP_NAME) {
    tips.value = `确定将群名称修改为"${pendingGroupInfo.value?.groupName}"吗？`
  } else if (label === RoomActEnum.UPDATE_GROUP_INFO) {
    tips.value = '确定保存群信息修改吗？'
  } else {
    tips.value = '确定后将删除本地聊天记录'
    optionsType.value = RoomActEnum.DELETE_RECORD
  }
}

const handleConfirm = async () => {
  if (optionsType.value === RoomActEnum.DELETE_FRIEND && activeItem.value.detailId) {
    contactStore.onDeleteFriend(activeItem.value.detailId).then(() => {
      modalShow.value = false
      sidebarShow.value = false
      window.$message.success('已删除好友')
    })
  } else if (optionsType.value === RoomActEnum.DISSOLUTION_GROUP) {
    if (activeItem.value.roomId === '1') {
      window.$message.warning('无法解散频道')
      modalShow.value = false
      return
    }

    groupStore.exitGroup(activeItem.value.roomId).then(() => {
      modalShow.value = false
      sidebarShow.value = false
      window.$message.success('已解散群聊')
      // 删除当前的会话
      useMitt.emit(MittEnum.DELETE_SESSION, activeItem.value.roomId)
    })
  } else if (optionsType.value === RoomActEnum.EXIT_GROUP) {
    if (activeItem.value.roomId === '1') {
      window.$message.warning('无法退出频道')
      modalShow.value = false
      return
    }

    groupStore.exitGroup(activeItem.value.roomId).then(() => {
      modalShow.value = false
      sidebarShow.value = false
      window.$message.success('已退出群聊')
      // 删除当前的会话
      useMitt.emit(MittEnum.DELETE_SESSION, activeItem.value.roomId)
    })
  } else if (optionsType.value === RoomActEnum.UPDATE_GROUP_NAME) {
    // 确认修改群名称
    await saveGroupName()
    modalShow.value = false
  } else if (optionsType.value === RoomActEnum.UPDATE_GROUP_INFO) {
    // 确认修改群信息
    await saveGroupInfo()
    modalShow.value = false
  }
}

const handleCancel = () => {
  // 如果是取消群信息修改，需要恢复原始值
  if (optionsType.value === RoomActEnum.UPDATE_GROUP_NAME) {
    // 取消群名称修改，退出编辑模式
    isEditingGroupName.value = false
    editingGroupName.value = activeItem.value.name
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

  editingGroupName.value = activeItem.value.name
  isEditingGroupName.value = true

  // 在下一个事件循环中聚焦输入框
  nextTick(() => {
    groupNameInputRef.value?.focus()
  })
}

// 保存群名称
const saveGroupName = async () => {
  if (!isGroupOwner.value || !activeItem.value.roomId) return

  isEditingGroupName.value = false

  // 使用 pendingGroupInfo 中的群名称
  const trimmedName = pendingGroupInfo.value?.groupName
  if (!trimmedName) return

  try {
    // 调用更新群信息的API
    await updateRoomInfo({
      id: activeItem.value.roomId,
      name: trimmedName
    })
    // 清空待保存的群信息
    pendingGroupInfo.value = null
  } catch (error) {
    window.$message.error('群名称更新失败')
    console.error('更新群名称失败:', error)
  }
}

// 处理上传头像
const handleUploadAvatar = () => {
  if (!isGroupOwner.value || !activeItem.value.roomId) return

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

.avatar-wrapper {
  cursor: pointer;

  .avatar-hover {
    opacity: 0;
    transition: opacity 0.4s ease-in-out;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    top: 0;
    left: 0;
  }

  &:hover .avatar-hover {
    opacity: 1;
  }
}

:deep(.n-scrollbar > .n-scrollbar-container > .n-scrollbar-content) {
  padding-left: 2px;
}
</style>
