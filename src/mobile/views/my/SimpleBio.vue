<template>
  <div class="flex flex-1">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% absolute top-0 z-0" alt="hula" />
    <AutoFixHeightPage :show-footer="false">
      <template #container>
        <div class="z-2 flex flex-col gap-1 overflow-auto h-full">
          <div class="flex flex-col flex-1 p-20px gap-20px">
            <div class="flex items-center">
              <div class="py-15px flex gap-10px w-full items-center justify-end">
                <div class="bg-#E7EFE6 flex flex-wrap ps-2 items-center rounded-full gap-1 w-50px h-24px">
                  <span class="w-12px h-12px rounded-15px bg-#079669"></span>
                  <span class="text-bold-style" style="font-size: 12px; color: #373838">在线</span>
                </div>
                <svg @click="toSettings" class="iconpark-icon h-32px w-32px block"><use href="#wode-shezhi"></use></svg>
                <svg @click="toScanQRCode" class="iconpark-icon h-32px w-32px block"><use href="#saoma"></use></svg>
                <svg @click="handleBack" class="w-32px h-32px iconpark-icon"><use href="#right"></use></svg>
              </div>
            </div>
            <div class="flex shadow bg-white w-full rounded-lg items-center">
              <div class="px-24px py-20px flex w-full flex-wrap gap-20px">
                <n-avatar
                  :size="74"
                  :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar!)"
                  fallback-src="/logo.png"
                  round />

                <div @click="toMyInfo" class="flex flex-col flex-1 py-10px">
                  <div class="font-bold text-18px text-#373838">{{ userStore.userInfo!.name }}</div>
                  <div class="mt-2 text-bold-style line-height-22px line-clamp-2">
                    {{ userStore.userInfo!.resume || '用户很懒没写简介~' }}
                  </div>
                </div>

                <div @click="toMyInfo" class="flex items-center justify-end">
                  <svg @click="handleBack" class="w-24px text-gray h-24px iconpark-icon"><use href="#right"></use></svg>
                </div>
              </div>
            </div>
            <div class="flex flex-col w-full bg-white rounded-lg flex-1">
              <div
                v-for="item in options"
                :key="item.label"
                class="flex flex-wrap items-center gap-15px p-[15px_10px_5px_10px]">
                <div>
                  <svg class="iconpark-icon w-30px h-30px"><use :href="'#' + item.icon"></use></svg>
                </div>
                <div class="flex-1 text-14px">{{ item.label }}</div>
                <div>
                  <svg @click="handleBack" class="w-20px text-gray h-20px iconpark-icon"><use href="#right"></use></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </AutoFixHeightPage>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'

const userStore = useUserStore()

const options = ref([
  {
    icon: 'xiangce',
    label: '相册'
  },
  {
    icon: 'shoucang',
    label: '收藏'
  },
  {
    icon: 'wenjian',
    label: '文件'
  },
  {
    icon: 'gexingzhuangban',
    label: '个性装扮'
  }
])

const toSettings = () => {
  router.push('/mobile/mobileMy/settings')
}

const toScanQRCode = () => {
  router.push('/mobile/mobileMy/scanQRCode')
}

const toMyInfo = () => {
  router.push('/mobile/my')
}

const handleBack = async () => {
  // const result = await invoke('plugin:hula|ping', {
  //   payload: { value: 'hello world' }
  // })
  // console.log('插件测试结果：', result)

  // TODO 返回上一页
  router.back()
  console.log('返回')
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

// .page-view {
//   flex: 1;
//   // 进入时的动画
//   animation: fade-slide-in 0.3s ease;
// }

// @keyframes fade-slide-in {
//   from {
//     transform: translateX(20px);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
</style>
