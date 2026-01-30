<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        border
        :hidden-right="true"
        :room-name="t('mobile_chat_setting.title', { t: title })" />
    </template>

    <template #container>
      <div class="flex flex-col overflow-auto h-full relative">
        <img
          src="@/assets/mobile/chat-home/background.webp"
          class="absolute fixed top-0 left-0 w-full h-full z-0 dark:opacity-20" />
        <div class="flex flex-col gap-15px py-15px px-20px flex-1 min-h-0 z-1">
          <n-card size="small" embedded class="rounded-10px p-0" content-class="p-0!">
            <div class="flex py-10px rounded-10px w-full items-center gap-10px" @click="clickInfo">
              <!-- 群头像 -->
              <div class="flex justify-center">
                <div class="rounded-full relative bg-white w-38px h-38px overflow-hidden" style="margin-left: 10px">
                  <n-avatar
                    class="absolute"
                    :size="38"
                    :src="AvatarUtils.getAvatarUrl(activeItem?.avatar || '')"
                    fallback-src="/logo.png"
                    :style="{
                      'object-fit': 'cover',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }"
                    round />
                </div>
                <input
                  v-if="isGroup"
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="handleFileChange" />
                <AvatarCropper
                  ref="cropperRef"
                  v-model:show="showCropper"
                  :image-url="localImageUrl"
                  @crop="handleCrop" />
              </div>

              <div class="text-14px flex items-center h-full gap-5px">
                <span>
                  {{ activeItem?.name || '' }}
                </span>
                <span v-if="activeItem?.hotFlag === 1">
                  <svg class="w-18px h-18px iconpark-icon text-#1A9B83">
                    <use href="#auth"></use>
                  </svg>
                </span>
              </div>
            </div>
          </n-card>
          <!-- 群成员  -->
          <n-card
            v-if="isGroup"
            class="rounded-10px"
            content-class="p-[15px_15px_0px_15px]!"
            header-class="text-14px! p-[15px_15px_0px_15px]!"
            :title="t('mobile_chat_setting.group_members_title')">
            <template #header-extra>
              <div @click="toGroupChatMember" class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                <i18n-t keypath="mobile_chat_setting.member_count">
                  <template #count>
                    <span class="text-#398D7E">{{ groupStore.countInfo?.memberNum || 0 }}</span>
                  </template>
                </i18n-t>

                <div>
                  <svg class="w-14px h-14px iconpark-icon">
                    <use href="#right"></use>
                  </svg>
                </div>
              </div>
            </template>
            <div class="py-15px px-5px grid grid-cols-5 gap-15px text-12px">
              <div
                @click="toFriendInfo(i.uid)"
                v-for="i in groupMemberListSliced"
                :key="i.uid"
                class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full relative bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <!-- 蒙板 -->
                  <div
                    v-if="i.activeStatus !== OnlineEnum.ONLINE"
                    class="w-36px h-36px absolute rounded-full bg-#707070 opacity-70 z-4"></div>
                  <n-avatar class="absolute z-3" :size="36" :src="avatarSrc(i.avatar)" fallback-src="/logo.png" round />
                </div>
                <div class="truncate max-w-full text-#707070">{{ i.name }}</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px cursor-pointer">
                <n-button strong secondary circle @click="toInviteGroupMember">
                  <svg class="iconpark-icon h-25px w-25px dark:opacity-40">
                    <use href="#plus"></use>
                  </svg>
                </n-button>
                <div>{{ t('mobile_chat_setting.group_invite_member') }}</div>
              </div>
            </div>
          </n-card>

          <!-- 管理群成员 -->
          <div
            v-if="isGroup && groupStore.isAdminOrLord() && globalStore.currentSessionRoomId !== '1'"
            class="bg-white p-15px rounded-10px shadow text-14px flex cursor-pointer"
            @click="toManageGroupMember">
            {{ t('mobile_chat_setting.manage_group_members') }}
          </div>

          <n-card class="rounded-10px" content-class="p-15px!" @click="handleSearchChatContent">
            {{ t('mobile_chat_setting.search_history') }}
          </n-card>
          <!-- 群公告 -->
          <n-card
            class="rounded-10px"
            header-class="text-14px! p-15px!"
            :segmented="{ content: true, footer: 'soft' }"
            content-class="p-15px!">
            <template #header>
              <div @click="handleCopy(activeItem?.account || '')" class="flex justify-between items-center">
                <div class="text-14px">
                  {{
                    t('mobile_chat_setting.id_card.qr_code_label', {
                      t: isGroup
                        ? t('mobile_chat_setting.id_card.type.group')
                        : t('mobile_chat_setting.id_card.type.single_chat')
                    })
                  }}
                </div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <div>{{ activeItem?.account || '' }}</div>
                  <div>
                    <svg class="w-14px h-14px iconpark-icon">
                      <use href="#saoma-i3589iic"></use>
                    </svg>
                  </div>
                </div>
              </div>
            </template>
            <!-- 公告内容 -->
            <div @click="goToNotice" v-if="isGroup" class="flex flex-col text-14px gap-10px">
              <div>{{ t('mobile_chat_setting.group_notice.title') }}</div>
              <div class="text-#707070 line-clamp-2 text-12px line-height-20px">
                {{ announList.length > 0 ? announList[0]?.content : '' }}
              </div>
            </div>

            <!-- v-if="isGroup && groupStore.isAdminOrLord()"  -->
            <div class="flex justify-between py-15px items-center">
              <div class="text-14px">{{ t('mobile_chat_setting.group_name') }}</div>
              <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                <n-input
                  size="small"
                  style="border: none; text-align: right; outline: none; text-align: right"
                  v-model:value="nameValue"
                  @blur="handleGroupInfoUpdate"
                  :placeholder="t('mobile_chat_setting.input.group_name')" />
              </div>
            </div>

            <div v-if="isGroup" class="flex justify-between py-15px items-center">
              <div class="text-14px">{{ t('mobile_chat_setting.group_alias') }}</div>
              <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                <n-input
                  size="small"
                  style="border: none; text-align: right; outline: none; text-align: right"
                  v-model="nicknameValue"
                  @blur="handleInfoUpdate"
                  :placeholder="t('mobile_chat_setting.input.group_alias')" />
              </div>
            </div>
          </n-card>

          <!-- 备注 -->
          <div class="w-full flex flex-col gap-15px rounded-10px">
            <div class="ps-15px text-14px">
              <span class="dark:text-white">{{ t('mobile_chat_setting.remark') }}</span>
              <span class="text-#6E6E6E ml-1">{{ t('mobile_chat_setting.remar_kprivate_visible') }}</span>
            </div>
            <n-input
              v-model="remarkValue"
              size="large"
              :placeholder="t('mobile_chat_setting.input.remark')"
              @blur="handleInfoUpdate" />
          </div>
          <n-card
            class="rounded-10px"
            content-class="p-15px!"
            header-class="p-15px! text-14px!"
            :title="t('mobile_chat_setting.setting_type', { t: title })">
            <div class="flex justify-between items-center">
              <div class="text-14px">{{ t('mobile_chat_setting.pintop') }}</div>
              <n-switch :value="!!activeItem?.top" @update:value="handleTop" />
            </div>
            <n-divider />
            <div class="flex justify-between py-12px items-center">
              <div class="text-14px">{{ t('mobile_chat_setting.silent') }}</div>
              <n-switch
                @update:value="handleNotification"
                :value="activeItem?.muteNotification === NotificationTypeEnum.NOT_DISTURB" />
            </div>
          </n-card>
          <n-button
            strong
            secondary
            circle
            size="large"
            class="cursor-pointer text-red text-14px rounded-10px w-full mb-20px">
            {{ t('mobile_chat_setting.delete_chat_history') }}
          </n-button>
          <div class="mt-auto flex justify-center mb-20px">
            <!-- 解散群聊、退出群聊、删除好友按钮 -->
            <n-button
              class="w-full"
              v-if="isGroup && globalStore.currentSessionRoomId !== '1'"
              strong
              secondary
              round
              type="error"
              size="large"
              @click="handleExit">
              {{
                isGroup
                  ? isLord
                    ? t('mobile_chat_setting.disband_group')
                    : t('mobile_chat_setting.leave_group')
                  : t('mobile_chat_setting.delete_friend')
              }}
            </n-button>
            <!-- 保留底部空间 -->
            <div class="h-1px"></div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { MittEnum, NotificationTypeEnum, OnlineEnum, RoleEnum, RoomTypeEnum } from '@/enums'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useMitt } from '@/hooks/useMitt.ts'
