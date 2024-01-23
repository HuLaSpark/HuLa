<template>
  <!-- 消息框 -->
  <div class="msg-box w-full h-75px mb-5px" v-for="n in 20" :key="n">
    <div class="flex items-center h-full pl-6px pr-8px gap-10px">
      <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" src="/logo.png" alt="" />

      <div @click="handleMsgClick" class="w-full h-38px flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="font-size-14px">宝贝🍓</span>
          <span class="font-size-10px color-#808080">昨天</span>
        </div>

        <div class="flex items-center justify-between">
          <p
            class="w-135px font-size-12px color-#808080"
            style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
            说的很经典哈萨克的哈萨克看到贺卡上
          </p>

          <n-badge :value="msgTotal" :max="99" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'

const msgTotal = ref(0)
const msgBoxShow = ref(false)

watchEffect(() => {
  Mitt.emit('updateMsgTotal', msgTotal.value)
})

const handleMsgClick = () => {
  msgBoxShow.value = true
  Mitt.emit('msgBoxShow', msgBoxShow.value)
}

onMounted(() => {
  // setInterval(() => {
  //   msgTotal.value++
  // }, 1000)
})
</script>

<style scoped lang="scss">
.msg-box {
  &:first-child {
    background: #eeeeee;
    border-radius: 6px;
  }
  &:hover {
    background: #f3f3f3;
    border-radius: 6px;
    cursor: pointer;
  }
}

:deep(.n-badge .n-badge-sup) {
  font-weight: bold;
  font-size: 10px;
}
</style>
