<template>
  <!-- 顶部操作栏和显示用户名 -->
  <main
    data-tauri-drag-region
    class="relative z-30 flex-y-center border-b-(1px solid [--right-chat-footer-line-color]) select-none cursor-default justify-between p-[6px_22px_10px]">
    <n-flex align="center">
      <Transition name="loading" mode="out-in">
        <img v-if="showLoading" class="size-22px py-3px" src="@/assets/img/loading.svg" alt="" />
        <n-flex v-else align="center">
          <n-avatar class="rounded-8px select-none" :size="28" :src="currentUserAvatar" />
          <label class="flex-y-center gap-6px">
            <p class="text-(16px [--text-color])">{{ myGroupRemark || activeItem.name }}</p>
            <p
              v-if="activeItem.type === RoomTypeEnum.GROUP && groupStore.countInfo?.memberNum"
              class="text-(11px #808080)">
              [{{ groupStore.countInfo?.memberNum }}]
            </p>
          </label>
          <svg
            v-if="activeItem.hotFlag === IsAllUserEnum.Yes && !showLoading"
            class="size-20px color-#13987f select-none outline-none">
            <use href="#auth"></use>
          </svg>
          <n-flex v-else-if="activeItem.type === RoomTypeEnum.SINGLE" align="center">
            <template v-if="shouldShowDeleteFriend">
              <n-flex align="center" :size="6">
                <!-- 状态图标 -->
                <img v-if="statusIcon" :src="statusIcon" class="size-18px rounded-50%" alt="" />
                <n-badge v-else :color="isOnline ? '#1ab292' : '#909090'" dot />

                <!-- 状态文本 -->
                <p class="text-(12px [--text-color])">
                  {{ statusTitle }}
                </p>
              </n-flex>
            </template>

            <template v-else>
              <n-flex align="center" :size="4">
                <svg class="size-16px color-#d03553"><use href="#close"></use></svg>
                <p class="text-(12px [--text-color])">好友状态异常</p>
              </n-flex>
            </template>
          </n-flex>
        </n-flex>
      </Transition>
    </n-flex>
    <!-- 顶部右边选项栏 -->
    <nav v-if="shouldShowDeleteFriend || chatStore.isGroup" class="options flex-y-center gap-20px color-[--icon-color]">
      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleClick"><use href="#phone-telephone"></use></svg>
          </template>
          <span>语言通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#video-one"></use></svg>
          </template>
          <span>视频通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleMedia"><use href="#screen-sharing"></use></svg>
          </template>
          <span>屏幕共享</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#remote-control"></use></svg>
          </template>
          <span>远程协助</span>
        </n-popover>
      </div>

      <div v-if="activeItem.roomId !== '1'" class="options-box" @click="handleCreateGroupOrInvite">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#launch"></use></svg>
          </template>
          <span v-if="activeItem.type === RoomTypeEnum.GROUP">邀请进群</span>
          <span v-else>发起群聊</span>
        </n-popover>
      </div>

      <div class="options-box" @click="sidebarShow = !sidebarShow">
        <svg><use href="#more"></use></svg>
      </div>
    </nav>

    <!-- 侧边选项栏 -->
    <Transition v-if="shouldShowDeleteFriend || chatStore.isGroup" name="sidebar">
      <div v-if="sidebarShow" style="border: 1px solid rgba(90, 90, 90, 0.1)" class="sidebar">
        <n-scrollbar style="height: calc(100vh - 50px)" class="p-22px box-border">
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
              <n-flex align="center" :size="10">
                <!-- 群头像 -->
                <div class="relative group">
                  <!-- 群主可以编辑头像，显示黑色蒙层和上传图标 -->
                  <div v-if="isGroupOwner" class="avatar-wrapper relative" @click="handleUploadAvatar">
                    <n-avatar round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />
                    <div class="avatar-hover absolute size-full rounded-50% flex-center">
                      <svg class="size-14px color-#fefefe"><use href="#Export"></use></svg>
                    </div>
                  </div>

                  <n-avatar v-else round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />
                </div>

                <n-flex vertical :size="6">
                  <!-- 群名称 -->
                  <n-flex :size="10" align="center">
                    <div v-if="isGroupOwner && isEditingGroupName" class="flex-1">
                      <n-input
                        ref="groupNameInputRef"
                        v-model:value="editingGroupName"
                        @blur="saveGroupName"
                        @keydown.enter="saveGroupName"
                        size="tiny"
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
                      class="text-(14px --text-color) cursor-default"
                      :class="{ 'cursor-pointer': isGroupOwner }"
                      @click="isGroupOwner && startEditGroupName()">
                      {{ activeItem.name }}
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
              v-model:value="groupDetail.myNickname"
              @update:value="updateGroupInfo($event, 'nickname')" />
            <!-- 群备注 -->
            <p class="flex-start-center gap-10px text-(12px [--chat-text-color]) mt-20px mb-10px">
              群备注
              <span class="text-(10px #909090)">(群备注仅自己可见)</span>
            </p>
            <n-input
              class="border-(solid 1px [--line-color]) custom-shadow"
              v-model:value="groupDetail.groupRemark"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              @update:value="updateGroupInfo($event, 'remark')" />

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
        v-if="type() === 'macos'"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="type() === 'windows'" @click="modalShow = false" class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px">{{ tips }}</span>

        <n-flex justify="end">
          <n-button @click="handleConfirm" class="w-78px" color="#13987f">确定</n-button>
          <n-button @click="modalShow = false" class="w-78px" secondary>取消</n-button>
        </n-flex>
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
import { IsAllUserEnum, SessionItem, UserItem } from '@/services/types.ts'
import { useDisplayMedia } from '@vueuse/core'
import { EventEnum, MittEnum, RoomActEnum, NotificationTypeEnum } from '@/enums'
import { emit } from '@tauri-apps/api/event'
import { type } from '@tauri-apps/plugin-os'
import { useChatStore } from '@/stores/chat.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useUserInfo } from '@/hooks/useCached'
import { useContactStore } from '@/stores/contacts.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { OnlineEnum } from '@/enums'
import { useTauriListener } from '@/hooks/useTauriListener'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { RoomTypeEnum, SessionOperateEnum, RoleEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useUserStatusStore } from '@/stores/userStatus'
import { useUserStore } from '@/stores/user.ts'
import apis from '@/services/apis'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useWindow } from '@/hooks/useWindow'
import { useGlobalStore } from '@/stores/global'