import { useMyRoomInfoUpdater } from '@/hooks/useMyRoomInfoUpdater'
import router from '@/router'
import type { UserItem } from '@/services/types'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import {
  deleteFriend,
  getGroupDetail,
  modifyFriendRemark,
  notification,
  setSessionTop,
  shield,
  updateRoomInfo
} from '@/utils/ImRequestUtils'
import { toFriendInfoPage } from '@/utils/RouterUtils'
import { useI18n, I18nT } from 'vue-i18n'

defineOptions({
  name: 'mobileChatSetting'
})

const { t } = useI18n()

const dialog = useDialog()
const userStore = useUserStore()
const chatStore = useChatStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const cacheStore = useCachedStore()
const contactStore = useContactStore()
const { currentSessionRoomId } = storeToRefs(globalStore)
const { persistMyRoomInfo } = useMyRoomInfoUpdater()

const title = computed(() =>
  isGroup.value ? t('mobile_chat_setting.type.group') : t('mobile_chat_setting.type.single_chat')
)
const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)

const isLord = computed(() => {
  const currentUser = groupStore.userList.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.LORD
})
const isAdmin = computed(() => {
  const currentUser = groupStore.userList.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.ADMIN
})

const groupMemberListSliced = computed(() => {
  const list = groupStore.memberList.slice(0, 9)
  return list
})

