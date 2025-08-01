<template>
  <!-- 个人信息区 -->
  <div class="flex flex-col px-16px">
    <!-- 头像基本信息 -->
    <div ref="avatarBox" class="grid grid-cols-[86px_1fr] z-1 items-start mt-6 gap-2" style="transform: translateZ(0)">
      <!-- 头像 -->
      <div
        class="self-center h-auto transition-transform duration-300 ease-in-out origin-top"
        :style="{ transform: props.isShow ? 'scale(1) translateY(0)' : 'scale(0.62) translateY(0px)' }">
        <n-avatar :size="86" src="#" fallback-src="/logo.png" round />
      </div>

      <!-- 基本信息栏 -->
      <div ref="infoBox" class="pl-2 flex gap-8px flex-col transition-transform duration-300 ease-in-out">
        <!-- 名字与在线状态 -->
        <div class="flex flex-warp gap-4 items-center">
          <span class="font-bold text-20px text-#373838">苏小研</span>
          <div class="bg-#E7EFE6 flex flex-wrap ps-2 items-center rounded-full gap-1 w-50px h-24px">
            <span class="w-12px h-12px rounded-15px bg-#079669"></span>
            <span class="text-bold-style" style="font-size: 12px; color: #373838"> 在线 </span>
          </div>
        </div>
        <!-- 账号 -->
        <div class="flex flex-warp gap-2 items-center">
          <span class="text-bold-style">账号：123456789</span>
          <span>
            <img class="w-14px h-14px" src="@/assets/mobile/my/qr-code.webp" alt="" />
          </span>
        </div>
        <Transition name="medal-fade">
          <div
            v-if="props.isShow"
            ref="medalBox"
            style="transform: translateZ(0)"
            class="relative w-118px overflow-hidden">
            <img class="block w-full" src="@/assets/mobile/my/my-medal.webp" alt="" />
            <div class="text-10px absolute inset-0 flex ps-2 items-center justify-start text-white font-medium">
              <span class="flex items-center">
                <span class="font-bold">已点亮</span>
                <span class="medal-number"> 1 </span>
                <span class="font-bold">枚勋章</span>
              </span>
              <span class="flex ms-3">
                <svg class="iconpark-icon block w-5 h-5"><use href="#right"></use></svg>
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
      <div class="mt-2 text-bold-style line-height-24px">一段自我描述，添加性别/地区/工作或学校 不定期更新的日常</div>
      <!-- 点赞关注 -->
      <div class="flex flex-wrap justify-around mt-4">
        <div class="flex flex-warp gap-2 items-center">
          <div class="min-w-10 flex flex-col items-center">
            <div class="fans-number">920.13W</div>
            <div class="mt-2 text-bold-style">粉丝</div>
          </div>
          <div class="h-20px w-1px bg-gray-300"></div>
          <div class="min-w-10 flex flex-col items-center">
            <div class="fans-number">120</div>
            <div class="mt-2 text-bold-style">关注</div>
          </div>
          <div class="h-20px w-1px bg-gray-300"></div>
          <div class="min-w-10 flex flex-col items-center">
            <div class="fans-number">43.15W</div>
            <div class="mt-2 text-bold-style">点赞</div>
          </div>
        </div>
        <div class="flex-1 justify-end flex items-center gap-3">
          <div v-if="props.isMyPage" class="font-bold px-4 py-10px bg-#EEF4F3 text-#373838 rounded-full text-12px">
            编辑资料
          </div>
          <div
            v-if="!props.isMyPage"
            class="px-4 py-10px font-bold text-center bg-green text-white rounded-full text-12px">
            + 关注
          </div>
          <div
            v-if="!props.isMyPage"
            class="px-4 py-10px text-center font-bold bg-#EEF4F3 text-#373838 rounded-full text-12px">
            私聊
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps({
  isShow: {
    type: Boolean,
    default: true
  },
  isMyPage: {
    type: Boolean,
    default: true
  }
})

const animatedBox = ref<HTMLElement | null>(null)

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
