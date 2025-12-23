<template>
  <n-flex vertical class="select-none">
    <n-flex
      v-if="props.closeHeader === true ? false : true"
      align="center"
      justify="space-between"
      class="color-[--text-color] px-20px py-10px">
      <p class="text-16px">
        {{
          props.type === 'friend' ? t('mobile_mymessage.notification.friend') : t('mobile_mymessage.notification.group')
        }}
      </p>
      <svg class="size-18px cursor-pointer">
        <use href="#delete"></use>
      </svg>
    </n-flex>

    <n-virtual-list
      :style="{
        maxHeight: props.customHeight
          ? props.customHeight + 'px'
          : 'max-height: calc(100vh / var(--page-scale, 1) - 80px)'
      }"
      :items="applyList"
      :item-size="87"
      :item-resizable="true"
      @scroll="handleScroll"
      ref="virtualListRef">
      <template #default="{ item }">
        <div class="flex gap-2 w-full text-14px mb-15px">
          <div class="flex h-full">
            <n-avatar
              round
              size="large"
              :src="
                props.type === 'friend'
                  ? avatarSrc(getUserInfo(item)?.avatar || '')
                  : avatarSrc(groupDetailsMap[item.roomId]?.avatar || '/default-group-avatar.png')
              " />
          </div>
          <div class="flex-1 flex flex-col gap-10px min-w-0">
            <div
              @click="isCurrentUser(item.senderId) ? (currentUserId = item.operateId) : (currentUserId = item.senderId)"
              class="flex justify-between text-14px text-#2DA38D">
              {{ getUserInfo(item)?.name || t('mobile_mymessage.unknown_user') }}
            </div>
            <div class="flex text-gray-500 text-12px min-w-0">
              <span class="truncate w-full block">
                {{ applyMsg(item) }}
              </span>
            </div>
            <div v-if="isFriendApplyOrGroupInvite(item)" class="flex gap-2 flex-1 text-12px text-gray-500 min-w-0">
              <div class="whitespace-nowrap flex-shrink-0">{{ t('mobile_mymessage.friend_request_message') }}</div>
              <n-ellipsis
                class="flex-1 min-w-0"
                :tooltip="true"
                expand-trigger="click"
                :line-clamp="1"
                style="max-width: 100%">
                {{ item.content }}
              </n-ellipsis>
            </div>
            <div v-else class="flex gap-2 flex-1 text-12px text-gray-500 min-w-0">
              <div class="whitespace-nowrap flex-shrink-0">处理人:</div>
              <n-ellipsis
                class="flex-1 min-w-0"
                :tooltip="true"
                expand-trigger="click"
                :line-clamp="1"
                style="max-width: 100%">
                {{ groupStore.getUserInfo(item.senderId)?.name || t('mobile_mymessage.unknown_user') }}
              </n-ellipsis>
            </div>
          </div>
          <div
            v-if="isFriendApplyOrGroupInvite(item)"
            class="flex min-w-70px w-70px max-h-64px flex-col items-center justify-center flex-shrink-0">
            <n-flex
              align="center"
              :size="10"
              v-if="item.status === RequestNoticeAgreeStatus.UNTREATED && !isCurrentUser(item.senderId)">
              <n-button size="small" secondary :loading="loadingMap[item.applyId]" @click="handleAgree(item)">
                {{ t('mobile_mymessage.accept') }}
              </n-button>
            </n-flex>
            <n-dropdown
              trigger="click"
              :options="dropdownOptions"
              @select="(key: string) => handleFriendAction(key, item.applyId)"
              v-if="item.status === RequestNoticeAgreeStatus.UNTREATED && !isCurrentUser(item.senderId)">
              <n-icon class="cursor-pointer px-15px py-3px rounded-5px mt-10px bg-gray-300 h-50% items-center flex">
                <svg class="size-16px color-[--text-color]">
                  <use href="#more"></use>
                </svg>
              </n-icon>
            </n-dropdown>
            <span class="text-(12px #64a29c)" v-else-if="item.status === RequestNoticeAgreeStatus.ACCEPTED">
              {{ t('mobile_mymessage.approved') }}
            </span>
            <span class="text-(12px #c14053)" v-else-if="item.status === RequestNoticeAgreeStatus.REJECTED">
              {{ t('mobile_mymessage.refused') }}
            </span>
            <span class="text-(12px #909090)" v-else-if="item.status === RequestNoticeAgreeStatus.IGNORE">
              {{ t('mobile_mymessage.ignored') }}
            </span>
            <span
              class="text-(12px #64a29c)"
              :class="{ 'text-(12px #c14053)': item.status === RequestNoticeAgreeStatus.REJECTED }"
              v-else-if="isCurrentUser(item.senderId)">
              {{
                isAccepted(item)
                  ? t('mobile_mymessage.agreed')
                  : item.status === RequestNoticeAgreeStatus.REJECTED
                    ? t('mobile_mymessage.declined')
                    : t('mobile_mymessage.pending')
              }}
            </span>
          </div>
        </div>
      </template>
    </n-virtual-list>

    <!-- 空数据提示 -->
    <n-flex v-if="applyList.length === 0" vertical justify="center" align="center" class="py-40px">
      <n-empty
        :description="
          props.type === 'friend' ? t('mobile_mymessage.empty_require') : t('mobile_mymessage.empty_group_require')
        " />
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { uniq } from 'es-toolkit'
import type { NoticeItem } from '@/services/types.ts'
import { NoticeType, RequestNoticeAgreeStatus } from '@/services/types.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useGroupStore } from '@/stores/group'
import { getGroupInfo } from '@/utils/ImRequestUtils'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const contactStore = useContactStore()
const groupStore = useGroupStore()
const currentUserId = ref('0')
const loadingMap = ref<Record<string, boolean>>({})
const isLoadingMore = ref(false)
const props = defineProps<{
  type: 'friend' | 'group'
  customHeight?: number
  closeHeader?: boolean
}>()

