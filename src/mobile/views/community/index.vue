<template>
  <div class="flex flex-col h-full flex-1 bg-white">
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
            <img
              class="w-full h-full object-cover"
              src="https://ts3.tc.mm.bing.net/th/id/OIP-C.ynSetSr3z884UC6sEp4yiwAAAA?rs=1&pid=ImgDetMain&o=7&rm=3"
              alt="" />
          </div>
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
            @load-more="loadMore" />
        </div>
      </n-scrollbar>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeedStore } from '@/stores/feed'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useMessage } from 'naive-ui'
import { debounce, throttle } from 'lodash-es'
import DynamicList from '@/components/common/DynamicList.vue'

const feedStore = useFeedStore()
const userStore = useUserStore()
const message = useMessage()

const { feedOptions } = storeToRefs(feedStore)

const scrollbarRef = ref()
const loading = ref(false)
const isEnablePullRefresh = ref(true) // 是否启用下拉刷新，现在设置为滚动到顶才启用

let scrollTop = 0 // 记住当前滑动到哪了

const enablePullRefresh = debounce((top: number) => {
  isEnablePullRefresh.value = top === 0
}, 100)

const disablePullRefresh = throttle(() => {
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
      console.log('刷新完成')
    })
    .catch((error) => {
      loading.value = false
      console.log('刷新动态列表失败：', error)
      message.error('刷新失败，请重试')
    })
}

// 处理滚动
const handleScroll = (event: any) => {
  const target = event.target
  if (!target) return

  scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  // 控制下拉刷新的启用状态
  if (scrollTop < 200) {
    enablePullRefresh(scrollTop)
  } else {
    disablePullRefresh()
  }

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

// 初始化数据
onMounted(async () => {
  // 初始加载动态列表
  await feedStore.getFeedList(true)
})

onUnmounted(() => {
  // 清理工作
})
</script>

<style scoped lang="scss">
// 自定义样式
</style>
