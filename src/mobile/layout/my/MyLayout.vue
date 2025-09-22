<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="top" />

    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1">
      <RouterView v-slot="{ Component }">
        <Transition name="slide" appear mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'
import { scanQRCodeAPI } from '@/utils/ImRequestUtils'
import { MittEnum } from '~/src/enums'
import { useMitt } from '~/src/hooks/useMitt'
import router from '~/src/router'

/**
 * 监听事件扫码
 */
useMitt.on(MittEnum.QR_SCAN_EVENT, async (qrId) => {
  try {
    const data = await scanQRCodeAPI({ qrId: qrId })

    router.push({
      name: 'mobileConfirmQRLogin',
      params: {
        ip: data.ip,
        expireTime: data.expireTime,
        deviceType: data.deviceType,
        locPlace: Object.hasOwn(data, 'locPlace') ? (data.locPlace ? data.locPlace : '深圳') : '深圳',
        qrId
      }
    })
  } catch (error) {
    console.error('获取扫码token错误：', error)
  }
})

const route = useRoute()
</script>

<style lang="scss" scoped>
/* 侧滑切换动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.1s ease;
}

.slide-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
