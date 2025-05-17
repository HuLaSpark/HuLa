<template>
  <!-- 个人信息框 -->
  <n-flex vertical :size="26" class="size-fit box-border rounded-8px relative min-h-[300px] select-none cursor-default">
    <!-- 背景 -->
    <img
      class="absolute rounded-t-8px z-2 top-0 left-0 w-full h-100px object-cover"
      src="@/assets/img/dispersion-bg.png"
      alt="" />
    <div class="h-20px"></div>
    <n-flex vertical :size="20" class="size-full p-10px box-border z-10 relative">
      <n-flex vertical :size="20">
        <div class="avatar-wrapper relative">
          <div class="hover-area absolute top-8px left-8px w-80px h-80px rounded-full z-20">
            <div class="avatar-hover absolute inset-0 rounded-full"></div>
          </div>
          <n-avatar
            class="border-(8px solid [--avatar-border-color])"
            :bordered="true"
            round
            :size="80"
            :src="avatarSrc"
            fallback-src="/logo.png" />
        </div>

        <!-- 在线状态点 -->
        <template v-if="!statusIcon">
          <n-popover trigger="hover" placement="top" :show-arrow="false">
            <template #trigger>
              <div
                @click="openContent('在线状态', 'onlineStatus', 320, 480)"
                class="z-30 absolute top-72px left-72px cursor-pointer border-(6px solid [--avatar-border-color]) rounded-full size-18px"
                :class="[activeStatus === OnlineEnum.ONLINE ? 'bg-#1ab292' : 'bg-#909090']"></div>
            </template>
            <span>{{ activeStatus === OnlineEnum.ONLINE ? '在线' : '离线' }}</span>
          </n-popover>
        </template>

        <!-- 独立的状态图标 -->
        <template v-if="statusIcon">
          <n-popover trigger="hover" placement="top" :show-arrow="false">
            <template #trigger>
              <div class="z-30 absolute top-72px left-72px size-26px bg-[--avatar-border-color] rounded-full">
                <img
                  :src="statusIcon"
                  @click="openContent('在线状态', 'onlineStatus', 320, 480)"
                  class="p-4px cursor-pointer rounded-full size-18px"
                  alt="" />
              </div>
            </template>
            <span>{{ currentStateTitle }}</span>
          </n-popover>
        </template>

        <div
          v-if="useUserInfo(uid).value.wearingItemId === '6'"
          class="absolute top-72px left-142px bg-[--bate-bg] border-(1px solid [--bate-color]) text-(12px [--bate-color] center) font-bold p-8px rounded-full">
          HuLa开发工程师
        </div>

        <n-flex align="center" :size="8">
          <p
            class="text-underline text-(18px [--chat-text-color]) w-fit"
            style="
              font-weight: bold !important;
              font-family:
                system-ui,
                -apple-system,
                sans-serif;
            ">
            {{ useUserInfo(uid).value.name }}
          </p>

          <n-popover trigger="hover" placement="top" :show-arrow="false">
            <template #trigger>
              <svg class="size-18px cursor-pointer text-[--chat-text-color]"><use href="#edit"></use></svg>
            </template>
            <span>添加备注</span>
          </n-popover>
        </n-flex>

        <!-- 账号 -->
        <n-flex align="center" :size="10">
          <n-flex align="center" :size="12">
            <p class="text-[--info-text-color]">账号</p>
            <span class="text-(12px [--chat-text-color])">{{ `${useUserInfo(uid).value.account}` }}</span>
          </n-flex>
          <n-tooltip trigger="hover">
            <template #trigger>
              <svg class="size-12px cursor-pointer hover:color-#909090 hover:transition-colors" @click="handleCopy">
                <use href="#copy"></use>
              </svg>
            </template>
            <span>复制账号</span>
          </n-tooltip>
        </n-flex>
      </n-flex>

      <!-- 地址 -->
      <n-flex align="center" :size="26" class="select-none">
        <span class="text-[--info-text-color]">所在地</span>
        <span class="text-(13px [--chat-text-color])">{{ useUserInfo(uid).value.locPlace || '未知' }}</span>
      </n-flex>
      <!-- 获得的徽章 -->
      <n-flex v-if="isCurrentUser.itemIds && isCurrentUser.itemIds.length > 0" :size="26" class="select-none">
        <span class="text-[--info-text-color]">获得的徽章</span>
        <n-flex>
          <template v-for="id in isCurrentUser.itemIds" :key="id">
            <n-skeleton v-if="!badgeLoadedMap[id]" text :repeat="1" :width="38" :height="38" circle />
            <n-avatar
              v-show="badgeLoadedMap[id]"
              round
              :width="38"
              :height="38"
              :src="useBadgeInfo(id).value.img"
              @load="badgeLoadedMap[id] = true"
              @error="badgeLoadedMap[id] = true" />
          </template>
        </n-flex>
      </n-flex>
      <!-- 动态 -->
      <n-flex :size="40" class="select-none">
        <span class="text-[--info-text-color]">动态</span>
        <n-image-group>
          <n-flex :size="6" :wrap="false">
            <n-image
              v-for="n in 4"
              :key="n"
              preview-disabled
              class="rounded-8px"
              width="50"
              src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
          </n-flex>
        </n-image-group>
      </n-flex>

      <n-flex justify="center" align="center" :size="40">
        <n-button v-if="isCurrentUserUid" secondary type="info" @click="openEditInfo"> 编辑资料 </n-button>
        <n-button v-else-if="isMyFriend" secondary type="primary" @click="handleOpenMsgSession(uid)"> 发信息 </n-button>
        <n-button v-else secondary @click="addFriend"> 加好友 </n-button>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { MittEnum, OnlineEnum } from '@/enums/index.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { leftHook } from '@/layout/left/hook'
