<template>
  <div class="h-100vh">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />
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
        <svg class="size-22px bg-white p-5px rounded-8px"><use href="#plus"></use></svg>
      </template>
    </NavBar>
    <RouterView
      :style="envType === 'android' ? { paddingTop: safeArea.top + 44 + 'px !important' } : {}"
      class="center" />
    <TabBar :style="envType === 'android' ? { bottom: safeArea.bottom + 'px !important' } : {}" />
  </div>
</template>

<script setup lang="ts">
import TabBar from './tabBar/index.vue'
import NavBar from './navBar/index.vue'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useMobileStore } from '@/stores/mobile'

const mobileStore = useMobileStore()

const envType = mobileStore.envType
const safeArea = computed(() => mobileStore.safeArea)

const userStore = useUserStore()
</script>
<style lang="scss">
.center {
  height: calc(100vh - calc(env(safe-area-inset-top) + 44px) - calc(50px + env(safe-area-inset-bottom)));
  padding-top: calc(env(safe-area-inset-top) + 44px);
  padding-bottom: calc(max(50px, 20px + env(safe-area-inset-bottom)));
}
</style>
