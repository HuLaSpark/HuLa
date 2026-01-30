<template>
  <div class="flex flex-col h-full flex-1">
    <!-- 固定顶部区域 -->
    <Transition name="header-fade">
      <div
        v-if="isHeaderFixed"
        class="fixed backdrop-blur-md left-0 right-0 z-100 flex items-center justify-between bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(20,20,20,0.8)]"
        :style="{
          height: 'env(safe-area-inset-top, 0px)',
          paddingTop: '36px'
        }">
        <div class="pl-24px pt-16px">
          <n-button text @click="openNotificationPopup" class="relative text-#303030 dark:invert">
            <template #icon>
              <div class="relative">
                <svg class="size-22px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span
                  v-if="feedNotificationStore.notificationStats.unreadCount > 0"
                  class="absolute -top-8px -right-8px w-20px h-20px rounded-full bg-#ff6b6b text-white text-10px flex items-center justify-center font-600">
                  {{
                    feedNotificationStore.notificationStats.unreadCount > 99
                      ? '99+'
                      : feedNotificationStore.notificationStats.unreadCount
                  }}
                </span>
              </div>
            </template>
          </n-button>
        </div>
        <div class="flex-1 flex justify-center pt-12px text-16px font-600 text-#303030 dark:text-white">
          {{ t('dynamic.page.mobile_title') }}
        </div>
        <div class="pr-24px opacity-0 pointer-events-none">
          <svg class="w-24px h-24px" viewBox="0 0 24 24" fill="none"></svg>
        </div>
      </div>
    </Transition>

    <!-- 动态列表区域 -->
    <van-pull-refresh
      class="flex-1 overflow-hidden"
      :pull-distance="100"
      :disabled="!isEnablePullRefresh"
      v-model="loading"
      @refresh="onRefresh">
      <n-scrollbar ref="scrollbarRef" class="h-full" @scroll="handleScroll">
        <!-- 图片区 -->
        <div class="w-full h-30vh relative">
          <div class="flex h-95% w-full relative">
            <img class="w-full h-full object-contain bg-#90909048 dark:bg-#111" src="/hula.png" alt="" />
          </div>
          <!-- 左上角通知按钮 -->
          <Transition name="header-fade">
            <div v-if="!isHeaderFixed" class="absolute left-24px" style="top: env(safe-area-inset-top, 0px)">
              <n-button text @click="openNotificationPopup" class="relative">
                <template #icon>
                  <div class="relative">
                    <svg class="w-24px h-24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span
                      v-if="feedNotificationStore.notificationStats.unreadCount > 0"
                      class="absolute -top-8px -right-8px w-20px h-20px rounded-full bg-#ff6b6b text-white text-10px flex items-center justify-center font-600">
                      {{
                        feedNotificationStore.notificationStats.unreadCount > 99
                          ? '99+'
                          : feedNotificationStore.notificationStats.unreadCount
                      }}
                    </span>
                  </div>
                </template>
              </n-button>
            </div>
          </Transition>

          <div class="flex absolute right-20px bottom-0 gap-15px">
            <div class="text-white items-center flex">
              {{ userStore.userInfo?.name }}
            </div>
            <div>
              <n-avatar :size="65" round bordered :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar)" />
            </div>
          </div>
        </div>

        <!-- 动态内容区域 -->
        <div class="px-12px py-12px">
          <DynamicList
            mode="mobile"
            @preview-image="previewImage"
            @video-play="handleVideoPlay"
            @load-more="loadMore"
            @item-click="handleItemClick" />
        </div>
      </n-scrollbar>
    </van-pull-refresh>

    <!-- 通知弹窗 -->
    <FeedNotificationPopup ref="notificationPopupRef" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useFeedStore } from '@/stores/feed'
import { useUserStore } from '@/stores/user'
import { useFeedNotificationStore } from '@/stores/feedNotification'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import DynamicList from '@/components/common/DynamicList.vue'
import FeedNotificationPopup from '@/components/common/FeedNotificationPopup.vue'
import { useMitt } from '@/hooks/useMitt'
import { WsResponseMessageType } from '@/services/wsType'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const feedStore = useFeedStore()
const userStore = useUserStore()
const feedNotificationStore = useFeedNotificationStore()

const { feedOptions } = storeToRefs(feedStore)
const notificationPopupRef = ref()

const loading = ref(false)
const isEnablePullRefresh = ref(true) // 是否启用下拉刷新，现在设置为滚动到顶才启用
const isHeaderFixed = ref(false) // 顶部区域是否固定

let scrollTop = 0 // 记住当前滑动到哪了

const enablePullRefresh = useDebounceFn((top: number) => {
  isEnablePullRefresh.value = top === 0
}, 100)

const disablePullRefresh = useThrottleFn(() => {
  isEnablePullRefresh.value = false
}, 80)

// 图片预览
const previewImage = (images: string[], index: number) => {
  console.log('预览图片:', images, index)
  // TODO: 实现图片预览功能
}

// 视频播放
const handleVideoPlay = (url: string) => {
  console.log('播放视频:', url)
  // TODO: 实现视频播放功能
}

// 下拉刷新
const onRefresh = () => {
  loading.value = true

  const apiPromise = feedStore.refresh()
  const delayPromise = new Promise((resolve) => setTimeout(resolve, 500))

  Promise.all([apiPromise, delayPromise])
    .then(() => {
      loading.value = false
      // 刷新后清空未读数量
      feedStore.clearUnreadCount()
      console.log('刷新完成')
    })
    .catch((error) => {
      loading.value = false
      console.log('刷新动态列表失败：', error)
      window.$message.error('刷新失败，请重试')
    })
}

// 处理滚动
const handleScroll = (event: any) => {
  const target = event.target
  if (!target) return

  scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  // 控制下拉刷新与顶部固定
  if (scrollTop < 200) {
    enablePullRefresh(scrollTop)
  } else {
    disablePullRefresh()
  }

  isHeaderFixed.value = scrollTop >= 40

  // 距离底部100px时触发加载
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadMore()
  }
}

// 加载更多
const loadMore = async () => {
  if (feedOptions.value.isLoading || feedOptions.value.isLast) return
  await feedStore.loadMore()
}

// 处理动态项点击
const handleItemClick = (feedId: string) => {
  router.push({
    name: 'mobileDynamicDetail',
    params: { id: feedId }
  })
}

// 打开通知弹窗
const openNotificationPopup = () => {
  notificationPopupRef.value?.openPopup()
}

// 监听朋友圈消息推送
const handleFeedSendMsg = (_payload: any) => {
  feedStore.increaseUnreadCount()
}

// 初始化数据
onMounted(async () => {
  // 初始加载动态列表
  await feedStore.getFeedList(true)

  // 打开朋友圈时清空未读数量
  feedStore.clearUnreadCount()

  // 注册朋友圈消息监听
  useMitt.on(WsResponseMessageType.FEED_SEND_MSG, handleFeedSendMsg)
})

onUnmounted(() => {
  // 清理事件监听
  useMitt.off(WsResponseMessageType.FEED_SEND_MSG, handleFeedSendMsg)
})
</script>

<style scoped lang="scss">
.header-fade-enter-active,
.header-fade-leave-active {
  transition: opacity 0.25s ease;
}

.header-fade-enter-from,
.header-fade-leave-to {
  opacity: 0;
}
</style>
