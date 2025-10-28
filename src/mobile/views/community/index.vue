<template>
  <div class="flex flex-col h-full flex-1">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />

    <!-- 输入框 -->
    <div class="px-16px mt-2 mb-12px z-1 flex gap-3 justify-around">
      <n-input
        id="search"
        v-model:value="searchKeyword"
        class="rounded-6px w-full bg-white relative text-12px"
        :maxlength="20"
        clearable
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :placeholder="'搜索'"
        @update:value="handleSearch">
        <template #prefix>
          <svg class="w-12px h-12px"><use href="#search"></use></svg>
        </template>
      </n-input>

      <img @click="toScanQRCode" class="block w-32px h-32px" src="@/assets/mobile/community/scanner.webp" alt="" />
    </div>

    <!-- tab组件 -->
    <div class="flex flex-1 z-1 relative">
      <div ref="measureRef" class="flex flex-1"></div>
      <div :style="{ height: communityTabHeight + 'px' }" class="absolute top-0 left-0 flex flex-col w-full">
        <div class="flex flex-1 px-20px">
          <CommunityTab
            :customHeight="communityTabHeight - 44"
            @update="onUpdate"
            @scroll="handleScroll"
            :options="tabOptions"
            active-tab-name="find">
            <template #find>
              <!-- 加载状态 -->
              <div
                v-if="feedOptions.isLoading && feedList.length === 0"
                class="flex justify-center items-center py-20px">
                <n-spin size="large" />
              </div>

              <!-- 空状态 -->
              <div v-else-if="feedList.length === 0" class="flex justify-center items-center py-40px text-gray-500">
                暂无动态
              </div>

              <!-- 动态列表 -->
              <template v-else>
                <CommunityContent v-for="item in feedList" :key="item.id" :feed-item="item" />

                <!-- 加载更多 -->
                <div v-if="!feedOptions.isLast" class="flex justify-center py-15px">
                  <n-button :loading="feedOptions.isLoading" @click="loadMore" type="primary" text size="small">
                    {{ feedOptions.isLoading ? '加载中...' : '加载更多' }}
                  </n-button>
                </div>

                <!-- 已加载全部 -->
                <div v-else class="flex justify-center py-15px text-12px text-gray-400">已加载全部</div>
              </template>
            </template>

            <template #follow>
              <!-- 关注的动态列表 - 暂时显示相同内容 -->
              <div
                v-if="feedOptions.isLoading && feedList.length === 0"
                class="flex justify-center items-center py-20px">
                <n-spin size="large" />
              </div>

              <div v-else-if="feedList.length === 0" class="flex justify-center items-center py-40px text-gray-500">
                暂无关注的动态
              </div>

              <template v-else>
                <CommunityContent v-for="item in feedList" :key="item.id" :feed-item="item" />

                <div v-if="!feedOptions.isLast" class="flex justify-center py-15px">
                  <n-button :loading="feedOptions.isLoading" @click="loadMore" type="primary" text size="small">
                    {{ feedOptions.isLoading ? '加载中...' : '加载更多' }}
                  </n-button>
                </div>

                <div v-else class="flex justify-center py-15px text-12px text-gray-400">已加载全部</div>
              </template>
            </template>
          </CommunityTab>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CommunityContent from '#/components/community/CommunityContent.vue'
import CommunityTab from '#/components/community/CommunityTab.vue'
import router from '@/router'
import { useFeedStore } from '@/stores/feed'

const feedStore = useFeedStore()
const { feedList, feedOptions } = storeToRefs(feedStore)

const measureRef = ref<HTMLDivElement>()
const communityTabHeight = ref(0)
const searchKeyword = ref('')
const currentTab = ref('find')

const measureElementObserver = new ResizeObserver((event) => {
  communityTabHeight.value = event[0].contentRect.height
})

onMounted(async () => {
  if (measureRef.value) {
    measureElementObserver.observe(measureRef.value)
  }

  // 初始加载动态列表
  await feedStore.getFeedList(true)
})

onUnmounted(() => {
  if (measureRef.value) {
    measureElementObserver.unobserve(measureRef.value)
  }
})

const toScanQRCode = () => {
  router.push('/mobile/mobileMy/scanQRCode')
}

const onUpdate = (newTab: string) => {
  console.log('已更新：', newTab)
  currentTab.value = newTab
  // 切换tab时可以根据需要加载不同的数据
}

const handleSearch = (value: string) => {
  console.log('搜索：', value)
  // TODO: 实现搜索功能
}

const handleScroll = (event: any) => {
  // 滚动到底部时自动加载更多
  const target = event.target
  if (!target) return

  const scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  // 距离底部100px时触发加载
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadMore()
  }
}

const loadMore = async () => {
  if (feedOptions.value.isLoading || feedOptions.value.isLast) return
  await feedStore.loadMore()
}

const tabOptions = reactive([
  {
    tab: '发现',
    name: 'find'
  },
  {
    tab: '关注',
    name: 'follow'
  }
])
</script>

<style scoped>
.mask-rounded {
  -webkit-mask-image: radial-gradient(circle, white 100%, transparent 100%);
  mask-image: radial-gradient(circle, white 100%, transparent 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
</style>
