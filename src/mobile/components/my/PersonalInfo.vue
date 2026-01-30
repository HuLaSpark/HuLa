<template>
  <!-- 个人信息区 -->
  <div class="flex flex-col px-16px">
    <!-- 头像基本信息 -->
    <div ref="avatarBox" class="grid grid-cols-[86px_1fr] z-1 items-start mt-6 gap-2" style="transform: translateZ(0)">
      <!-- 头像 -->
      <div
        class="self-center h-auto transition-transform duration-300 ease-in-out origin-top"
        :style="{ transform: props.isShow ? 'scale(1) translateY(0)' : 'scale(0.62) translateY(0px)' }">
        <n-avatar :size="86" :src="AvatarUtils.getAvatarUrl(userDetailInfo!.avatar)" fallback-src="/logo.png" round />
      </div>

      <!-- 基本信息栏 -->
      <div ref="infoBox" class="pl-2 flex gap-8px flex-col transition-transform duration-300 ease-in-out">
        <!-- 名字与在线状态 -->
        <div class="flex flex-warp gap-4 items-center">
          <n-text class="font-bold text-20px">{{ userDetailInfo!.name }}</n-text>
          <div
            v-show="hasUserOnlineState"
            class="bg-#E7EFE6 flex flex-wrap ps-2 px-8px items-center rounded-full gap-1 h-24px">
            <span class="w-12px h-12px rounded-15px flex items-center">
              <img
                :src="friendUserState.url ? friendUserState.url : currentState?.url"
                alt=""
                class="rounded-50% size-14px" />
            </span>
            <span class="text-bold-style" style="font-size: 12px; color: #373838">
              {{ friendUserState.title ? friendUserState.title : currentState.title }}
            </span>
          </div>
        </div>

        <!-- 账号 -->
        <div class="flex flex-warp gap-2 items-center">
          <span class="text-bold-style">{{ t('mobile_personal_info.account') }}:{{ userDetailInfo!.account }}</span>
          <span v-if="isMyPage" @click="toMyQRCode" class="pe-15px">
            <img class="w-14px h-14px dark:invert" src="@/assets/mobile/my/qr-code.webp" alt="" />
          </span>
        </div>
        <Transition name="medal-fade">
          <div
            v-if="props.isShow"
            ref="medalBox"
            style="transform: translateZ(0)"
            class="relative w-118px overflow-hidden">
            <img class="block w-full" src="@/assets/mobile/my/my-medal.webp" alt="" />
            <div class="text-10px absolute inset-0 flex ps-2 items-center justify-around text-white font-medium">
              <span class="flex items-center">
                <div v-if="(userStore.userInfo?.itemIds?.length ?? 0) > 0">
                  <span class="font-bold">{{ t('mobile_personal_info.unlocked_count_park.text1') }}</span>
                  <span class="medal-number">{{ userStore.userInfo?.itemIds?.length }}</span>
                  <span class="font-bold">{{ t('mobile_personal_info.unlocked_count_park.text2') }}</span>
                </div>
                <span v-else>{{ t('mobile_personal_info.no_medal') }}</span>
              </span>

              <span class="flex ms-3">
                <svg class="iconpark-icon block w-5 h-5">
                  <use href="#right"></use>
                </svg>
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
  <!-- 个人描述和点赞关注区 -->
  <Transition name="slide-fade" @before-enter="beforeEnter" @enter="enter" @leave="leave">
    <div v-if="props.isShow" ref="animatedBox" style="transform: translateZ(0)" class="flex flex-col px-16px">
      <!-- 个人描述 -->
      <div class="mt-2 text-bold-style line-height-24px">
        {{ isMyPage ? userStore.userInfo?.resume : (userDetailInfo as UserInfoType).resume }}
      </div>
      <!-- 点赞关注 -->
      <div class="flex flex-wrap justify-around mt-4">
        <div class="flex flex-warp gap-2 items-center">
          <div class="min-w-10 flex flex-col items-center">
            <n-text class="fans-number">920.13W</n-text>
            <div class="fans-title">{{ t('mobile_personal_info.follower') }}</div>
          </div>
          <n-divider vertical class="h-20px" />
          <div class="min-w-10 flex flex-col items-center">
            <n-text class="fans-number">120</n-text>
            <div class="fans-title">{{ t('mobile_personal_info.follow') }}</div>
          </div>
          <n-divider vertical class="h-20px" />
          <div class="min-w-10 flex flex-col items-center">
            <n-text class="fans-number">43.15W</n-text>
            <div class="fans-title">{{ t('mobile_personal_info.like') }}</div>
          </div>
        </div>
      </div>
      <div class="justify-end flex items-center gap-3 mt-30px">
        <n-button
          :disabled="loading"
          @click="toEditProfile"
          strong
          secondary
          round
          v-if="props.isMyPage && !isBotUser(uid)"
          class="font-bold px-4 py-10px rounded-full text-12px">
          {{ t('mobile_personal_info.edit_profile') }}
        </n-button>
        <n-button
          :loading="loading"
          :disabled="loading"
          strong
          secondary
          @click="handleDelete"
          :color="'#d5304f'"
          v-if="!props.isMyPage && isMyFriend && !isBotUser(uid)"
          class="px-5 py-10px font-bold text-center rounded-full text-12px">
          {{ t('mobile_personal_info.remove_user') }}
        </n-button>

        <n-button
          type="primary"
          :disabled="loading"
          strong
          secondary
          @click="handleAddFriend"
          v-if="!props.isMyPage && !isMyFriend && !isBotUser(uid)"
          class="px-5 py-10px font-bold text-center rounded-full text-12px">
          +&nbsp;
          {{ t('mobile_personal_info.add_friend') }}
        </n-button>
        <n-button
          type="primary"
          strong
          secondary
          @click="toChatRoom"
          :disabled="loading"
          v-if="!props.isMyPage && isMyFriend"
          class="px-5 py-10px text-center font-bold rounded-full text-12px">
          {{ isBotUser(uid) ? t('mobile_personal_info.open_bot') : t('mobile_personal_info.chat') }}
        </n-button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { showDialog } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useUserStatusStore } from '@/stores/userStatus'
