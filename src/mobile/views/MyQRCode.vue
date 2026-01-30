<template>
  <AutoFixHeightPage :show-footer="false" class="dark:bg-red">
    <template #header>
      <div class="h-100px"></div>
      <HeaderBar
        :isOfficial="false"
        :hidden-right="true"
        :enable-default-background="false"
        :enable-shadow="false"
        :room-name="t('mobile_personal_info_qr.title')" />
    </template>

    <template #container>
      <div class="flex flex-col overflow-auto h-full relative">
        <img
          src="@/assets/mobile/chat-home/background.webp"
          class="absolute fixed top-0 left-0 w-full h-full z-0 dark:opacity-20" />

        <!-- 页面全部内容 -->
        <div class="flex flex-col flex-1 items-center p-15px z-2 my-15">
          <n-card class="flex flex-col rounded-15px py-10">
            <div class="flex flex-1 flex-col px-5 gap-10px">
              <div class="flex flex-wrap ps-3 gap-10px">
                <div class="flex h-auto">
                  <n-avatar round :size="60" :src="AvatarUtils.getAvatarUrl(userStore.userInfo?.avatar || '')" />
                </div>

                <div
                  class="flex flex-col text-#4e4e4e h-auto gap-8px overflow-hidden justify-center text-18px whitespace-normal break-words max-w-46">
                  <n-text class="font-bold">{{ userInfo?.name }}</n-text>
                  <n-text depth="3" class="text-16px">
                    {{ t('mobile_personal_info_qr.account') }}:{{ userInfo?.account }}
                  </n-text>
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
                  :icon-src="AvatarUtils.getAvatarUrl(userStore.userInfo?.avatar ?? '')"
                  :icon-size="60"
                  :icon-margin="2"
                  :error-correction-level="qrErrorCorrectionLevel" />
              </div>

              <div class="flex justify-center text-gray">{{ t('mobile_personal_info_qr.scan_to_add') }}</div>
            </div>
          </n-card>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