const appWindow = WebviewWindow.getCurrent()
const { activeItem } = defineProps<{
  activeItem: SessionItem
}>()
const { createModalWindow } = useWindow()
const { addListener } = useTauriListener()
// 使用useDisplayMedia获取屏幕共享的媒体流
const { stream, start, stop } = useDisplayMedia()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const contactStore = useContactStore()
const userStatusStore = useUserStatusStore()
const userStore = useUserStore()
/** 提醒框标题 */
const tips = ref()
const optionsType = ref<RoomActEnum>()
const modalShow = ref(false)
const sidebarShow = ref(false)
const showLoading = ref(true)
const isLoading = ref(false)
// 群组详情数据
const groupDetail = ref({
  myNickname: '', // 我在本群的昵称
  groupRemark: '', // 群备注
  role: 3 // 默认为普通成员
})
// 保存原始群组详情数据，用于比较是否有变化
const originalGroupDetail = ref({
  myNickname: '',
  groupRemark: ''
})
// 是否为群主
const isGroupOwner = computed(() => {
  // 频道不能修改群头像和群名称
  if (activeItem.roomId === '1' || activeItem.hotFlag === IsAllUserEnum.Yes) {
    return false
  }

  // 检查groupStore.userList中当前用户的角色
  const currentUser = groupStore.userList.find((user) => user.uid === userStore.userInfo.uid)

  // 如果能在userList找到用户信息并确认角色，优先使用这个判断
  if (currentUser) {
    return currentUser.roleId === RoleEnum.LORD
  }

  // 否则回退到countInfo中的角色信息
  return groupDetail.value.role === RoleEnum.LORD
})
// 我的群备注
const myGroupRemark = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) {
    return groupStore.countInfo?.remark || ''
  }
})
// 是否正在编辑群名称
const isEditingGroupName = ref(false)
// 编辑中的群名称
const editingGroupName = ref('')
// 群名称输入框引用
const groupNameInputRef = useTemplateRef('groupNameInputRef')
// 创建一个RTCPeerConnection实例
let peerConnection: RTCPeerConnection
if (type() !== 'linux') {
  peerConnection = new RTCPeerConnection()
}

