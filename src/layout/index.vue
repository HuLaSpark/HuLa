<template>
  <div class="flex wh-full min-h-540px min-w-310px" style="background: rgba(255, 255, 255, 0.6)">
    <Left />
    <Center />
    <Right v-if="!shrinkStatus" />
  </div>
</template>

<script setup lang="ts">
import Center from '@/layout/center/index.vue'
import Left from '@/layout/left/index.vue'
import Right from '@/layout/right/index.vue'
import Mitt from '@/utils/Bus'
/* todo home窗口创建的时候已经设置了resizable: true,可以调整大小了，但是还是不可以调整大小 */
const shrinkStatus = ref(false)
/**
 * event默认如果没有传递值就为true，所以shrinkStatus的值为false就会发生值的变化
 * 因为shrinkStatus的值为false，所以v-if="!shrinkStatus" 否则right组件刚开始渲染的时候不会显示
 * */
Mitt.on('shrinkWindow', async (event) => {
  shrinkStatus.value = event as boolean
})
</script>
