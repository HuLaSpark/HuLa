<template>
  <MobileScaffold :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        :hidden-right="true"
        :enable-default-background="false"
        :enable-shadow="false"
        room-name="用户资料" />
    </template>

    <template #container>
      <div class="flex flex-col h-full">
        <div class="shrink-0">
          <PersonalInfo :is-my-page="isMyPage" :is-show="isShow"></PersonalInfo>
        </div>

        <!-- TODO: 原先滚动 PersonalInfo 收缩需要重新实现 -->
        <div class="grow-1 overflow-hidden custom-rounded flex px-24px flex-col gap-4 z-1 p-10px mt-4 shadow">
          <CommunityTab @scroll="handleScroll" @update="onUpdate" :options="tabOptions" active-tab-name="find">
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
              <!-- 赞过的动态 -->
              <div
                v-if="feedOptions.isLoading && feedList.length === 0"
                class="flex justify-center items-center py-20px">
                <n-spin size="large" />
              </div>

              <div v-else-if="feedList.length === 0" class="flex justify-center items-center py-40px text-gray-500">
                暂无赞过的动态
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
    </template>
  </MobileScaffold>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CommunityContent from '#/components/community/CommunityContent.vue'
import CommunityTab from '#/components/community/CommunityTab.vue'
import PersonalInfo from '#/components/my/PersonalInfo.vue'
import { useUserStore } from '@/stores/user'
import { useFeedStore } from '@/stores/feed'

const feedStore = useFeedStore()
const { feedList, feedOptions } = storeToRefs(feedStore)

const isShow = ref(true)
const avatarBox = ref<HTMLElement | null>(null)
const lastScrollTop = ref(0)
const hasTriggeredHide = ref(false)
const infoBox = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const userStore = useUserStore()

const route = useRoute()

const uid = route.params.uid as string

const isMyPage = ref(false)

const onUpdate = (newTab: string) => {
  console.log('已更新：', newTab)
}

const loadMore = async () => {
  if (feedOptions.value.isLoading || feedOptions.value.isLast) return
  await feedStore.loadMore()
}

const tabOptions = reactive([
  {
    tab: '动态',
    name: 'find'
  },
  {
    tab: '赞过',
    name: 'follow'
  }
])

watch(isShow, (show) => {
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
})

watch(isShow, (show) => {
  const info = infoBox.value
  if (!info) return

  // 添加动画过渡（也可直接写在 class 里）
  info.style.transition = 'transform 0.3s ease'

  if (show) {
    info.style.transform = 'translateX(0)'
  } else {
    info.style.transform = 'translateX(-20px)' // 👈 向左移动一点
  }
})

onMounted(async () => {
  if (userStore.userInfo?.uid === uid) {
    isMyPage.value = true
  } else {
    isMyPage.value = false
  }

  // 初始加载动态列表
  await feedStore.getFeedList(true)
})

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target) return

  const scrollTop = target.scrollTop

  // 向上滑动
  if (scrollTop - lastScrollTop.value > 0) {
    if (scrollTop > 700 && isShow.value && !hasTriggeredHide.value) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isShow.value = false
          hasTriggeredHide.value = true
        })
      })
    }
  }

  // 向下滑回顶部区域
  if (scrollTop < 580) {
    requestAnimationFrame(() => {
      isShow.value = true
      hasTriggeredHide.value = false
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = 0
      }
    })
  }

  lastScrollTop.value = scrollTop
}
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
}

.custom-rounded {
  border-top-left-radius: 20px; /* 左上角 */
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