const messageSettingType = ref(
  activeItem.shield
    ? 'shield'
    : activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB
      ? 'notification'
      : 'shield'
)
const messageSettingOptions = ref([
  { label: '接收消息但不提醒', value: 'notification' },
  { label: '屏蔽消息', value: 'shield' }
])
const MIN_LOADING_TIME = 300 // 最小加载时间（毫秒）
/** 是否在线 */
const isOnline = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) return false

  const contact = contactStore.contactsList.find((item) => item.uid === activeItem.id)

  return contact?.activeStatus === OnlineEnum.ONLINE
})
/** 是否还是好友 */
const shouldShowDeleteFriend = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) return false
  return contactStore.contactsList.some((item) => item.uid === activeItem.id)
})
const groupUserList = computed(() => groupStore.userList)
const messageOptions = computed(() => chatStore.currentMessageOptions)
const userList = computed(() => {
  return groupUserList.value
    .map((item: UserItem) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { uid, ...userInfo } = item // 排除uid，获取剩余内容
      return {
        ...userInfo,
        ...useUserInfo(item.uid).value,
        uid
      }
    })
    .sort((a, b) => {
      // 将uid转换为数字进行比较
      return Number(a.uid) - Number(b.uid)
    })
    .slice(0, 10)
})
/** 获取当前用户的状态信息 */
const currentUserStatus = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) return null

  // 使用 useUserInfo 获取用户信息
  if (!activeItem.id) return null
  const userInfo = useUserInfo(activeItem.id).value

  // 从状态列表中找到对应的状态
  return userStatusStore.stateList.find((state: { id: string }) => state.id === userInfo.userStateId)
})

/** 状态图标 */
const statusIcon = computed(() => currentUserStatus.value?.url)

/** 状态标题 */
const statusTitle = computed(() => {
  if (currentUserStatus.value?.title) {
    return currentUserStatus.value.title
  }
  return isOnline.value ? '在线' : '离线'
})

// 获取用户的最新头像
const currentUserAvatar = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) {
    return AvatarUtils.getAvatarUrl(activeItem.avatar)
  } else if (activeItem.id) {
    return AvatarUtils.getAvatarUrl(useUserInfo(activeItem.id).value.avatar || activeItem.avatar)
  }
  return AvatarUtils.getAvatarUrl(activeItem.avatar)
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
    await apis.updateRoomInfo({
      id: activeItem.roomId,
      name: activeItem.name,
      avatar: downloadUrl
    })
    // 更新本地会话状态
    chatStore.updateSession(activeItem.roomId, {
      avatar: downloadUrl
    })
    window.$message.success('群头像已更新')
  }
})

// 在数据加载完成后，确保loading动画至少显示一定时间
const handleLoadingState = async (isDataLoading: boolean) => {
  if (isDataLoading) {
    showLoading.value = true
  } else {
    // 确保loading动画至少显示MIN_LOADING_TIME时间
    await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME))
    showLoading.value = false
  }
}

// 监听 isLoading 的变化
watch(
  () => isLoading.value,
  async (newValue) => {
    await handleLoadingState(newValue)
  },
  { immediate: true }
)

watch(
  () => activeItem.roomId,
  () => {
    if (messageOptions.value?.isLoading) {
      isLoading.value = true
      showLoading.value = true
    }
    // 当roomId变化时，如果是群聊，则获取群组详情
    if (activeItem.type === RoomTypeEnum.GROUP) {
      fetchGroupDetail()
    }
  }
)

watch(
  () => groupStore.userList,
  () => {
    // 当群成员列表更新时，重新检查当前用户的权限
    if (activeItem.type === RoomTypeEnum.GROUP) {
      const currentUser = groupStore.userList.find((user) => user.uid === userStore.userInfo.uid)
      if (currentUser && currentUser.roleId) {
        groupDetail.value.role = currentUser.roleId
      }
    }
  },
  { deep: true }
)

watchEffect(() => {
  if (!messageOptions.value?.isLoading) {
    isLoading.value = false
    stream.value?.getVideoTracks()[0].addEventListener('ended', () => {
      stop()
    })
  }
})

// 处理复制账号
const handleCopy = () => {
  if (activeItem.account) {
    navigator.clipboard.writeText(activeItem.account)
    window.$message.success(`复制成功 ${activeItem.account}`)
  }
}

/** 处理创建群聊或邀请进群 */
const handleCreateGroupOrInvite = () => {
  if (activeItem.type === RoomTypeEnum.GROUP) {
    handleInvite()
  } else {
    handleCreateGroup()
  }
}

/** 处理创建群聊 */
const handleCreateGroup = () => {
  useMitt.emit(MittEnum.CREATE_GROUP, activeItem.id)
}

