<template>
  <div class="h-100vh flex flex-col bg-gray-100">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% absolute top-0 z-1" alt="hula" />

    <HeaderBar
      :isOfficial="false"
      :hidden-right="true"
      :enable-default-background="false"
      :enable-shadow="false"
      room-name="个人二维码" />

    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1 items-center p-15px z-2 my-15">
      <div class="flex flex-col rounded-15px bg-white py-10">
        <div class="flex flex-1 flex-col px-5 gap-10px">
          <div class="flex flex-wrap ps-3 gap-10px">
            <div class="flex h-auto">
              <n-avatar round :size="60" :src="AvatarUtils.getAvatarUrl(userStore.userInfo?.avatar || '')" />
            </div>

            <div
              class="flex flex-col text-#4e4e4e h-auto gap-8px overflow-hidden justify-center text-18px whitespace-normal break-words max-w-46">
              <div class="font-bold">{{ userInfo?.name }}</div>
              <div class="text-16px">账号:{{ userInfo?.account }}</div>
            </div>
          </div>

          <div class="flex w-auto justify-center">
            <n-qr-code
              :size="250"
              class="rounded-12px"
              :value="qrCodeValue"
              color="#14997E"
              :bg-color="qrCodeBgColor"
              :type="qrCodeType"
              :icon-src="AvatarUtils.getAvatarUrl(userStore.userInfo?.avatar || '')"
              :icon-size="60"
              :icon-margin="2"
              :error-correction-level="qrErrorCorrectionLevel" />
          </div>

          <div class="flex justify-center text-gray">扫我添加好友哦~</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useUserStore } from '@/stores/user'

const qrCodeBgColor = ref('#FFFFFF')
const qrCodeType = ref('canvas' as const)
const qrErrorCorrectionLevel = ref('H' as const)

const userStore = useUserStore()

const userInfo = computed(() => {
  return userStore.userInfo
})

// 取随机字符
const randomStr = crypto.randomUUID().split('-')[0]

const qrCodeValue = ref(
  JSON.stringify({
    type: 'addFriend',
    uid: `${userStore.userInfo?.uid}&${randomStr}`
  })
)
</script>

<style lang="scss" scoped></style>
