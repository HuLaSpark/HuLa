<template>
  <MobileLayout class="bg-gray-100 px-20px" :safeAreaTop="true" :safeAreaBottom="true">
    <HeaderBar
      :isOfficial="false"
      :hidden-right="true"
      :enable-default-background="false"
      :enable-shadow="false"
      room-name="登录确认" />

    <div
      class="flex flex-col rounded-15px bg-white pt-30px py-20px items-center justify-between gap-20px mt-40px h-70%">
      <div class="flex flex-col items-center gap-20px">
        <div class="flex items-center">
          <div class="text-26px">登录</div>
          <img src="@/assets/mobile/2.svg" alt="" class="w-85px h-22px" />
        </div>

        <van-checkbox-group v-model="checked" checked-color="#487D68" class="flex flex-col gap-14px text-14px">
          <van-checkbox name="1">同步最近的消息</van-checkbox>
          <van-checkbox name="2">自动登录该设备</van-checkbox>
        </van-checkbox-group>
      </div>
      <div class="flex w-45% gap-30px justify-center items-center flex-col">
        <van-button @click="handleConfirmLogin" color="#487D68" class="w-full" type="primary">确定登录</van-button>
        <div @click="handleCancelLogin" class="w-full text-center text-gray-600">取消登录</div>
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'

const router = useRouter()
const checked = ref(['1'])

const settingStore = useSettingStore()

const handleConfirmLogin = () => {
  settingStore.setAutoLogin(true) // 设置自动登录
  const selectedValue = checked.value
  selectedValue // 引用一次，避免未使用警告，后面可删除

  // 加上处理同步的逻辑

  // 跳转到主页面
  router.push('/mobile/home')
}

const handleCancelLogin = () => {
  // 回退则不设置自动登录，就把登录当作取消
  router.back()
}
</script>

<style lang="scss" scoped></style>
