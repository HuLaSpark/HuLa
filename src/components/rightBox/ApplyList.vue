<template>
  <n-flex vertical class="select-none">
    <n-flex align="center" justify="space-between" class="color-[--text-color] px-20px py-10px">
      <p class="text-16px">{{ props.type === 'friend' ? '好友通知' : '群通知' }}</p>
      <svg class="size-18px cursor-pointer"><use href="#delete"></use></svg>
    </n-flex>

    <n-virtual-list
      style="max-height: calc(100vh - 80px)"
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
              <n-avatar
                round
                size="large"
                :src="avatarSrc(useUserInfo(isCurrentUser(item.uid) ? item.targetId : item.uid).value.avatar!)"
                class="mr-10px" />
              <n-flex vertical :size="12">
                <n-flex align="center" :size="10">
                  <p
                    @click="isCurrentUser(item.uid) ? (currentUserId = item.targetId) : (currentUserId = item.uid)"
                    class="text-(14px #13987f) cursor-pointer">
                    {{ useUserInfo(isCurrentUser(item.uid) ? item.targetId : item.uid).value.name }}
                  </p>

                  <p class="text-(14px [--text-color])">
                    {{ applyMsg(item) }}
                  </p>

                  <p class="text-(10px #909090)">{{ formatTimestamp(item.createTime) }}</p>
                </n-flex>
                <p v-show="item.msg" class="text-(12px [--text-color])">留言：{{ item.msg }}</p>
              </n-flex>
            </n-flex>

            <n-flex
              align="center"
              :size="10"
              v-if="item.status === RequestFriendAgreeStatus.Waiting && !isCurrentUser(item.uid)">
              <n-button secondary :loading="loadingMap[item.applyId]" @click="handleAgree(item.applyId)">接受</n-button>
              <n-dropdown
                trigger="click"
                :options="dropdownOptions"
                @select="(key: string) => handleFriendAction(key, item.applyId)">
                <n-icon class="cursor-pointer px-6px">
                  <svg class="size-16px color-[--text-color]"><use href="#more"></use></svg>
                </n-icon>
              </n-dropdown>
            </n-flex>
            <span
              class="text-(12px #64a29c)"
              :class="{ 'text-(12px #c14053)': item.status === RequestFriendAgreeStatus.Reject }"
              v-else-if="isCurrentUser(item.uid)">
              {{
                isAccepted(item.targetId)
                  ? '已同意'
                  : item.status === RequestFriendAgreeStatus.Reject
                    ? '对方已拒绝'
                    : '等待验证'
              }}
            </span>
            <span class="text-(12px #64a29c)" v-else-if="item.status === RequestFriendAgreeStatus.Agree">已同意</span>
            <span class="text-(12px #c14053)" v-else-if="item.status === RequestFriendAgreeStatus.Reject">已拒绝</span>
            <span class="text-(12px #909090)" v-else-if="item.status === RequestFriendAgreeStatus.Ignore">已忽略</span>
          </n-flex>
        </n-flex>
      </template>
    </n-virtual-list>

    <!-- 空数据提示 -->
    <n-flex v-if="applyList.length === 0" vertical justify="center" align="center" class="py-40px">
      <n-empty description="暂无好友申请" />
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { useUserInfo } from '@/hooks/useCached.ts'
import { RequestFriendAgreeStatus } from '@/services/types.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

const userStore = useUserStore()
const contactStore = useContactStore()
const currentUserId = ref('0')
const loadingMap = ref<Record<string, boolean>>({})
const virtualListRef = ref()
const isLoadingMore = ref(false)
const props = defineProps<{
  type: 'friend' | 'group'
}>()

// 检查好友申请是否已被接受
const isAccepted = (targetId: string) => {
  // 使用缓存集合快速检查目标用户是否在联系人列表中
  return contactStore.contactsList.some((contact) => contact.uid === targetId)
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
    return isCurrentUser(item.uid)
      ? isAccepted(item.targetId)
        ? '已同意你的请求'
        : '正在验证你的邀请'
      : '请求加为好友'
  } else {
    return isCurrentUser(item.uid) ? '已同意你的邀请' : '请求邀请进入群聊'
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
  return uid === userStore.userInfo.uid
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
