<template>
  <n-flex vertical class="select-none">
    <n-flex align="center" justify="space-between" class="color-[--text-color] px-20px py-10px">
      <p class="text-16px">{{ props.type === 'friend' ? '好友通知' : '群通知' }}</p>
      <svg class="size-18px cursor-pointer">
        <use href="#delete"></use>
      </svg>
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
            class="bg-[--center-bg-color] rounded-10px p-20px box-border border-(1px solid [--bg-popover])">
            <n-flex align="center" :size="10">
              <n-avatar round size="large" :src="avatarSrc(getUserInfo(item)!.avatar!)" class="mr-10px" />
              <n-flex vertical :size="12">
                <n-flex align="center" :size="10">
                  <p
                    @click="
                      isCurrentUser(item.senderId) ? (currentUserId = item.operateId) : (currentUserId = item.senderId)
                    "
                    class="text-(14px #13987f) cursor-pointer">
                    {{
                      item.eventType === NoticeType.GROUP_MEMBER_DELETE && item.operateId == item.receiverId
                        ? '你'
                        : getUserInfo(item)!.name
                    }}
                  </p>

                  <p class="text-(14px [--text-color])">
                    {{ applyMsg(item) }}
                  </p>

                  <p class="text-(10px #909090)">{{ formatTimestamp(item.createTime) }}</p>
                </n-flex>
                <p v-show="isFriendApplyOrGroupInvite(item)" class="text-(12px [--text-color])">
                  留言：{{ item.content }}
                </p>
              </n-flex>
            </n-flex>

            <div v-if="isFriendApplyOrGroupInvite(item)">
              <n-flex
                align="center"
                :size="10"
                v-if="item.status === RequestNoticeAgreeStatus.UNTREATED && !isCurrentUser(item.senderId)">
                <n-button secondary :loading="loadingMap[item.applyId]" @click="handleAgree(item.applyId)">
                  接受
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
                已同意
              </span>
              <span class="text-(12px #c14053)" v-else-if="item.status === RequestNoticeAgreeStatus.REJECTED">
                已拒绝
              </span>
              <span class="text-(12px #909090)" v-else-if="item.status === RequestNoticeAgreeStatus.IGNORE">
                已忽略
              </span>
              <span
                class="text-(12px #64a29c)"
                :class="{ 'text-(12px #c14053)': item.status === RequestNoticeAgreeStatus.REJECTED }"
                v-else-if="isCurrentUser(item.senderId)">
                {{
                  isAccepted(item)
                    ? '已同意'
                    : item.status === RequestNoticeAgreeStatus.REJECTED
                      ? '对方已拒绝'
                      : '等待验证'
                }}
              </span>
            </div>
          </n-flex>
        </n-flex>
      </template>
    </n-virtual-list>

    <!-- 空数据提示 -->
    <n-flex v-if="applyList.length === 0" vertical justify="center" align="center" class="py-40px">
      <n-empty :description="props.type === 'friend' ? '暂无好友申请' : '暂无群通知'" />
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { NoticeType, RequestNoticeAgreeStatus } from '@/services/types.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useGroupStore } from '~/src/stores/group'

const userStore = useUserStore()
const contactStore = useContactStore()
const groupStore = useGroupStore()
const currentUserId = ref('0')
const loadingMap = ref<Record<string, boolean>>({})
const virtualListRef = ref()
const isLoadingMore = ref(false)
const props = defineProps<{
  type: 'friend' | 'group'
}>()

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

const applyMsg = computed(() => (item: any) => {
  if (props.type === 'friend') {
    return isCurrentUser(item.senderId) ? (isAccepted(item) ? '已同意你的请求' : '正在验证你的邀请') : '请求加为好友'
  } else {
    if (isFriendApplyOrGroupInvite(item)) {
      return isCurrentUser(item.senderId) ? '已同意加入' + item.content : '邀请你加入' + item.content
    } else if (item.eventType === NoticeType.GROUP_MEMBER_DELETE) {
      return '已被' + groupStore.getUserInfo(item.senderId)!.name + '踢出' + item.content
    } else if (item.eventType === NoticeType.GROUP_SET_ADMIN) {
      return '已被' + groupStore.getUserInfo(item.senderId)!.name + '设置为' + item.content + '的管理员'
    } else if (item.eventType === NoticeType.GROUP_RECALL_ADMIN) {
      return '已被' + groupStore.getUserInfo(item.senderId)!.name + '取消' + item.content + '的管理员权限'
    }
  }
})

// 下拉菜单选项
const dropdownOptions = [
  {
    label: '拒绝',
    key: 'reject'
  },
  {
    label: '忽略',
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
    case NoticeType.GROUP_INVITE:
    case NoticeType.GROUP_MEMBER_DELETE:
      return groupStore.getUserInfo(item.operateId)!
    case NoticeType.ADD_ME:
    case NoticeType.GROUP_INVITE_ME:
    case NoticeType.GROUP_SET_ADMIN:
    case NoticeType.GROUP_RECALL_ADMIN:
      return groupStore.getUserInfo(item.senderId)!
  }
}

// 判断是否为好友申请或者群申请、群邀请
const isFriendApplyOrGroupInvite = (item: any) => {
  return (
    item.eventType === NoticeType.FRIEND_APPLY ||
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
    await contactStore.getApplyPage(false)
  } finally {
    isLoadingMore.value = false
  }
}

const handleAgree = async (applyId: string) => {
  loadingMap.value[applyId] = true
  contactStore
    .onHandleInvite({
      applyId,
      state: 2
    })
    .then(() => {
      setTimeout(() => {
        loadingMap.value[applyId] = false
      }, 600)
    })
}

// 处理好友请求操作（拒绝或忽略）
const handleFriendAction = async (action: string, applyId: string) => {
  loadingMap.value[applyId] = true
  try {
    if (action === 'reject') {
      await contactStore.onHandleInvite({
        applyId,
        state: 0
      })
    } else if (action === 'ignore') {
      await contactStore.onHandleInvite({
        applyId,
        state: 3
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
  contactStore.getApplyPage(true)
})
</script>

<style scoped lang="scss"></style>
