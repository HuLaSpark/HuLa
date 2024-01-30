<template>
  <!-- 顶部操作栏和显示用户名 -->
  <div
    class="flex-y-center justify-between pl-20px pr-20px pt-8px pb-12px select-none shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
    <div>宝贝🐶 ⛅</div>
    <div class="options flex-y-center gap-20px">
      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg @click="handleClick"><use href="#phone-telephone"></use></svg>
            </div>
          </template>
          <span>语言通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#video-one"></use></svg>
            </div>
          </template>
          <span>视频通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#screen-sharing"></use></svg>
            </div>
          </template>
          <span>屏幕共享</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#remote-control"></use></svg>
            </div>
          </template>
          <span>远程协助</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#launch"></use></svg>
            </div>
          </template>
          <span>发起群聊</span>
        </n-popover>
      </div>

      <div class="options-box">
        <svg><use href="#more"></use></svg>
      </div>
    </div>
  </div>

  <!-- 中间聊天内容 -->
  <n-scrollbar style="max-height: calc(100vh - 260px)">
    <div class="user-box w-full h-75px mb-5px" v-for="n in 20" :key="n">
      <div class="flex items-center h-full pl-6px pr-8px gap-10px">
        <img class="w-44px h-44px rounded-50% bg-#fff border-[1px_solid_#f1f1f1]" src="/logo.png" alt="" />

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
  </n-scrollbar>

  <!-- 底部输入框 -->
  <div class="wh-full bg-#f1f1f1" style="box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.08)">
    <!-- 输入框顶部选项栏 -->
    <div class="flex-between-center p-[10px_22px]">
      <div class="input-options flex-y-center gap-20px">
        <svg><use href="#smiling-face"></use></svg>
        <svg><use href="#screenshot"></use></svg>
        <svg><use href="#file2"></use></svg>
        <svg><use href="#photo"></use></svg>
        <svg><use href="#red-packet"></use></svg>
        <svg><use href="#voice"></use></svg>
      </div>

      <span>记录</span>
    </div>

    <div class="pl-20px flex flex-col items-end gap-6px">
      <n-input
        autofocus
        style="border: 0; background: #f1f1f1"
        type="textarea"
        size="small"
        v-model:value="contactInput"
        :autosize="{
          minRows: 4,
          maxRows: 4
        }" />

      <n-button-group size="small" class="pr-20px">
        <n-button color="#059669" :disabled="contactInput.length === 0" class="w-65px">发送</n-button>
        <n-button color="#059669" class="p-[0_6px]">
          <template #icon>
            <svg class="w-22px h-22px"><use href="#down"></use></svg>
          </template>
        </n-button>
      </n-button-group>
    </div>
  </div>
</template>
<script setup lang="ts">
const contactInput = ref('')

const handleClick = () => {
  console.log(111)
}
</script>

<style scoped lang="scss">
.options {
  .options-box {
    cursor: pointer;
    svg {
      width: 22px;
      height: 22px;
    }
    &:hover svg {
      color: #059669;
      animation: twinkle 0.3s ease-in-out;
    }
  }
}

.input-options {
  svg {
    width: 22px;
    height: 22px;
    cursor: pointer;
  }
}

:deep(.n-input .n-input-wrapper) {
  padding: 0;
}
</style>