import { AvatarUtils } from '@/utils/AvatarUtils'
import 'vant/es/dialog/style'
import { OnlineEnum, UserType } from '@/enums'
import { useMessage } from '@/hooks/useMessage.ts'
import type { UserInfoType, UserItem } from '@/services/types'
import { useChatStore } from '@/stores/chat'
import { useContactStore } from '@/stores/contacts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { getSessionDetailWithFriends } from '@/utils/ImRequestUtils'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  isShow: {
    type: Boolean,
    default: true
  },
  isMyPage: {
    type: Boolean,
    default: true,
    require: false
  },
  isMyFriend: {
    type: Boolean,
    default: false,
    require: false
  }
})

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const userStatusStore = useUserStatusStore()
const groupStore = useGroupStore()
const route = useRoute()
const contactStore = useContactStore() // 联系人
const globalStore = useGlobalStore()
const chatStore = useChatStore()

const { preloadChatRoom } = useMessage()
const uid = route.params.uid as string
const isMyFriend = ref(props.isMyFriend)

const isBotUser = (uid: string) => groupStore.getUserInfo(uid)?.account === UserType.BOT

const toChatRoom = async () => {
  try {
    const res = await getSessionDetailWithFriends({ id: uid, roomType: 2 })
    // 先检查会话是否已存在
    const existingSession = chatStore.getSession(res.roomId)
    if (!existingSession) {
      // 只有当会话不存在时才更新会话列表顺序
      chatStore.updateSessionLastActiveTime(res.roomId)
      // 如果会话不存在，需要重新获取会话列表，但保持当前选中的会话
      await chatStore.getSessionList(true)
    }
    await preloadChatRoom(res.roomId)
    router.push(`/mobile/chatRoom/chatMain`)
  } catch (error) {
    console.error('私聊尝试进入聊天室失败:', error)
  }
}

const handleAddFriend = async () => {
  globalStore.addFriendModalInfo.uid = uid
  router.push('/mobile/mobileFriends/confirmAddFriend')
}

// 用户详情信息，默认字段只写必要的，不加可能会报错undefined
const userDetailInfo = ref<UserItem | UserInfoType | undefined>({
  activeStatus: OnlineEnum.ONLINE,
  avatar: '',
  lastOptTime: 0,
  name: '',
  uid: '',
  account: '',
  resume: ''
})

// 这个值只有在查看好友详细信息时才用
const friendUserState = ref<any>({
  title: '',
  url: ''
})

// 是否存在用户在线状态
const hasUserOnlineState = ref(false)

const { stateList } = storeToRefs(userStatusStore)

const getUserState = (
  stateId: string
): {
  createBy: string
  createTime: number
  id: string
  title: string
  updateBy: null
  updateTime: null
  url: string
} => {
  // 不直接return，不然不好debug
  const foundedState = stateList.value.find((state: { id: string }) => state.id === stateId)
  return foundedState
}

onMounted(() => {
  if (!uid) {
    userDetailInfo.value = userStore.userInfo
    return
  }

  const foundedUser = groupStore.allUserInfo.find((i) => i.uid === uid)

  userDetailInfo.value = foundedUser

  if (foundedUser?.userStateId && foundedUser?.userStateId !== '0') {
    const state = getUserState(foundedUser.userStateId)
    friendUserState.value = state

    // 设置完成状态后最后再显示状态
    hasUserOnlineState.value = true
  }

  const foundedFriend = contactStore.contactsList.find((item) => item.uid === uid)

  if (foundedFriend) {
    isMyFriend.value = true
  }
})

const currentState = computed(() => userStatusStore.currentState)

const loading = ref(false)