const avatarSrc = (url: string) => AvatarUtils.getAvatarUrl(url)

const announError = ref(false)
const announNum = ref(0)
const isAddAnnoun = ref(false)
const announList = ref<any[]>([])
const remarkValue = ref('')
const item = ref<any>(null)
const nameValue = ref('')
const avatarValue = ref('')
const nicknameValue = ref('')
const options = ref<Array<{ name: string; src: string }>>([])
const { currentSession: activeItem } = storeToRefs(globalStore)
const friend = computed(() => contactStore.contactsList.find((item) => item.uid === activeItem.value?.detailId))

// 保存初始值，用于判断是否真正修改了内容
const initialRemarkValue = ref('')
const initialNicknameValue = ref('')
const initialNameValue = ref('')

const {
  fileInput,
  localImageUrl,
  showCropper,
  cropperRef,
  openAvatarCropper,
  handleFileChange,
  handleCrop: onCrop
} = useAvatarUpload({
  onSuccess: async (downloadUrl) => {
    avatarValue.value = downloadUrl
  }
})

const handleCrop = async (cropBlob: Blob) => {
  await onCrop(cropBlob)
}

const handleCopy = (val: string) => {
  if (val) {
    navigator.clipboard.writeText(val)
    window.$message.success(t('mobile_chat_setting.copy_id', { id: val }))
  }
}

const toFriendInfo = (uid: string) => {
  toFriendInfoPage(uid)
}

const toGroupChatMember = () => {
  router.push({ name: 'mobileGroupChatMember' })
}

const toInviteGroupMember = () => {
  router.push({ name: 'mobileInviteGroupMember' })
}

const toManageGroupMember = () => {
  router.push({ name: 'manageGroupMember' })
}

const goToNotice = () => {
  router.push({
    path: '/mobile/chatRoom/notice',
    query: {
      announList: JSON.stringify(announList.value),
      roomId: globalStore.currentSessionRoomId
    }
  })
}

