<template>
  <!-- 个人信息框 -->
  <n-flex vertical :size="26" class="size-fit box-border rounded-8px relative min-h-[300px] select-none cursor-default">
    <!-- 背景 -->
    <img
      class="absolute rounded-t-8px z-2 top-0 left-0 w-full h-100px"
      :class="
        groupStore.getUserInfo(uid)?.wearingItemId === '6' ? 'object-contain bg-#e9e9e980 dark:bg-#111' : 'object-cover'
      "
      :src="groupStore.getUserInfo(uid)?.wearingItemId === '6' ? '/hula.png' : '/img/dispersion-bg.png'"
      alt="" />
    <div class="h-20px"></div>
    <n-flex vertical :size="20" class="size-full p-10px box-border z-10 relative">
      <n-flex vertical :size="20">
        <div class="avatar-wrapper relative" :class="{ 'cursor-pointer': isCurrentUserUid }" @click="openEditInfo">
          <div v-if="isCurrentUserUid" class="hover-area absolute top-8px left-8px w-80px h-80px rounded-full z-20">
            <div class="avatar-hover absolute inset-0 rounded-full"></div>
          </div>
          <n-avatar
            class="border-(8px solid [--avatar-border-color])"
            :bordered="true"
            round
            :size="80"
            :src="avatarSrc"
            :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
            :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'" />
        </div>

        <!-- 在线状态点 -->
        <template v-if="!statusIcon">
          <n-popover trigger="hover" placement="top" :show-arrow="false">
            <template #trigger>
              <div
                @click="
                  isCurrentUserUid
                    ? openContent(t('home.profile_card.online_status'), 'onlineStatus', 320, 480)
                    : void 0
                "
                class="z-30 absolute top-72px left-72px border-(6px solid [--avatar-border-color]) rounded-full size-18px"
                :class="[
                  displayActiveStatus === OnlineEnum.ONLINE ? 'bg-#1ab292' : 'bg-#909090',
                  isCurrentUserUid ? 'cursor-pointer' : 'cursor-default'
                ]"></div>
            </template>
            <span>
              {{
                displayActiveStatus === OnlineEnum.ONLINE
                  ? t('home.profile_card.status.online')
                  : t('home.profile_card.status.offline')
              }}
            </span>
          </n-popover>
        </template>

        <!-- 独立的状态图标 -->
        <template v-if="statusIcon">
          <n-popover trigger="hover" placement="top" :show-arrow="false">
            <template #trigger>
              <div class="z-30 absolute top-72px left-72px size-26px bg-[--avatar-border-color] rounded-full">
                <img
                  :src="statusIcon"
                  @click="
                    isCurrentUserUid
                      ? openContent(t('home.profile_card.online_status'), 'onlineStatus', 320, 480)
                      : void 0
                  "
                  class="p-4px rounded-full size-18px"
                  :class="isCurrentUserUid ? 'cursor-pointer' : 'cursor-default'"
                  alt="" />
              </div>
            </template>
            <span>{{ currentStateTitle }}</span>
          </n-popover>
        </template>

        <div
          v-if="groupStore.getUserInfo(uid)?.wearingItemId === '6'"
          class="absolute top-72px left-142px bg-[--bate-bg] border-(1px solid [--bate-color]) text-(12px [--bate-color] center) p-8px rounded-full">
          {{ t('home.profile_card.developer_badge') }}
        </div>

        <n-flex align="center" :size="8">
          <p
            class="text-(18px [--chat-text-color]) w-fit"
            :class="{ 'cursor-pointer text-underline': isCurrentUserUid }"
            @click="openEditInfo"
            style="
              font-weight: bold !important;
              font-family:
                system-ui,
                -apple-system,
                sans-serif;
            ">
            {{ groupStore.getUserInfo(uid)?.name }}
          </p>
          <span
            v-if="groupNickname && groupNickname !== groupStore.getUserInfo(uid)?.name"
            class="text-(13px [--chat-text-color])">
            ({{ groupNickname }})
          </span>
        </n-flex>

        <!-- 账号 -->
        <n-flex align="center" :size="10">
          <n-flex align="center" :size="12">
            <p class="text-[--info-text-color]">{{ t('home.profile_card.labels.account') }}</p>
            <span class="text-(12px [--chat-text-color])">{{ `${groupStore.getUserInfo(uid)?.account}` }}</span>

            <n-tooltip trigger="hover">
              <template #trigger>
                <svg class="size-12px cursor-pointer hover:color-#909090 hover:transition-colors" @click="handleCopy">
                  <use href="#copy"></use>
                </svg>
              </template>
              <span>{{ t('home.profile_card.tooltip.copy_account') }}</span>
            </n-tooltip>

            <!-- Gitee/GitHub/GitCode 标识 -->
            <n-tooltip v-if="linkedGitee">
              <template #trigger>
                <svg class="size-18px color-#d5304f"><use href="#gitee-login"></use></svg>
              </template>
              <span>{{ t('home.profile_card.tooltip.bound_gitee') }}</span>
            </n-tooltip>
            <n-tooltip v-if="linkedGithub">
              <template #trigger>
                <svg class="size-18px color-#303030 dark:color-#fefefe"><use href="#github-login"></use></svg>
              </template>
              <span>{{ t('home.profile_card.tooltip.bound_github') }}</span>
            </n-tooltip>
            <n-tooltip v-if="linkedGitcode">
              <template #trigger>
                <svg class="size-18px color-#d5304f"><use href="#gitcode-login"></use></svg>
              </template>
              <span>{{ t('home.profile_card.tooltip.bound_gitcode') }}</span>
            </n-tooltip>
          </n-flex>
        </n-flex>
      </n-flex>

      <!-- 地址 -->
      <n-flex align="center" :size="26" class="select-none">
        <span class="text-[--info-text-color]">{{ t('home.profile_card.labels.location') }}</span>
        <span class="text-(13px [--chat-text-color])">
          {{ groupStore.getUserInfo(uid)?.locPlace || t('home.profile_card.location_unknown') }}
        </span>
      </n-flex>
      <!-- 获得的徽章 -->
      <n-flex v-if="groupStore.getUserInfo(uid)?.itemIds" :size="26" class="select-none">
        <span class="text-[--info-text-color]">{{ t('home.profile_card.labels.badges') }}</span>
        <n-flex :size="8">
          <template v-for="id in groupStore.getUserInfo(uid)?.itemIds" :key="id">
            <div class="relative inline-flex flex-col items-center">
              <n-skeleton v-if="!badgeLoadedMap[id]" text :repeat="1" :width="38" :height="38" circle />
              <div v-show="badgeLoadedMap[id]" class="relative">
                <n-avatar
                  round
                  :width="38"
                  :height="38"
                  :src="cachedStore.badgeById(id)?.img"
                  :color="themes.content === ThemeEnum.DARK ? '' : '#c8c8c8'"
                  :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                  @load="badgeLoadedMap[id] = true"
                  @error="badgeLoadedMap[id] = true" />
                <n-popover trigger="hover" :show-arrow="false" placement="top">
                  <template #trigger>
                    <svg
                      class="absolute -top-2px -right-2px size-12px bg-#fff dark:bg-#303030 rounded-full cursor-pointer shadow-sm p-1px">
                      <use href="#tips"></use>
                    </svg>
                  </template>
                  <span class="text-12px">{{ cachedStore.badgeById(id)?.describe }}</span>
                </n-popover>
              </div>
            </div>
          </template>
        </n-flex>
      </n-flex>
      <!-- 动态 -->
      <n-flex :size="40" class="select-none">
        <span class="text-[--info-text-color]">{{ t('home.profile_card.labels.activities') }}</span>
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
        <n-button v-if="isCurrentUserUid" secondary type="info" @click="openEditInfo">
          {{ t('home.profile_card.buttons.edit') }}
        </n-button>
        <n-button v-else-if="isMyFriend" secondary type="primary" @click="handleOpenMsgSession(uid)">
          {{ t('home.profile_card.buttons.message') }}
        </n-button>
        <n-button v-else secondary @click="addFriend">{{ t('home.profile_card.buttons.add_friend') }}</n-button>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { MittEnum, OnlineEnum, ThemeEnum } from '@/enums/index.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { useMitt } from '@/hooks/useMitt'
