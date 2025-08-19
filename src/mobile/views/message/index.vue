<template>
  <div class="flex flex-col h-full">
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="top" />

    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />

    <!-- 页面蒙板 -->
    <div
      v-if="showMask"
      @touchend="maskHandler.close"
      @click="maskHandler.close"
      class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] transition-all duration-3000 ease-in-out opacity-100"></div>

    <NavBar>
      <template #left>
        <n-flex align="center" :size="6" class="w-full">
          <n-avatar
            :size="38"
            :src="AvatarUtils.getAvatarUrl(userStore.userInfo.avatar!)"
            fallback-src="/logo.png"
            round />

          <n-flex vertical justify="center" :size="6">
            <p
              style="
                font-weight: bold !important;
                font-family:
                  system-ui,
                  -apple-system,
                  sans-serif;
              "
              class="text-(16px [--text-color])">
              {{ userStore.userInfo.name }}
            </p>
            <p class="text-(10px [--text-color])">☁️ 柳州鱼峰</p>
          </n-flex>
        </n-flex>
      </template>

      <template #right>
        <n-dropdown
          @on-clickoutside="addIconHandler.clickOutside"
          @select="addIconHandler.select"
          trigger="click"
          :show-arrow="true"
          :options="uiViewsData.addOptions">
          <svg @click="addIconHandler.open" class="size-22px bg-white p-5px rounded-8px">
            <use href="#plus"></use>
          </svg>
        </n-dropdown>
      </template>
    </NavBar>

    <PullToRefresh class="flex-1 overflow-auto" @refresh="handleRefresh" ref="pullRefreshRef">
      <div class="flex flex-col h-full px-18px">
        <div class="py-8px shrink-0">
          <n-input
            id="search"
            class="rounded-6px w-full bg-white relative text-12px"
            :maxlength="20"
            clearable
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            :placeholder="'搜索'">
            <template #prefix>
              <svg class="w-12px h-12px"><use href="#search"></use></svg>
            </template>
          </n-input>
        </div>

        <div class="border-b-1 border-solid color-gray-200 px-18px my-8px"></div>

        <div class="flex-1">
          <div
            v-for="item in messageItems"
            :key="item.id"
            @click="intoRoom(item)"
            class="grid grid-cols-[2.2rem_1fr_4rem] items-start px-2 py-3 gap-1 active:bg-#DEEDE7 active:rounded-10px transition-colors cursor-pointer">
            <!-- 头像：单独居中 -->
            <div class="self-center h-38px">
              <n-badge :value="item.unreadCount">
                <n-avatar :size="40" :src="AvatarUtils.getAvatarUrl(item.avatar)" fallback-src="/logo.png" round />
              </n-badge>
            </div>

            <!-- {{ item }} -->

            <!-- 中间：两行内容 -->
            <div class="truncate pl-4 flex gap-10px flex-col">
              <div class="text-14px leading-tight font-bold flex-1 truncate text-#333 truncate">{{ item.name }}</div>
              <div class="text-12px text-#333 truncate">
                {{ item.text }}
              </div>
            </div>

            <!-- 时间：靠顶 -->
            <div class="text-12px text-right flex gap-1 items-center justify-right">
              <span v-if="item.hotFlag === IsAllUserEnum.Yes">
                <svg class="size-20px select-none outline-none cursor-pointer color-#13987f">
                  <use href="#auth"></use>
                </svg>
              </span>
              <span class="text-#555">
                {{ formatTimestamp(item?.activeTime) }}
              </span>
            </div>
          </div>

          <!-- <div v-for="item in messageItems" :key="item.id" class="message-item relative">
            <div>
              <n-badge :value="item.unreadCount">
                <n-avatar :size="40" :src="item.avatar" fallback-src="/logo.png" round />
              </n-badge>
              <div class="flex flex-col ml-14px justify-between h-[35px]">
                <span class="text-14px text-#333">{{ item.name }}</span>
                <span class="text-12px text-#999">{{ item.text }}</span>
              </div>
            </div>
            <div class="flex justify-right text text-12px w-fit truncate text-right">
              {{ formatTimestamp(item?.activeTime) }}
            </div>
            未读数 悬浮到头像上
            <div v-if="item.unreadCount > 0" class="flex flex-col justify-between h-[35px] absolute left-30px top-5px">
              <span class="text-12px text-[#fff] bg-[red] rounded-full px-8px py-3px">{{ item.unreadCount }}</span>
            </div>
          </div> -->
        </div>
      </div>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PullToRefresh from '#/components/PullToRefresh.vue'
