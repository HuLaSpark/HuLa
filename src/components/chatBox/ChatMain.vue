<template>
  <!-- 顶部操作栏和显示用户名 -->
  <div class="flex-y-center justify-between pl-20px pr-20px pt-8px pb-12px select-none">
    <div>宝贝🐶 ⛅</div>
    <div class="options flex-y-center">
      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        class="ml-18px"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg @click="handleClick" class="w-22px h-22px"><use href="#phone-telephone"></use></svg>
          </div>
        </template>
        <span>语言通话</span>
      </n-popover>
      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        class="ml-18px"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg class="w-22px h-22px"><use href="#video-one"></use></svg>
          </div>
        </template>
        <span>视频通话</span>
      </n-popover>
      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        class="ml-18px"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg class="w-22px h-22px"><use href="#screen-sharing"></use></svg>
          </div>
        </template>
        <span>屏幕共享</span>
      </n-popover>
      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        class="ml-18px"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg class="w-22px h-22px"><use href="#remote-control"></use></svg>
          </div>
        </template>
        <span>远程协助</span>
      </n-popover>
      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        class="ml-18px"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg class="w-22px h-22px"><use href="#launch"></use></svg>
          </div>
        </template>
        <span>发起群聊</span>
      </n-popover>
      <svg class="w-28px h-28px" style="margin-left: 8px"><use href="#more"></use></svg>
    </div>
  </div>

  <!-- 中间聊天内容 -->
  <div class="h-400px">
    <div class="user-box w-full h-75px mb-5px" v-for="n in 20" :key="n">
      <div class="flex items-center h-full pl-6px pr-8px gap-10px">
        <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" src="/logo.png" alt="" />

        <div class="w-full h-38px flex flex-col justify-between">
          <div class="font-size-14px flex-y-center gap-4px">
            <p>宝贝🍓</p>
            <p>(快乐羊多多)</p>
          </div>

          <div
            class="text w-155px h-14px font-size-12px flex-y-center gap-4px"
            style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
            <p class="font-size-12px">[⛅今日天气]</p>
            <p>说的很经典哈萨克的哈萨克看到贺卡上</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 底部输入框 -->
  <div class="wh-full bg-#f1f1f1">输入内容</div>
</template>
<script setup lang="ts">
const handleClick = () => {
  console.log(111)
}
</script>

<style scoped lang="scss">
.options {
  svg {
    color: #000;
    margin-left: 20px;
    cursor: pointer;
    &:hover {
      color: #059669;
    }
  }
}
</style>