const handleDelete = () => {
  showDialog({
    title: '删除好友',
    message: '确定删除该好友吗？',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(async () => {
      if (userDetailInfo.value?.uid) {
        try {
          loading.value = true
          await contactStore.onDeleteFriend(userDetailInfo.value.uid)
          isMyFriend.value = false
          chatStore.getSessionList(true)
          window.$message.success(t('mobile_personal_info.delete_user.success'))
          router.back()
        } catch (error) {
          window.$message.warning(t('mobile_personal_info.delete_user.failed'))
          console.error('删除好友失败：', error)
        } finally {
          loading.value = false
        }
      } else {
        window.$message.warning(t('mobile_personal_info.not_found'))
      }
    })
    .catch(() => {
      // 用户点击取消，不做任何操作
    })
}

const toEditProfile = () => {
  router.push('/mobile/mobileMy/editProfile')
}

const toMyQRCode = () => {
  router.push('/mobile/myQRCode')
}

function beforeEnter(el: Element) {
  const box = el as HTMLElement
  box.style.height = '0'
  box.style.opacity = '0'
  box.style.transform = 'translateY(-20px)'
}

function enter(el: Element, done: () => void) {
  const box = el as HTMLElement
  box.style.transition = 'all 0.3s ease'
  requestAnimationFrame(() => {
    box.style.height = box.scrollHeight + 'px'
    box.style.opacity = '1'
    box.style.transform = 'translateY(0)'
  })

  // 清理动画
  box.addEventListener(
    'transitionend',
    () => {
      box.style.height = 'auto' // 动画结束后设回 auto，避免影响布局
      done()
    },
    { once: true }
  )
}

function leave(el: Element, done: () => void) {
  const box = el as HTMLElement
  box.style.height = box.scrollHeight + 'px'
  box.style.opacity = '1'
  box.style.transform = 'translateY(0)'

  requestAnimationFrame(() => {
    box.style.transition = 'all 0.3s ease'
    box.style.height = '0'
    box.style.opacity = '0'
    box.style.transform = 'translateY(-20px)'
  })

  box.addEventListener('transitionend', done, { once: true })
}

const medalBox = ref<HTMLElement | null>(null)

const avatarBox = ref<HTMLElement | null>(null)

watch(
  () => props.isShow,
  (show) => {
    const box = avatarBox.value
    if (!box) return

    box.style.overflow = 'hidden'
    box.style.transition = 'all 0.3s ease'

    if (show) {
      // 显示：从缩小恢复到原始高度
      box.style.height = box.scrollHeight + 'px'
      box.style.opacity = '1'
      box.style.transform = 'scale(1) translateY(0)'

      box.addEventListener(
        'transitionend',
        () => {
          box.style.height = 'auto' // 回归自适应高度
          box.style.overflow = ''
        },
        { once: true }
      )
    } else {
      // 隐藏：缩小并收起高度
      box.style.height = box.scrollHeight + 'px' // 先设置为当前高度
      requestAnimationFrame(() => {
        box.style.height = '58px' // 保持略小的高度（你原图是 86px，缩放 0.65 后约为 56px）
        box.style.transform = 'scale(1) translateY(0)'
      })
    }
  }
)

const infoBox = ref<HTMLElement | null>(null)
watch(
  () => props.isShow,
  (show) => {
    const info = infoBox.value
    if (!info) return

    // 添加动画过渡（也可直接写在 class 里）
    info.style.transition = 'transform 0.3s ease'

    if (show) {
      info.style.transform = 'translateX(0)'
    } else {
      info.style.transform = 'translateX(-20px)' // 👈 向左移动一点
    }
  }
)
</script>
<style lang="scss" scoped>
$text-font-size-base: 14px;

$font-family-system: -apple-system, BlinkMacSystemFont;
$font-family-windows: 'Segoe UI', 'Microsoft YaHei';
$font-family-chinese: 'PingFang SC', 'Hiragino Sans GB';
$font-family-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif;

.text-bold-style {
  font-size: 14px;
  font-family: $font-family-system, $font-family-windows, $font-family-sans;
  color: #757775;
}

.medal-number {
  margin: 0 5px 0 3px;
  font-style: italic;
  font-weight: bolder;
  font-size: 1.25em;
  font-family: $font-family-system, $font-family-windows, $font-family-chinese, $font-family-sans;
}

.fans-number {
  font-size: $text-font-size-base;
  font-family: $font-family-system, $font-family-windows, $font-family-chinese, $font-family-sans;
  font-weight: 600;
}

.fans-title {
  margin-top: 0.5rem;
  font-size: 13px;
  font-family: $font-family-system, $font-family-windows, $font-family-sans;
  color: #757775;
}

.custom-rounded {
  border-top-left-radius: 20px;
  /* 左上角 */
  border-top-right-radius: 20px;
  overflow: hidden;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.slide-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.medal-fade-enter-active,
.medal-fade-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;
}

.medal-fade-enter-from {
  max-height: 0;
  opacity: 0;
}

.medal-fade-enter-to {
  max-height: 24px; // 和你容器展开时的高度一致
  opacity: 1;
}

.medal-fade-leave-from {
  max-height: 24px;
  opacity: 1;
}

.medal-fade-leave-to {
  max-height: 0;
  opacity: 0;
}

.avatar-collapsible {
  transition: all 0.3s ease;
  transform-origin: top;
}
</style>