import { useWindow } from '@/hooks/useWindow'
import { leftHook } from '@/layout/left/hook'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useSettingStore } from '@/stores/setting'
import { useUserStatusStore } from '@/stores/userStatus'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'

const { t } = useI18n()

const { uid } = defineProps<{
  uid: string
  activeStatus?: OnlineEnum
}>()
const { createWebviewWindow } = useWindow()
const { userUid, openMsgSession } = useCommon()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const chatStore = useChatStore()
const { openContent } = leftHook()
const contactStore = useContactStore()
const userStatusStore = useUserStatusStore()
const userStore = useUserStore()
const cachedStore = useCachedStore()
const { stateList } = storeToRefs(userStatusStore)

const resolvedUserInfo = computed(() => groupStore.getUserInfo(uid) ?? null)
/** 头像加载状态 */
const badgeLoadedMap = ref<Record<string, boolean>>({})
const avatarSrc = computed(() => AvatarUtils.getAvatarUrl((resolvedUserInfo.value?.avatar as string) || ''))
/** 是否是当前登录的用户 */
const isCurrentUserUid = computed(() => userUid.value === uid)

const providerFieldMap = {
  gitee: 'linkedGitee',
  github: 'linkedGithub',
  gitcode: 'linkedGitcode'
} as const

type OAuthProvider = keyof typeof providerFieldMap

