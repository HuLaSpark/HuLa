<template>
  <div class="h-100vh">
    <!-- 背景图片 -->
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />
    <!-- 个人信息版块 -->
    <NavBar :style="envType === 'android' ? { paddingTop: safeArea.top + 'px' } : {}">
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
          :options="uiViewsData.addOptions">
          <svg @click="addIconHandler.open" class="size-22px bg-white p-5px rounded-8px">
            <use href="#plus"></use>
          </svg>
        </n-dropdown>
      </template>
    </NavBar>
    <!-- 页面内容 -->
    <RouterView
      :style="envType === 'android' ? { paddingTop: safeArea.top + 44 + 'px !important' } : {}"
      class="center" />
    <!-- 选项菜单 -->
    <TabBar :style="envType === 'android' ? { bottom: safeArea.bottom + 'px !important' } : {}" />
    <!-- 页面蒙板 -->
    <div
      v-if="showMask"
      @touchend="maskHandler.close"
      @click="maskHandler.close"
      class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] transition-all duration-3000 ease-in-out opacity-100"></div>
  </div>
</template>

<script setup lang="ts">
import addFriendIcon from '@/assets/mobile/chat-home/add-friend.webp'
import groupChatIcon from '@/assets/mobile/chat-home/group-chat.webp'
import { useMobileStore } from '@/stores/mobile'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import NavBar from './navBar/index.vue'
import TabBar from './tabBar/index.vue'

const mobileStore = useMobileStore()

const envType = mobileStore.envType
const safeArea = computed(() => mobileStore.safeArea)

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
      style: 'width: 32px; height: 32px; margin: 0 10px 0 10px; vertical-align: middle'
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

<style lang="scss">
.center {
  height: calc(100vh - calc(env(safe-area-inset-top) + 44px) - calc(50px + env(safe-area-inset-bottom)));
  padding-top: calc(env(safe-area-inset-top) + 44px);
  padding-bottom: calc(max(50px, 20px + env(safe-area-inset-bottom)));
}
</style>