// 存储群组信息的响应式对象
const groupDetailsMap = ref<Record<string, any>>({})
const loadingGroups = ref<Set<string>>(new Set())

// 检查好友申请是否已被接受
const isAccepted = (item: any) => {
  return item.status !== RequestNoticeAgreeStatus.UNTREATED
}

const applyList = computed(() => {
  return contactStore.requestFriendsList.filter((item) => {
    if (props.type === 'friend') {
      return item.type === 2
    } else {
      return item.type === 1
    }
  })
})

// 获取群组信息的函数
const getGroupDetail = async (roomId: string) => {
  if (!roomId) return null

  // 如果已经在加载中，直接返回
  if (loadingGroups.value.has(roomId)) {
    return null
  }

  // 如果已经有缓存，直接返回
  if (groupDetailsMap.value[roomId]) {
    return groupDetailsMap.value[roomId]
  }

  // 开始加载
  loadingGroups.value.add(roomId)
  try {
    const groupInfo = await getGroupInfo(roomId)
    if (groupInfo) {
      groupDetailsMap.value[roomId] = groupInfo
      return groupInfo
    }
  } catch (error) {
    console.error('获取群组信息失败:', error)
  } finally {
    loadingGroups.value.delete(roomId)
  }

  return null
}

// 异步获取群组信息的计算属性
const applyMsg = computed(() => (item: any) => {
  if (props.type === 'friend') {
    return isCurrentUser(item.senderId)
      ? isAccepted(item)
        ? t('mobile_mymessage.friend_request_status.accepted')
        : t('mobile_mymessage.friend_request_status.verifying')
      : t('mobile_mymessage.friend_request_status.sent')
  } else {
    const groupDetail = groupDetailsMap.value[item.roomId]
    if (!groupDetail) {
      if (item.roomId && !loadingGroups.value.has(item.roomId)) {
        getGroupDetail(item.roomId)
      }
      return t('mobile_mymessage.loading', { tail: '...' })
    }

    if (item.eventType === NoticeType.GROUP_APPLY) {
      return t('mobile_mymessage.group.apply_to_join', { name: groupDetail.name })
    } else if (item.eventType === NoticeType.GROUP_INVITE) {
      const inviter = groupStore.getUserInfo(item.operateId)?.name || t('mobile_mymessage.unknown_user')
      return t('mobile_mymessage.group.invited_to_join', { inviter, group: groupDetail.name })
    } else if (isFriendApplyOrGroupInvite(item)) {
      return isCurrentUser(item.senderId)
        ? t('mobile_mymessage.group.joined_group', { group: groupDetail.name })
        : t('mobile_mymessage.group.invited_curr_to_join', { group: groupDetail.name })
    } else if (item.eventType === NoticeType.GROUP_MEMBER_DELETE) {
      const operator = groupStore.getUserInfo(item.senderId)?.name || t('mobile_mymessage.unknown_user')
      return t('mobile_mymessage.group.kicked_out', { operator, group: groupDetail.name })
    } else if (item.eventType === NoticeType.GROUP_SET_ADMIN) {
      return t('mobile_mymessage.group.set_as_admin', { group: groupDetail.name })
    } else if (item.eventType === NoticeType.GROUP_RECALL_ADMIN) {
      return t('mobile_mymessage.group.removed_as_admin', { group: groupDetail.name })
    }
  }
})