const resolveLinkedState = (provider: OAuthProvider) => {
  const fieldKey = providerFieldMap[provider]
  const resolvedInfo = resolvedUserInfo.value
  const fallbackInfo = isCurrentUserUid.value ? userStore.userInfo : undefined

  return (
    resolvedInfo?.[fieldKey] ??
    fallbackInfo?.[fieldKey] ??
    resolvedInfo?.oauthProviders?.includes(provider) ??
    fallbackInfo?.oauthProviders?.includes(provider) ??
    false
  )
}

/** 绑定标识（带当前用户信息兜底，同时兼容 oauthProviders 列表） */
const linkedGitee = computed(() => resolveLinkedState('gitee'))
const linkedGithub = computed(() => resolveLinkedState('github'))
const linkedGitcode = computed(() => resolveLinkedState('gitcode'))
/** 是否是我的好友 */
const isMyFriend = computed(() => !!contactStore.contactsList.find((item) => item.uid === uid))
/** 是否为群聊 */
const isGroupChat = computed<boolean>(() => chatStore.isGroup)
/** 当前会话 roomId */
const currentRoomId = computed(() => globalStore.currentSessionRoomId)
/** 当前房间用户信息 */
const currentRoomUserInfo = computed(() => {
  if (!isGroupChat.value || !currentRoomId.value) return null
  return groupStore.getUserInfo(uid, currentRoomId.value) ?? null
})
/** 群昵称 */
const groupNickname = computed(() => {
  if (!currentRoomUserInfo.value) return ''
  const nickname = currentRoomUserInfo.value.myName?.trim()
  return nickname || ''
})
// 显示的在线状态
const displayActiveStatus = computed(() => {
  return resolvedUserInfo.value?.activeStatus ?? OnlineEnum.OFFLINE
})

// 计算当前用户状态图标
const statusIcon = computed(() => {
  const userStateId = resolvedUserInfo.value?.userStateId

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
  const userStateId = resolvedUserInfo.value?.userStateId

  if (userStateId && userStateId !== '1') {
    const state = stateList.value.find((s: { id: string }) => s.id === userStateId)
    if (state) {
      return state.title
    }
  }
  return displayActiveStatus.value === OnlineEnum.ONLINE
    ? t('home.profile_card.status.online')
    : t('home.profile_card.status.offline')
})

const openEditInfo = () => {
  if (isCurrentUserUid.value) {
    useMitt.emit(MittEnum.OPEN_EDIT_INFO)
  }
}

// 处理复制账号
const handleCopy = () => {
  const account = groupStore.getUserInfo(uid)?.account
  if (account) {
    navigator.clipboard.writeText(account)
    window.$message.success(t('home.profile_card.notification.copy_success', { account }))
  }
}

const addFriend = async () => {
  await createWebviewWindow(t('home.profile_card.modal.add_friend'), 'addFriendVerify', 380, 300, '', false, 380, 300)
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