// 退出登录逻辑
async function handleExit() {
  dialog.error({
    title: '提示',
    content: isGroup.value
      ? isLord.value
        ? t('mobile_chat_setting.confirm_disband_group')
        : t('mobile_chat_setting.confirm_leave_group')
      : t('mobile_chat_setting.confirm_delete_friend'),
    positiveText: t('components.common.confirm'),
    negativeText: t('components.common.cancel'),
    onPositiveClick: async () => {
      const session = activeItem.value
      if (!session) {
        window.$message.warning(t('mobile_chat_setting.session_not_exist'))
        return
      }
      try {
        if (isGroup.value) {
          if (isLord.value) {
            if (currentSessionRoomId.value === '1') {
              window.$message.warning(t('mobile_chat_setting.disband_channel_failed'))
              return
            }

            groupStore.exitGroup(currentSessionRoomId.value).then(() => {
              window.$message.success(t('mobile_chat_setting.group_disbanded'))
              // 删除当前的会话
              useMitt.emit(MittEnum.DELETE_SESSION, currentSessionRoomId.value)
            })
          } else {
            if (currentSessionRoomId.value === '1') {
              window.$message.warning(t('mobile_chat_setting.leave_channel_failed'))
              return
            }

            groupStore.exitGroup(currentSessionRoomId.value).then(() => {
              window.$message.success(t('mobile_chat_setting.group_left'))
              // 删除当前的会话
              useMitt.emit(MittEnum.DELETE_SESSION, currentSessionRoomId.value)
            })
          }
        } else {
          const detailId = session.detailId
          if (!detailId) {
            window.$message.warning(t('mobile_chat_setting.get_friend_info_failed'))
            return
          }
          await deleteFriend({ targetUid: detailId })
          window.$message.success(t('mobile_chat_setting.delete_friend_success'))
        }

        router.push('/mobile/message')
      } catch (error) {
        console.error('创建登录窗口失败:', error)
      }
    },
    onNegativeClick: () => {
      console.log('用户点击了取消')
    }
  })
}

/** 判断当前用户是否拥有id为6的徽章 并且是频道 */
const hasBadge6 = computed(() => {
  // 只有当 roomId 为 "1" 时才进行徽章判断（频道）
  if (globalStore.currentSessionRoomId !== '1') return false

  const currentUser = groupStore.getUserInfo(userStore.userInfo!.uid!)!
  return currentUser?.itemIds?.includes('6')
})

const clickInfo = () => {
  if (isGroup) {
    openAvatarCropper()
  } else {
    const detailId = activeItem.value?.detailId
    if (!detailId) {
      window.$message.warning(t('mobile_chat_setting.session_not_ready'))
      return
    }
    router.push(`/mobile/mobileFriends/friendInfo/${detailId}`)
  }
}
/**
 * 加载群公告
 */
const handleLoadGroupAnnoun = async () => {
  try {
    const roomId = globalStore.currentSessionRoomId
    if (!roomId) {
      console.error('当前会话没有roomId')
      return
    }
    // 设置是否可以添加公告
    isAddAnnoun.value = isLord.value || isAdmin.value || hasBadge6.value!
    // 获取群公告列表
    const data = await cacheStore.getGroupAnnouncementList(roomId, 1, 10)
    if (data) {
      announList.value = data.records
      // 处理置顶公告
      if (announList.value && announList.value.length > 0) {
        const topAnnouncement = announList.value.find((item: any) => item.top)
        if (topAnnouncement) {
          announList.value = [topAnnouncement, ...announList.value.filter((item: any) => !item.top)]
        }
      }
      announNum.value = parseInt(data.total, 10)
      announError.value = false
    } else {
      announError.value = false
    }
  } catch (error) {
    console.error('加载群公告失败:', error)
    announError.value = true
  }
}

/** 置顶 */
const handleTop = (value: boolean) => {
  const session = activeItem.value
  if (!session) return
  setSessionTop({ roomId: currentSessionRoomId.value, top: value })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(currentSessionRoomId.value, { top: value })
      window.$message.success(
        value ? t('mobile_chat_setting.pinned_success') : t('mobile_chat_setting.unpinned_success')
      )
    })
    .catch(() => {
      window.$message.error(t('mobile_chat_setting.pin_failed'))
    })
}

