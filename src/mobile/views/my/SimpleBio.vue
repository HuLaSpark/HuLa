<template>
  <div class="flex flex-1">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% absolute top-0 z-0" alt="hula" />
    <AutoFixHeightPage :show-footer="false" class="z-1">
      <template #container>
        <div class="z-2 flex flex-col gap-1 overflow-auto h-full">
          <div class="flex flex-col flex-1 p-20px gap-20px">
            <div class="flex items-center">
              <div class="py-15px flex gap-10px w-full items-center justify-end">
                <div class="bg-#E7EFE6 flex flex-wrap ps-2 items-center rounded-full gap-1 h-24px px-2">
                  <span class="w-12px h-12px rounded-15px bg-#079669"></span>
                  <span class="text-bold-style" style="font-size: 12px; color: #373838">
                    {{ t('mobile_my.online') }}
                  </span>
                </div>
                <svg @click="toSettings" class="iconpark-icon h-32px w-32px block"><use href="#wode-shezhi"></use></svg>
                <svg @click="toScanQRCode" class="iconpark-icon h-32px w-32px block"><use href="#saoma"></use></svg>
                <svg @click="handleBack" class="w-32px h-32px iconpark-icon"><use href="#right"></use></svg>
              </div>
            </div>
            <n-card size="small" class="rounded-lg" content-class="flex gap-20px items-center">
              <n-avatar
                :size="74"
                :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar!)"
                fallback-src="/logo.png"
                round />

              <div @click="toMyInfo" class="flex flex-col flex-1 py-10px">
                <div class="font-bold text-18px">{{ userStore.userInfo!.name }}</div>
                <div class="mt-2 text-bold-style line-height-22px line-clamp-2">
                  {{ userStore.userInfo!.resume || t('mobile_my.default_bio') }}
                </div>
              </div>

              <div @click="toMyInfo" class="flex items-center justify-end">
                <svg @click="handleBack" class="w-24px text-gray h-24px iconpark-icon"><use href="#right"></use></svg>
              </div>
            </n-card>
            <n-card size="small" content-class="flex flex-col w-full flex-1" class="rounded-lg">
              <div
                v-for="item in options"
                :key="item.label"
                @click="item.onClick"
                class="flex flex-wrap items-center gap-15px p-[15px_10px_5px_10px] cursor-pointer">
                <div>
                  <svg class="iconpark-icon w-30px h-30px"><use :href="'#' + item.icon"></use></svg>
                </div>
                <div class="flex-1 text-14px">{{ item.label }}</div>
                <div>
                  <svg class="w-20px text-gray h-20px iconpark-icon"><use href="#right"></use></svg>
                </div>
              </div>
            </n-card>
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
import { useI18n } from 'vue-i18n'

const userStore = useUserStore()
const { t } = useI18n()

const options = ref([
  {
    icon: 'xiangce',
    label: t('mobile_my.photos'),
    onClick: () => {
      router.push('/mobile/mobileMy/myAlbum')
    }
  },
  {
    icon: 'shoucang',
    label: t('mobile_my.favorites'),
    onClick: () => {
      // TODO: 跳转到收藏页面
      console.log('收藏')
    }
  },
  {
    icon: 'wenjian',
    label: t('mobile_my.files'),
    onClick: () => {
      // TODO: 跳转到文件页面
      console.log('文件')
    }
  },
  {
    icon: 'gexingzhuangban',
    label: t('mobile_my.appearance'),
    onClick: () => {
      // TODO: 跳转到个性装扮页面
      console.log('个性装扮')
    }
  },
  {
    icon: 'robot',
    label: t('mobile_my.intelligent'),
    onClick: () => {
      router.push('/mobile/mobileMy/aiAssistant')
    }
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
</style>
