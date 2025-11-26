<template>
  <n-flex vertical class="select-none">
    <n-flex align="center" justify="space-between" class="color-[--text-color] px-20px py-10px">
      <p class="text-16px">
        {{ t(props.type === 'friend' ? 'home.apply_list.friend_notice' : 'home.apply_list.group_notice') }}
      </p>
    </n-flex>

    <n-virtual-list
      style="max-height: calc(100vh / var(--page-scale, 1) - 80px)"
      :items="applyList"
      :item-size="102"
      :item-resizable="true"
      @scroll="handleScroll"
      ref="virtualListRef">
      <template #default="{ item }">
        <n-flex vertical :size="10" class="p-[10px_30px] box-border">
          <n-flex
            align="center"
            justify="space-between"
            :size="10"
            class="bg-[--center-bg-color] rounded-10px p-20px box-border border-(1px solid [--bg-popover])">
            <n-flex align="center" :size="10" class="min-w-0 flex-1">
              <n-avatar
                round
                size="large"
                :src="
                  props.type === 'friend'
                    ? avatarSrc(getUserInfo(item)?.avatar || '')
                    : avatarSrc(groupDetailsMap[item.roomId]?.avatar || '/default-group-avatar.png')
                "
                class="mr-10px" />
              <n-flex vertical :size="12" class="min-w-0 flex-1">
                <n-flex align="center" :size="10" class="min-w-0 flex-1 gap-10px">
                  <p
                    @click="
                      isCurrentUser(item.senderId) ? (currentUserId = item.operateId) : (currentUserId = item.senderId)
                    "
                    class="text-(14px #13987f) cursor-pointer shrink-0 max-w-150px truncate">
                    {{
                      item.eventType === NoticeType.GROUP_MEMBER_DELETE && item.operateId == item.receiverId
                        ? t('home.apply_list.you')
                        : getUserInfo(item)?.name || t('home.apply_list.unknown_user')
                    }}
                  </p>

                  <div class="flex items-center min-w-0 flex-1 gap-6px">
                    <p class="text-(14px [--text-color]) min-w-0 truncate whitespace-nowrap">
                      {{ applyMsg(item) }}
                    </p>

                    <p class="text-(10px #909090) shrink-0 whitespace-nowrap">{{ formatTimestamp(item.createTime) }}</p>
                  </div>
                </n-flex>
                <p
                  :title="t('home.apply_list.message_label') + item.content"
                  v-if="isFriendApplyOrGroupInvite(item)"
                  class="text-(12px [--text-color]) cursor-default w-340px truncate">
                  {{ t('home.apply_list.message_label') }}{{ item.content }}
                </p>
                <p v-else class="text-(12px [--text-color])">
                  {{
                    t('home.apply_list.handler_label', {
                      name: groupStore.getUserInfo(item.senderId)?.name || t('home.apply_list.unknown_user')
                    })
                  }}
                </p>
              </n-flex>
            </n-flex>

            <div v-if="isFriendApplyOrGroupInvite(item)" class="shrink-0 flex items-center gap-10px">
              <n-flex
                align="center"
                :size="10"
                class="shrink-0"
                v-if="item.status === RequestNoticeAgreeStatus.UNTREATED && !isCurrentUser(item.senderId)">
                <n-button secondary :loading="loadingMap[item.applyId]" @click="handleAgree(item)">
                  {{ t('home.apply_list.accept') }}
                </n-button>
                <n-dropdown
                  trigger="click"
                  :options="dropdownOptions"
                  @select="(key: string) => handleFriendAction(key, item.applyId)">
                  <n-icon class="cursor-pointer px-6px">
                    <svg class="size-16px color-[--text-color]">
                      <use href="#more"></use>
                    </svg>
                  </n-icon>
                </n-dropdown>
              </n-flex>
              <span class="text-(12px #64a29c)" v-else-if="item.status === RequestNoticeAgreeStatus.ACCEPTED">
                {{ t('home.apply_list.status.accepted') }}
              </span>
              <span class="text-(12px #c14053)" v-else-if="item.status === RequestNoticeAgreeStatus.REJECTED">
                {{ t('home.apply_list.status.rejected') }}
              </span>
              <span class="text-(12px #909090)" v-else-if="item.status === RequestNoticeAgreeStatus.IGNORE">
                {{ t('home.apply_list.status.ignored') }}
              </span>
              <span
                class="text-(12px #64a29c)"
                :class="{ 'text-(12px #c14053)': item.status === RequestNoticeAgreeStatus.REJECTED }"
                v-else-if="isCurrentUser(item.senderId)">
                {{
                  isAccepted(item)
                    ? t('home.apply_list.status.accepted')
                    : item.status === RequestNoticeAgreeStatus.REJECTED
                      ? t('home.apply_list.status.rejected_by_other')
                      : t('home.apply_list.status.pending')
                }}
              </span>
            </div>
          </n-flex>
        </n-flex>
      </template>
    </n-virtual-list>

    <!-- 空数据提示 -->
    <n-flex v-if="applyList.length === 0" vertical justify="center" align="center" class="py-40px">
      <n-empty
        :description="t(props.type === 'friend' ? 'home.apply_list.empty_friend' : 'home.apply_list.empty_group')" />
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { uniq } from 'es-toolkit'
import type { NoticeItem } from '@/services/types.ts'
import { NoticeType, RequestNoticeAgreeStatus } from '@/services/types.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useGroupStore } from '@/stores/group'
import { getGroupInfo } from '@/utils/ImRequestUtils'