/** 处理邀请进群 */
const handleInvite = async () => {
  // 使用封装后的createModalWindow方法创建模态窗口
  await createModalWindow('邀请好友进群', 'modal-invite', 600, 500, 'home')
}

// 获取群组详情
const fetchGroupDetail = async () => {
  if (!activeItem.roomId || activeItem.type !== RoomTypeEnum.GROUP) return

  // 检查当前用户在userList中的角色
  const currentUser = groupStore.userList.find((user) => user.uid === userStore.userInfo.uid)

  groupDetail.value = {
    myNickname: groupStore.countInfo?.myName || '',
    groupRemark: groupStore.countInfo?.remark || '',
    // 优先使用userList中找到的角色信息，没有则使用countInfo中的role或默认值
    role: currentUser?.roleId || groupStore.countInfo?.role || RoleEnum.NORMAL
  }
  // 保存原始值，用于后续比较
  originalGroupDetail.value = {
    myNickname: groupStore.countInfo?.myName || '',
    groupRemark: groupStore.countInfo?.remark || ''
  }
}

// 更新群聊信息（昵称或备注）
const updateGroupInfo = (value: string, type: 'nickname' | 'remark') => {
  if (!activeItem.roomId || activeItem.type !== RoomTypeEnum.GROUP) return

  // 只更新本地值，不发送API请求
  if (type === 'nickname') {
    groupDetail.value.myNickname = value
  } else {
    groupDetail.value.groupRemark = value
  }
}

// 保存群聊信息
const saveGroupInfo = async () => {
  if (!activeItem.roomId || activeItem.type !== RoomTypeEnum.GROUP) return

  // 检查数据是否发生变化
  const nicknameChanged = groupDetail.value.myNickname !== originalGroupDetail.value.myNickname
  const remarkChanged = groupDetail.value.groupRemark !== originalGroupDetail.value.groupRemark

  // 只有当数据发生变化时才发送请求
  if (nicknameChanged || remarkChanged) {
    // 使用updateMyRoomInfo接口更新我在群里的昵称和群备注
    await apis.updateMyRoomInfo({
      id: activeItem.roomId,
      myName: groupDetail.value.myNickname,
      remark: groupDetail.value.groupRemark
    })

    // 更新原始值为当前值
    originalGroupDetail.value = {
      myNickname: groupDetail.value.myNickname,
      groupRemark: groupDetail.value.groupRemark
    }

    // 更新群聊缓存信息
    groupStore.countInfo = {
      ...groupStore.countInfo,
      myName: groupDetail.value.myNickname,
      remark: groupDetail.value.groupRemark
    }

    window.$message.success('群聊信息已更新')
  }
}

const handleMedia = () => {
  start().then(() => {
    // 将媒体流添加到RTCPeerConnection
    stream.value?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream.value!)
    })

    // 创建一个offer
    peerConnection.createOffer().then((offer) => {
      // 设置本地描述
      peerConnection.setLocalDescription(offer)
      emit(EventEnum.SHARE_SCREEN)
      /** 当需要给独立窗口传输数据的时候需要先监听窗口的创建完毕事件 */
      addListener(
        appWindow.listen('SharedScreenWin', async () => {
          await emit('offer', offer)
        })
      )
      // 在这里，你需要将offer发送给对方
      // 对方需要调用peerConnection.setRemoteDescription(offer)来接受屏幕共享
    })
  })
}

/** 置顶 */
const handleTop = (value: boolean) => {
  apis
    .setSessionTop({ roomId: activeItem.roomId, top: value })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.roomId, { top: value })
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
  if (activeItem.shield) {
    handleShield(false)
  }
  // 设置为消息免打扰时初始化为接收消息但不提醒
  if (value) {
    messageSettingType.value = 'notification'
  }
  apis
    .notification({
      roomId: activeItem.roomId,
      type: newType
    })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.roomId, {
        muteNotification: newType
      })

      // 如果从免打扰切换到允许提醒，需要重新计算全局未读数
      if (
        activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB &&
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
  apis
    .shield({
      roomId: activeItem.roomId,
      state: value
    })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.roomId, {
        shield: value
      })

      // 1. 先保存当前聊天室ID
      const tempRoomId = globalStore.currentSession.roomId

      // 2. 设置为空值，触发清除当前消息
      globalStore.currentSession.roomId = ''

      // 3. 在下一个tick中恢复原来的聊天室ID，触发重新加载消息
      nextTick(() => {
        globalStore.currentSession.roomId = tempRoomId
      })

      window.$message.success(value ? '已屏蔽消息' : '已取消屏蔽')
    })
    .catch(() => {
      window.$message.error('设置失败')
    })
}

