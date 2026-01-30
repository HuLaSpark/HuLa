<template>
  <div class="flex flex-col overflow-auto h-full relative">
    <img
      src="@/assets/mobile/chat-home/background.webp"
      class="absolute fixed top-0 left-0 w-full h-full z-0 dark:opacity-20" />
    <!-- 设置区 -->
    <Settings />

    <PersonalInfo :is-show="isShow"></PersonalInfo>

    <div class="relative top-0 flex-1 flex">
      <div ref="measureRef" class="h-full w-full absolute top-0 z-0"></div>
      <!-- 动态内容 -->
      <div
        ref="scrollContainer"
        :style="{ height: tabHeight + 'px' }"
        class="z-1 overflow-hidden mt-2 absolute z-3 w-full">
        <n-card class="custom-rounded" content-class="flex flex-col gap-4 z-1 p-10px mt-4 p-15px!">
          <n-scrollbar
            ref="scrollbarRef"
            :style="{ height: tabHeight + 'px' }"
            :content-style="{ overflowX: 'hidden' }"
            class="overflow-x-hidden"
            @scroll="handleScroll">
            <!-- 动态内容区域 -->
            <div class="py-12px">
              <DynamicList
                mode="mobile"
                @preview-image="previewImage"
                @video-play="handleVideoPlay"
                @load-more="loadMore"
                @item-click="handleItemClick" />
            </div>
          </n-scrollbar>
        </n-card>
      </div>
    </div>

    <div
      @click="toPublishCommunity"
      class="w-52px h-52px rounded-full absolute bottom-120px right-20px z-3 flex items-center justify-center bg-[linear-gradient(145deg,#ACD7DA,#13987F)] shadow-[0_4px_12px_rgba(0,0,0,0.25),0_0_12px_rgba(172,215,218,0.8)]">
      <div class="relative w-20px h-20px">
        <!-- 竖线 -->
        <div class="absolute left-1/2 top-0 h-full w-2px bg-white -translate-x-1/2"></div>
        <!-- 横线 -->
        <div class="absolute top-1/2 left-0 w-full h-2px bg-white -translate-y-1/2"></div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import PersonalInfo from '#/components/my/PersonalInfo.vue'
import Settings from '#/components/my/Settings.vue'
import router from '@/router'
import { useFeedStore } from '@/stores/feed'
import DynamicList from '@/components/common/DynamicList.vue'

const feedStore = useFeedStore()

const measureRef = ref<HTMLDivElement>()

const tabHeight = ref(300)

const measureElementObserver = new ResizeObserver((event) => {
  tabHeight.value = event[0].contentRect.height
})

const toPublishCommunity = () => {
  router.push('/mobile/mobileMy/publishCommunity')
}

const loadMore = async () => {
  await feedStore.loadMore()
}

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

// 处理动态项点击
const handleItemClick = (feedId: string) => {
  router.push({
    name: 'mobileDynamicDetail',
    params: { id: feedId }
  })
}

const isShow = ref(true)

const avatarBox = ref<HTMLElement | null>(null)

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

const infoBox = ref<HTMLElement | null>(null)
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

const scrollContainer = ref<HTMLElement | null>(null)

const lastScrollTop = ref(0)
const hasTriggeredHide = ref(false)

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
