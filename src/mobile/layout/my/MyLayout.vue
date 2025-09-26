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
import { MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user'
import { scanQRCodeAPI } from '@/utils/ImRequestUtils'

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
const userStore = useUserStore()

const handleScanAddFriend = async (data: ScanData) => {
  console.log('尝试扫码添加好友')
  if (!Object.hasOwn(data, 'uid')) {
    window.$message.warning('登录二维码不存在uid')
    throw new Error('登录二维码不存在uid:', data as any)
  }

  const uidStr = data.uid as string
  const uid = uidStr.split('&')[0]

  // 判断uid是不是自己的

  const selfUid = userStore.userInfo?.uid as string

  if (selfUid === uid) {
    window.$message.warning('不能添加自己为好友哦~', { duration: 4000 })
    throw new Error('用户尝试扫自己二维码添加好友但被拒绝:', data as any)
  }

  globalStore.addFriendModalInfo.uid = uid

  setTimeout(() => {
    router.push({ name: 'mobileConfirmAddFriend' })
  }, 100)
}

/**
 * 扫码进群
 */
const handleScanEnterGroup = async (data: ScanData) => {
  console.log('尝试扫码添加好友')
  if (!Object.hasOwn(data, 'roomId')) {
    window.$message.warning('登录二维码不存在roomId')
    throw new Error('登录二维码不存在roomId:', data as any)
  }

  const roomId = data.roomId as string

  setTimeout(() => {
    router.push({ name: 'confirmAddGroup', params: { roomId } })
  }, 100)
}

/**
 * 监听事件扫码
 */
useMitt.on(MittEnum.QR_SCAN_EVENT, async (data: ScanData) => {
  if (!Object.hasOwn(data, 'type')) {
    window.$message.warning('识别不到正确的二维码')
    throw new Error('二维码缺少type字段:', data as any)
  }

  switch (data.type) {
    case 'login':
      try {
        await handleScanLogin(data)
      } catch (error) {
        console.log('扫码尝试获取Token失败:', error)
      }
      break
    case 'addFriend':
      try {
        await handleScanAddFriend(data)
      } catch (error) {
        console.log('扫码添加好友失败:', error)
      }
      break
    case 'scanEnterGroup':
      try {
        await handleScanEnterGroup(data.roomId)
      } catch (error) {
        console.log('扫码加入群失败:', error)
      }
      break
    default:
      window.$message.warning('识别不到正确的二维码')
      throw new Error('二维码缺少type字段:', data as any)
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