const userStore = useUserStore()
const contactStore = useContactStore()
const groupStore = useGroupStore()
const { t } = useI18n()
const currentUserId = ref('0')
const loadingMap = ref<Record<string, boolean>>({})
const virtualListRef = ref()
const isLoadingMore = ref(false)
const props = defineProps<{
  type: 'friend' | 'group'
}>()

// 新增：存储群组信息的响应式对象
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

// 新增：获取群组信息的函数
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
const applyMsg = computed(() => (item: NoticeItem) => {
  if (props.type === 'friend') {
    return isCurrentUser(item.senderId)
      ? isAccepted(item)
        ? t('home.apply_list.friend.accepted_you')
        : t('home.apply_list.friend.pending')
      : t('home.apply_list.friend.request')
  }

  const groupDetail = groupDetailsMap.value[item.roomId]
  if (!groupDetail) {
    if (item.roomId && !loadingGroups.value.has(item.roomId)) {
      void getGroupDetail(item.roomId)
    }
    return t('home.apply_list.group.loading')
  }

  const groupName = groupDetail.name?.toString() ?? ''
  if (item.eventType === NoticeType.GROUP_APPLY) {
    return t('home.apply_list.group.apply', { group: groupName })
  }
  if (item.eventType === NoticeType.GROUP_INVITE) {
    const inviterName = item.operateId ? groupStore.getUserInfo(item.operateId)?.name : undefined
    return t('home.apply_list.group.invite', {
      name: inviterName ?? t('home.apply_list.unknown_user'),
      group: groupName
    })
  }
  if (isFriendApplyOrGroupInvite(item)) {
    return isCurrentUser(item.senderId)
      ? t('home.apply_list.group.invite_confirmed', { group: groupName })
      : t('home.apply_list.group.invite_you', { group: groupName })
  }
  if (item.eventType === NoticeType.GROUP_MEMBER_DELETE) {
    const operatorName = item.senderId ? groupStore.getUserInfo(item.senderId)?.name : undefined
    return t('home.apply_list.group.kicked', {
      operator: operatorName ?? t('home.apply_list.unknown_user'),
      group: groupName
    })
  }
  if (item.eventType === NoticeType.GROUP_SET_ADMIN) {
    return t('home.apply_list.group.set_admin', { group: groupName })
  }
  if (item.eventType === NoticeType.GROUP_RECALL_ADMIN) {
    return t('home.apply_list.group.remove_admin', { group: groupName })
  }
  return ''
})

// 下拉菜单选项
const dropdownOptions = computed(() => [
  {
    label: t('home.apply_list.dropdown.reject'),
    key: 'reject'
  },
  {
    label: t('home.apply_list.dropdown.ignore'),
    key: 'ignore'
  }
])

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

// 处理好友请求操作（拒绝或忽略）
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
  // 组件挂载时刷新一次列表
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
