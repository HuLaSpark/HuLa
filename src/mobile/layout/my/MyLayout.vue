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
import { useGlobalStore } from '~/src/stores/global'

interface ScanData {
  type: string // 必须有
  [key: string]: any // 允许有其他任意字段
}

const handleScanLogin = async (data: ScanData) => {
  if (!Object.hasOwn(data, 'qrId')) {
    window.$message.warning('登录二维码不存在qrId')
    throw new Error('登录二维码不存在qrId:', data as any)
  }

  const { qrId } = data

  const result = await scanQRCodeAPI({ qrId: qrId })

  // console.log('获取的扫码接口请求结果：', result)

  router.push({
    name: 'mobileConfirmQRLogin',
    params: {
      ip: result.ip,
      expireTime: result.expireTime,
      deviceType: result.deviceType,
      locPlace: Object.hasOwn(result, 'locPlace') ? (result.locPlace ? result.locPlace : '深圳') : '深圳',
      qrId
    }
  })
}

const globalStore = useGlobalStore()

const handleScanAddFriend = async (data: ScanData) => {
  console.log('尝试扫码添加好友')
  if (!Object.hasOwn(data, 'uid')) {
    window.$message.warning('登录二维码不存在uid')
    throw new Error('登录二维码不存在uid:', data as any)
  }

  const uidStr = data.uid as string
  const uid = uidStr.split('&')[0]

  globalStore.addFriendModalInfo.uid = uid

  setTimeout(() => {
    router.push({ name: 'mobileConfirmAddFriend' })
  }, 100)
}

/**
 * 监听事件扫码
 */
useMitt.on(MittEnum.QR_SCAN_EVENT, async (data: ScanData) => {
  try {
    if (!Object.hasOwn(data, 'type')) {
      window.$message.warning('识别不到二维码类型')
      throw new Error('识别不到二维码类型:', data as any)
    }

    if (data.type === 'login') {
      await handleScanLogin(data)
    }

    if (data.type === 'addFriend') {
      await handleScanAddFriend(data)
    }
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