// 处理群备注更新
const handleInfoUpdate = async () => {
  // 检查是否真正修改了内容
  const remarkChanged = remarkValue.value !== initialRemarkValue.value
  const nicknameChanged = nicknameValue.value !== initialNicknameValue.value

  // 如果群聊和单聊的备注、昵称都没有改变，则不调用接口
  if (!remarkChanged && !nicknameChanged) {
    return
  }

  if (isGroup.value) {
    await persistMyRoomInfo({
      roomId: globalStore.currentSessionRoomId,
      remark: remarkValue.value,
      myName: nicknameValue.value
    })
    // 更新初始值
    initialRemarkValue.value = remarkValue.value
    initialNicknameValue.value = nicknameValue.value
  } else {
    // 单聊只检查备注是否修改
    if (!remarkChanged) {
      return
    }

    const detailId = activeItem.value?.detailId
    if (!detailId) {
      window.$message.warning(t('mobile_chat_setting.get_friend_info_failed'))
      return
    }
    await modifyFriendRemark({
      targetUid: detailId,
      remark: remarkValue.value
    })

    if (friend.value) {
      friend.value.remark = remarkValue.value
    }
    // 更新初始值
    initialRemarkValue.value = remarkValue.value
  }

  window.$message.success(t('mobile_chat_setting.remark_updated', { n: title.value }))
}

// 处理群名称更新
const handleGroupInfoUpdate = async () => {
  const session = activeItem.value
  if (!session) return
  // 检查群名称是否真正修改了
  if (nameValue.value === initialNameValue.value) {
    return
  }

  await updateRoomInfo({
    id: currentSessionRoomId.value,
    name: nameValue.value,
    avatar: avatarValue.value
  })
  session.avatar = avatarValue.value

  // 更新初始值
  initialNameValue.value = nameValue.value
  window.$message.success(t('mobile_chat_setting.group_name_updated'))
}

// 获取群组详情和成员信息
const fetchGroupMembers = async (roomId: string) => {
  try {
    // 使用每个成员的uid获取详细信息
    const userList = groupStore.getUserListByRoomId(roomId)
    const memberDetails = userList.map((member: UserItem) => {
      const userInfo = groupStore.getUserInfo(member.uid)!
      return {
        name: userInfo.name || member.name || member.uid,
        src: userInfo.avatar || member.avatar
      }
    })

    options.value = memberDetails
  } catch (error) {
    console.error('获取群成员失败:', error)
  }
}

/**
 *
 * 消息免打扰相关功能
 *
 *
 */

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

      window.$message.success(
        value ? t('mobile_chat_setting.messages_muted') : t('mobile_chat_setting.messages_unmuted')
      )
    })
    .catch(() => {
      window.$message.error(t('mobile_chat_setting.setting_failed'))
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

      window.$message.success(
        value ? t('mobile_chat_setting.notifications_silent') : t('mobile_chat_setting.notifications_enabled')
      )
    })
    .catch(() => {
      window.$message.error(t('mobile_chat_setting.setting_failed'))
    })
}

/**
 *
 * 消息免打扰相关功能（结束）
 *
 *  */

/** 处理查找聊天内容 */
const handleSearchChatContent = () => {
  router.push({
    name: 'mobileSearchChatContent'
  })
}

/**
 * 这里直接监听状态的值
 */
onMounted(async () => {
  await handleLoadGroupAnnoun()
  if (isGroup.value) {
    await getGroupDetail(globalStore.currentSessionRoomId)
      .then((response: any) => {
        item.value = response
        nameValue.value = response.groupName || ''
        avatarValue.value = response.avatar
        nicknameValue.value = response.myName || ''
        remarkValue.value = response.remark || ''

        // 保存初始值
        initialNameValue.value = nameValue.value
        initialNicknameValue.value = nicknameValue.value
        initialRemarkValue.value = remarkValue.value
        if (item.value && item.value.roomId) {
          fetchGroupMembers(item.value.roomId)
        }
      })
      .catch((e: any) => {
        console.error('获取群组详情失败:', e)
      })
  } else {
    // 这里需要拿到好友的信息
    remarkValue.value = friend.value?.remark || ''
    // 保存初始值
    initialRemarkValue.value = remarkValue.value
  }
})
</script>

<style scoped></style>
