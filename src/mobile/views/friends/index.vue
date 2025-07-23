<template>
  <div class="flex flex-col h-full flex-1">
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder direction="top" />

    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />

    <!-- 页面蒙板 -->
    <div
      v-if="showMask"
      @touchend="maskHandler.close"
      @click="maskHandler.close"
      class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] transition-all duration-3000 ease-in-out opacity-100"></div>

    <!-- 导航条 -->
    <NavBar>
      <template #center> 通讯录 </template>
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

    <!-- 输入框 -->
    <div class="px-16px mt-2 mb-12px z-1">
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

    <div class="flex flex-1 flex-col bg-white z-1 custom-rounded">
      <!-- 我的消息条 -->
      <div class="grid grid-cols-[4rem_1fr_24px] h-64px px-16px border-b-[1px] border-b-solid border-b-[#e5e7eb]">
        <div class="h-full flex items-center">我的消息</div>
        <div class="h-full flex items-center justify-end overflow-hidden">
          <div class="rounded-full h-26px w-26px bg-purple-300 border-2 border-white"></div>
          <div class="rounded-full h-26px w-26px bg-orange-300 border-2 border-white -ml-2"></div>
          <div class="rounded-full h-26px w-26px bg-teal-300 border-2 border-white -ml-2"></div>
          <div class="rounded-full h-26px w-26px bg-orange-300 border-2 border-white -ml-2"></div>
          <div class="rounded-full h-26px w-26px bg-teal-300 border-2 border-white -ml-2"></div>
          <div
            class="rounded-full h-26px min-w-26px bg-gray-200 border-2 border-white -ml-2 flex items-center justify-center text-xs">
            +15
          </div>
        </div>
        <div class="h-full flex justify-end items-center">
          <img src="@/assets/mobile/friend/right-arrow.webp" class="block h-20px" alt="" />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.custom-rounded {
  border-top-left-radius: 20px; /* 左上角 */
  border-top-right-radius: 20px;
  overflow: hidden;
}
</style>
<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat.ts'
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'

import NavBar from '@/mobile/layout/navBar/index.vue'
import groupChatIcon from '@/assets/mobile/chat-home/group-chat.webp'
import addFriendIcon from '@/assets/mobile/chat-home/add-friend.webp'

const chatStore = useChatStore()

const getSessionList = async () => {
  await chatStore.getSessionList(true)
}

onMounted(() => {
  getSessionList()
})

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
</script>