// 下拉菜单选项
const dropdownOptions = [
  {
    label: t('mobile_mymessage.menu.decline'),
    key: 'reject'
  },
  {
    label: t('mobile_mymessage.menu.decline'),
    key: 'ignore'
  }
]

const avatarSrc = (url: string) => AvatarUtils.getAvatarUrl(url)

// 判断是否为当前登录用户
const isCurrentUser = (uid: string) => {
  return uid === userStore.userInfo!.uid
}

/**
 * 获取当前用户查询视角
 * @param item 通知消息
 */
const getUserInfo = (item: any) => {
  switch (item.eventType) {
    case NoticeType.FRIEND_APPLY:
    case NoticeType.GROUP_MEMBER_DELETE:
    case NoticeType.GROUP_SET_ADMIN:
    case NoticeType.GROUP_RECALL_ADMIN:
      return groupStore.getUserInfo(item.operateId)
    case NoticeType.ADD_ME:
    case NoticeType.GROUP_INVITE:
    case NoticeType.GROUP_INVITE_ME:
    case NoticeType.GROUP_APPLY:
      return groupStore.getUserInfo(item.senderId)
  }
}

// 判断是否为好友申请或者群申请、群邀请
const isFriendApplyOrGroupInvite = (item: any) => {
  return (
    item.eventType === NoticeType.FRIEND_APPLY ||
    item.eventType === NoticeType.GROUP_APPLY ||
    item.eventType === NoticeType.GROUP_INVITE ||
    item.eventType === NoticeType.GROUP_INVITE_ME ||
    item.eventType === NoticeType.ADD_ME
  )
}

// 处理滚动事件
const handleScroll = (e: Event) => {
  if (isLoadingMore.value) return

  const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLElement
  // 当滚动到距离底部20px以内时触发加载更多
  if (scrollHeight - scrollTop - clientHeight < 20) {
    loadMoreFriendRequests()
  }
}

// 加载更多好友申请
const loadMoreFriendRequests = async () => {
  // 如果已经是最后一页或正在加载中，则不再加载
  if (contactStore.applyPageOptions.isLast) {
    return
  }

  isLoadingMore.value = true
  try {
    await contactStore.getApplyPage(props.type, false)
  } finally {
    isLoadingMore.value = false
  }
}

const handleAgree = async (item: NoticeItem) => {
  const applyId = item.applyId
  loadingMap.value[applyId] = true
  try {
    await contactStore.onHandleInvite({
      applyId,
      state: RequestNoticeAgreeStatus.ACCEPTED,
      roomId: item.roomId,
      type: item.type,
      applyType: props.type,
      markAsRead: true
    })
  } finally {
    setTimeout(() => {
      loadingMap.value[applyId] = false
    }, 600)
  }
}

// 处理好友请求操作
const handleFriendAction = async (action: string, applyId: string) => {
  loadingMap.value[applyId] = true
  try {
    if (action === 'reject') {
      await contactStore.onHandleInvite({
        applyId,
        state: RequestNoticeAgreeStatus.REJECTED,
        applyType: props.type,
        markAsRead: true
      })
    } else if (action === 'ignore') {
      await contactStore.onHandleInvite({
        applyId,
        state: RequestNoticeAgreeStatus.IGNORE,
        applyType: props.type,
        markAsRead: true
      })
    }
  } finally {
    setTimeout(() => {
      loadingMap.value[applyId] = false
    }, 600)
  }
}

onMounted(() => {
  contactStore.getApplyPage(props.type, true)
})

// 监听applyList变化，批量加载群组信息
watch(
  () => applyList.value,
  (newList) => {
    const roomIds = uniq(newList.filter((item) => item.roomId && Number(item.roomId) > 0).map((item) => item.roomId))

    if (roomIds.length > 0) {
      // 批量加载群组信息
      roomIds.forEach((roomId) => {
        if (!groupDetailsMap.value[roomId] && !loadingGroups.value.has(roomId)) {
          getGroupDetail(roomId)
        }
      })
    }
  },
  { immediate: true, deep: true }
)
</script>

<style scoped lang="scss"></style>
