<template>
  <div class="h-full flex flex-col bg-gray-100">
    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1 items-center px-15px">
      <div class="flex w-full flex-1 flex-col rounded-15px bg-white pt-40% items-center gap-20px">
        <div class="flex flex-col items-center gap-15px">
          <img class="w-100px h-100px" :src="qrCodeIcon" alt="" />
          <div class="text-20px font-bold text-#343434">
            登录
            <span class="text-#6B9C89">{{ props.deviceType }}</span>
            &nbsp;的HULA
          </div>
        </div>

        <div class="w-80% h-1px bg-gray-100"></div>

        <div class="flex flex-col w-80% gap-20px mt-10px">
          <div class="flex justify-between w-full">
            <span>登录IP</span>
            <span>{{ props.ip }}</span>
          </div>
          <div class="flex justify-between">
            <span>登录地址</span>
            <span>{{ props.locPlace }}</span>
          </div>
          <div class="flex justify-between">
            <span>登录时间</span>
            <span>{{ nowFormatted }}</span>
          </div>
        </div>

        <div class="w-80% h-1px bg-gray-100 mt-10px"></div>

        <!-- 登录按钮，带倒计时 -->
        <n-button
          :disabled="countdown <= 0"
          @click="handleConfirmLogin"
          class="px-50px bg-#6B9C89 text-white absolute bottom-20%">
          {{ countdown > 0 ? `登录 (${countdown}s)` : '二维码已过期' }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import router from '@/router'
import { confirmQRCodeAPI } from '@/utils/ImRequestUtils'

const now = ref(dayjs()) // 当前时间对象

const nowFormatted = computed(() => now.value.format('YYYY-MM-DD HH:mm:ss'))

// 倒计时
const countdown = ref(0)
let timer: number | null = null

const props = defineProps({
  ip: String,
  expireTime: String,
  deviceType: String,
  locPlace: String,
  qrId: String
})

const qrCodeIcon = ref('/logo.png')

const handleConfirmLogin = async () => {
  try {
    await confirmQRCodeAPI({ qrId: props.qrId as string })

    router.push('/mobile/message')
  } catch (error) {
    console.error('确认登录出错：', error)
  }
}

onMounted(() => {
  // console.log('确认登录页的props属性：', props)

  // 计算剩余秒数
  if (props.expireTime) {
    const expire = dayjs(Number(props.expireTime)) // 转成 dayjs 对象
    const diff = expire.diff(dayjs(), 'second') // 剩余秒数
    countdown.value = diff > 0 ? diff : 0
  }

  // 开启定时器
  timer = window.setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      if (timer) clearInterval(timer)
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped></style>
