<template>
  <div class="flex wh-full min-h-540px min-w-310px">
    <Left />
    <Combine v-if="isCombine" />
    <Center v-else />
    <Right v-if="!shrinkStatus && !isCombine" />
  </div>
</template>

<script setup lang="ts">
import Center from './center/index.vue'
import Left from './left/index.vue'
import Right from './right/index.vue'
import Combine from './combine/index.vue'
import Mitt from '@/utils/Bus'
import router from '@/router'

/* todo home窗口创建的时候已经设置了resizable: true,可以调整大小了，但是还是不可以调整大小 */
const shrinkStatus = ref(false)
// 判断是否是组合页面
const isCombine = computed(() => {
  return router.currentRoute.value.path.includes('/space')
})
/**
 * event默认如果没有传递值就为true，所以shrinkStatus的值为false就会发生值的变化
 * 因为shrinkStatus的值为false，所以v-if="!shrinkStatus" 否则right组件刚开始渲染的时候不会显示
 * */
Mitt.on('shrinkWindow', async (event) => {
  shrinkStatus.value = event as boolean
})
</script>
