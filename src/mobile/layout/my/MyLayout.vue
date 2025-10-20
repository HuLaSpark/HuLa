<template>
  <MobileLayout :topSafeAreaClass="computedTopAreaClass" :backgroundImage="'@/assets/mobile/chat-home/background.webp'">
    <div class="h-full flex flex-col">
      <!-- 页面全部内容 -->
      <div class="flex flex-col flex-1">
        <RouterView v-slot="{ Component }">
          <div class="page-view">
            <component :is="Component" :key="route.fullPath" />
          </div>
        </RouterView>
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user'
import { getGroupDetail, scanQRCodeAPI } from '@/utils/ImRequestUtils'

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
  console.log('尝试扫码加群', data, Object.hasOwn(data, 'roomId'))
  if (!Object.hasOwn(data, 'roomId')) {
    window.$message.warning('加群二维码不存在roomId')
    throw new Error('加群二维码不存在roomId:', data as any)
  }

  const roomId = data.roomId as string

  // 可能是扫码出来的
  const groupDetail = await getGroupDetail(roomId)

  globalStore.addGroupModalInfo.account = groupDetail.account
  globalStore.addGroupModalInfo.name = groupDetail.groupName
  globalStore.addGroupModalInfo.avatar = groupDetail.avatar

  setTimeout(() => {
    router.push({ name: 'mobileConfirmAddGroup' })
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
        await handleScanEnterGroup(data)
      } catch (error) {
        console.log('扫码加入群失败:', error)
      }
      break
    default:
      window.$message.warning('识别不到正确的二维码')
      throw new Error('二维码缺少type字段:', data as any)
  }
})

const computedTopAreaClass = computed(() => {
  return route.name !== 'mobileSimpleBio' ? 'bg-white' : ''
})

const route = useRoute()
</script>

<style lang="scss" scoped>
// .page-view {
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