const handleMessageSetting = (value: string) => {
  if (value === 'shield') {
    if (activeItem.shield) return
    handleShield(true)
  } else if (value === 'notification') {
    // 检查当前的消息提醒状态是否已经是免打扰
    const isCurrentlyMuted = activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB

    // 如果当前是屏蔽状态，需要先取消屏蔽
    if (activeItem.shield) {
      handleShield(false)
    }
    if (isCurrentlyMuted) return
    handleNotification(true)
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
  } else {
    tips.value = '确定后将删除本地聊天记录'
    optionsType.value = RoomActEnum.DELETE_RECORD
  }
}

const handleConfirm = () => {
  if (optionsType.value === RoomActEnum.DELETE_FRIEND && activeItem.id) {
    contactStore.onDeleteContact(activeItem.id).then(() => {
      modalShow.value = false
      sidebarShow.value = false
      window.$message.success('已删除好友')
    })
  } else if (optionsType.value === RoomActEnum.DISSOLUTION_GROUP) {
    if (activeItem.roomId === '1') {
      window.$message.warning('无法解散频道')
      modalShow.value = false
      return
    }

    groupStore.exitGroup(activeItem.roomId).then(() => {
      modalShow.value = false
      sidebarShow.value = false
      window.$message.success('已解散群聊')
      // 删除当前的会话
      useMitt.emit(MittEnum.DELETE_SESSION, activeItem.roomId)
    })
  } else if (optionsType.value === RoomActEnum.EXIT_GROUP) {
    if (activeItem.roomId === '1') {
      window.$message.warning('无法退出频道')
      modalShow.value = false
      return
    }

    groupStore.exitGroup(activeItem.roomId).then(() => {
      modalShow.value = false
      sidebarShow.value = false
      window.$message.success('已退出群聊')
      // 删除当前的会话
      useMitt.emit(MittEnum.DELETE_SESSION, activeItem.roomId)
    })
  }
}

const handleClick = () => {
  console.log(111)
}

// 开始编辑群名称
const startEditGroupName = () => {
  if (!isGroupOwner.value) return

  editingGroupName.value = activeItem.name
  isEditingGroupName.value = true

  // 在下一个事件循环中聚焦输入框
  nextTick(() => {
    groupNameInputRef.value?.focus()
  })
}

// 保存群名称
const saveGroupName = async () => {
  if (!isGroupOwner.value || !activeItem.roomId) return

  isEditingGroupName.value = false

  // 检查名称是否为空或超过12个字符
  const trimmedName = editingGroupName.value.trim()
  if (trimmedName === '') {
    window.$message.warning('群名称不能为空')
    return
  }

  if (trimmedName.length > 12) {
    window.$message.warning('群名称不能超过12个字符')
    return
  }

  // 检查名称是否有变化
  if (trimmedName !== activeItem.name) {
    try {
      // 调用更新群信息的API
      await apis.updateRoomInfo({
        id: activeItem.roomId,
        name: trimmedName,
        avatar: activeItem.avatar
      })

      // 更新本地会话状态
      chatStore.updateSession(activeItem.roomId, {
        name: trimmedName
      })

      window.$message.success('群名称已更新')
    } catch (error) {
      window.$message.error('群名称更新失败')
      console.error('更新群名称失败:', error)
    }
  }
}

// 处理上传头像
const handleUploadAvatar = () => {
  if (!isGroupOwner.value || !activeItem.roomId) return

  openFileSelector()
}

// 处理裁剪，调用hook中的方法
const handleCrop = async (cropBlob: Blob) => {
  await onCrop(cropBlob)
}

const closeMenu = (event: any) => {
  /** 点击非侧边栏元素时，关闭侧边栏，但点击弹出框元素、侧边栏图标、还有侧边栏里面的元素时不关闭 */
  if (!event.target.matches('.sidebar, .sidebar *, .n-modal-mask, .options-box *, .n-modal *') && !modalShow.value) {
    if (sidebarShow.value) {
      // 如果侧边栏正在显示，则在关闭前保存群聊信息
      saveGroupInfo()
    }
    sidebarShow.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
  if (!messageOptions.value?.isLoading) {
    isLoading.value = false
    showLoading.value = false
  }

  // 如果是群聊，初始化时获取群组详情
  if (activeItem.type === RoomTypeEnum.GROUP) {
    fetchGroupDetail()
  }
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
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