import { useMitt } from '@/hooks/useMitt'
import { useGlobalStore } from '@/stores/global'
import { useUserStatusStore } from '@/stores/userStatus'
import { storeToRefs } from 'pinia'
import { useWindow } from '@/hooks/useWindow'

const { uid, activeStatus } = defineProps<{
  uid: string
  activeStatus?: OnlineEnum
}>()
const { createWebviewWindow } = useWindow()
const { userUid, openMsgSession } = useCommon()
const globalStore = useGlobalStore()
const { openContent } = leftHook()
const contactStore = useContactStore()
const userStatusStore = useUserStatusStore()
const { stateList } = storeToRefs(userStatusStore)
const isCurrentUser = computed(() => useUserInfo(uid).value)
/** 头像加载状态 */
const badgeLoadedMap = ref<Record<string, boolean>>({})
const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(useUserInfo(uid).value.avatar as string))
/** 是否是当前登录的用户 */
const isCurrentUserUid = computed(() => userUid.value === uid)
/** 是否是我的好友 */
const isMyFriend = computed(() => !!contactStore.contactsList.find((item) => item.uid === uid))

// 计算当前用户状态图标
const statusIcon = computed(() => {
  const userInfo = useUserInfo(uid).value
  const userStateId = userInfo.userStateId

  // 如果在线且有特殊状态
  if (userStateId && userStateId !== '1') {
    const state = stateList.value.find((s: { id: string }) => s.id === userStateId)
    if (state) {
      return state.url
    }
  }
  return null
})

// 计算当前状态的标题
const currentStateTitle = computed(() => {
  const userInfo = useUserInfo(uid).value
  const userStateId = userInfo.userStateId

  if (userStateId && userStateId !== '1') {
    const state = stateList.value.find((s: { id: string }) => s.id === userStateId)
    if (state) {
      return state.title
    }
  }
  return activeStatus === OnlineEnum.ONLINE ? '在线' : '离线'
})

const openEditInfo = () => {
  useMitt.emit(MittEnum.OPEN_EDIT_INFO)
}

// 处理复制账号
const handleCopy = () => {
  const account = useUserInfo(uid).value.account
  if (account) {
    navigator.clipboard.writeText(account)
    window.$message.success(`复制成功 ${account}`)
  }
}

const addFriend = async () => {
  await createWebviewWindow('申请加好友', 'addFriendVerify', 380, 300, '', false, 380, 300)
  globalStore.addFriendModalInfo.show = true
  globalStore.addFriendModalInfo.uid = uid
}

let enableScroll = () => {}

const handleOpenMsgSession = async (uid: string) => {
  enableScroll() // 在打开新会话前恢复所有滚动
  await openMsgSession(uid)
}

onMounted(() => {
  // 注入 enableAllScroll 方法
  const popoverControls = inject('popoverControls', { enableScroll: () => {} })
  enableScroll = () => {
    if (typeof popoverControls.enableScroll === 'function') {
      popoverControls.enableScroll()
    }
  }
})
</script>

<style scoped lang="scss">
.avatar-wrapper {
  .hover-area {
    .avatar-hover {
      opacity: 0;
      transition: opacity 0.4s ease-in-out;
      background: rgba(0, 0, 0, 0.2);
      cursor: pointer;
    }
  }

  .hover-area:hover .avatar-hover {
    opacity: 1;
  }
}

.text-underline {
  &:hover {
    @apply cursor-pointer underline underline-offset-3 decoration-2 decoration-[#606060];
  }
}
</style>
