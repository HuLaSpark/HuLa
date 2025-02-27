<template>
  <!-- 顶部操作栏和显示用户名 -->
  <main
    data-tauri-drag-region
    class="relative z-30 flex-y-center border-b-(1px solid [--right-chat-footer-line-color]) select-none cursor-default justify-between p-[6px_22px_10px]">
    <n-flex align="center">
      <Transition name="loading" mode="out-in">
        <img v-if="showLoading" class="size-22px py-3px" src="@/assets/img/loading.svg" alt="" />
        <n-flex v-else align="center">
          <n-avatar class="rounded-8px select-none" :size="28" :src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />
          <p class="text-(16px [--text-color])">{{ activeItem.name }}</p>
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

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#launch"></use></svg>
          </template>
          <span>发起群聊</span>
        </n-popover>
      </div>

      <div class="options-box" @click="sidebarShow = !sidebarShow">
        <svg><use href="#more"></use></svg>
      </div>
    </nav>

    <!-- 侧边选项栏 -->
    <Transition v-if="shouldShowDeleteFriend || chatStore.isGroup" name="sidebar">
      <div v-if="sidebarShow" style="border: 1px solid rgba(90, 90, 90, 0.1)" class="sidebar">
        <!-- 单聊侧边栏选项 -->
        <template v-if="!chatStore.isGroup">
          <div class="box-item flex-col-y-center">
            <div class="flex-between-center">
              <p>设为置顶</p>
              <n-switch size="small" />
            </div>
            <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>
            <div class="flex-between-center">
              <p>消息免打扰</p>
              <n-switch size="small" />
            </div>
          </div>

          <div class="box-item">
            <div class="flex-between-center">
              <p>屏蔽此人</p>
              <n-switch size="small" />
            </div>
          </div>

          <div class="box-item cursor-pointer" @click="handleDelete(RoomActEnum.DELETE_RECORD)">
            <p>删除聊天记录</p>
          </div>

          <div class="box-item flex-x-center cursor-pointer" @click="handleDelete(RoomActEnum.DELETE_FRIEND)">
            <p class="color-#d03553">删除好友</p>
          </div>

          <p class="m-[0_auto] text-(12px #13987f) mt-20px cursor-pointer">被骚扰了?&nbsp;&nbsp;举报该用户</p>
        </template>

        <!-- 群聊侧边栏选项 -->
        <template v-else>
          <div class="box-item cursor-default">
            <n-flex align="center" :size="10">
              <n-avatar round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem.avatar)" />

              <p class="text-(14px --text-color)">{{ activeItem.name }}</p>

              <n-popover trigger="hover" v-if="activeItem.hotFlag === IsAllUserEnum.Yes">
                <template #trigger>
                  <svg class="size-20px select-none outline-none cursor-pointer color-#13987f">
                    <use href="#auth"></use>
                  </svg>
                </template>
                <span>官方群聊认证</span>
              </n-popover>
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

          <div
            v-if="activeItem.hotFlag !== IsAllUserEnum.Yes"
            class="box-item cursor-pointer"
            @click="handleDelete(RoomActEnum.DELETE_RECORD)">
            <p>删除聊天记录</p>
          </div>

          <div
            v-if="activeItem.hotFlag !== IsAllUserEnum.Yes"
            class="box-item flex-x-center cursor-pointer"
            @click="handleDelete(RoomActEnum.EXIT_GROUP)">
            <p class="color-#d03553">退出群聊</p>
          </div>

          <p
            v-if="activeItem.hotFlag !== IsAllUserEnum.Yes"
            class="m-[0_auto] text-(12px #13987f) mt-20px cursor-pointer">
            被骚扰了?&nbsp;&nbsp;举报该群
          </p>
        </template>
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
</template>

<script setup lang="ts">
import { IsAllUserEnum, SessionItem, UserItem } from '@/services/types.ts'
import { useDisplayMedia } from '@vueuse/core'
import { EventEnum, MittEnum, RoomActEnum } from '@/enums'
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
import { RoomTypeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useUserStatusStore } from '@/stores/userStatus'

const appWindow = WebviewWindow.getCurrent()
const { activeItem } = defineProps<{
  activeItem: SessionItem
}>()
const { addListener } = useTauriListener()
// 使用useDisplayMedia获取屏幕共享的媒体流
const { stream, start, stop } = useDisplayMedia()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const contactStore = useContactStore()
const userStatusStore = useUserStatusStore()
/** 提醒框标题 */
const tips = ref()
const optionsType = ref<RoomActEnum>()
const modalShow = ref(false)
const sidebarShow = ref(false)
const showLoading = ref(true)
const isLoading = ref(false)
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

// 创建一个RTCPeerConnection实例
let peerConnection: RTCPeerConnection
if (type() !== 'linux') {
  peerConnection = new RTCPeerConnection()
}

const MIN_LOADING_TIME = 300 // 最小加载时间（毫秒）

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
  }
)

watchEffect(() => {
  if (!messageOptions.value?.isLoading) {
    isLoading.value = false
    stream.value?.getVideoTracks()[0].addEventListener('ended', () => {
      stop()
    })
  }
})

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

/** 删除操作二次提醒 */
const handleDelete = (label: RoomActEnum) => {
  modalShow.value = true
  optionsType.value = label
  if (label === RoomActEnum.DELETE_FRIEND) {
    tips.value = '确定删除该好友吗?'
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
      // TODO: 删除后当前删除的人提示不准确，无论是删除方还是被删除方都提示“您已被对方拉黑”
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

const closeMenu = (event: any) => {
  /** 点击非侧边栏元素时，关闭侧边栏，但点击弹出框元素、侧边栏图标、还有侧边栏里面的元素时不关闭 */
  if (!event.target.matches('.sidebar, .sidebar *, .n-modal-mask, .options-box *, .n-modal *') && !modalShow.value) {
    sidebarShow.value = false
  }
}

/** 获取当前用户的状态信息 */
const currentUserStatus = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) return null

  // 使用 useUserInfo 获取用户信息
  if (!activeItem.id) return null
  const userInfo = useUserInfo(activeItem.id).value

  // 从状态列表中找到对应的状态
  return userStatusStore.stateList.find((state) => state.id === userInfo.userStateId)
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

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
  if (!messageOptions.value?.isLoading) {
    isLoading.value = false
    showLoading.value = false
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
</style>