import addFriendIcon from '@/assets/mobile/chat-home/add-friend.webp'
import groupChatIcon from '@/assets/mobile/chat-home/group-chat.webp'
import { useMessage } from '@/hooks/useMessage.ts'
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
import NavBar from '@/mobile/layout/navBar/index.vue'
import { IsAllUserEnum } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

const chatStore = useChatStore()

const pullRefreshRef = ref()

const messageItems = computed(() => chatStore.sessionList)

const getSessionList = async () => {
  await chatStore.getSessionList(true)
}

onMounted(() => {
  getSessionList()
})

const handleRefresh = async () => {
  await getSessionList()
  // 完成刷新
  pullRefreshRef.value?.finishRefresh()
}

const userStore = useUserStore()

/**
 * 渲染图片图标的函数工厂
 * @param {string} src - 图标图片路径
 * @returns {() => import('vue').VNode} 返回一个渲染图片的函数组件
 */
const renderImgIcon = (src: string) => {
  return () =>
    h('img', {
      src,
      style: 'display:block; width: 24px; height: 24px; vertical-align: middle'
    })
}

/**
 * UI 视图数据，包含菜单选项及其图标
 * @type {import('vue').Ref<{ addOptions: { label: string; key: string; icon: () => import('vue').VNode }[] }>}
 */
const uiViewsData = ref({
  addOptions: [
    {
      label: '发起群聊',
      key: 'profile',
      icon: renderImgIcon(groupChatIcon)
    },
    {
      label: '加好友/群',
      key: 'editProfile',
      icon: renderImgIcon(addFriendIcon)
    }
  ]
})

/**
 * 页面蒙板显示状态
 * @type {import('vue').Ref<boolean>}
 */
const showMask = ref(false)

/**
 * 当前页面滚动的纵向位置，避免打开蒙板时页面跳动
 * @type {number}
 */
let scrollY = 0

/**
 * 控制页面蒙板的对象，包含打开和关闭方法
 */
const maskHandler = {
  /**
   * 打开蒙板，并锁定滚动位置
   */
  open: () => {
    scrollY = window.scrollY
    showMask.value = true
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
  },

  /**
   * 关闭蒙板，恢复滚动状态和位置
   */
  close: () => {
    setTimeout(() => {
      showMask.value = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY) // 恢复滚动位置
    }, 200)
  }
}

/**
 * 添加按钮相关事件处理对象
 */
const addIconHandler = {
  /**
   * 选项选择时关闭蒙板
   */
  select: () => {
    maskHandler.close()
  },

  /**
   * 点击加号按钮打开蒙板
   */
  open: () => {
    maskHandler.open()
  },

  /**
   * 点击下拉菜单外部区域关闭蒙板
   */
  clickOutside: () => {
    maskHandler.close()
  }
}

const router = useRouter()

const { handleMsgClick } = useMessage()

const intoRoom = (item: any) => {
  handleMsgClick(item)
  router.push(`/mobile/chatRoom/chatMain/${encodeURIComponent(item.name)}`)
  console.log('进入页面', item)
}
</script>

<style scoped lang="scss">
// .message-item {
//   @apply flex justify-around items-center p-3 hover:bg-#DEEDE7 hover:rounded-10px transition-colors cursor-pointer;
// }
</style>
