<template>
  <!-- 底部栏 -->
  <main
    class="wh-full relative z-10 bg-[--right-bg-color] color-[--icon-color]"
    style="box-shadow: 0 -4px 4px var(--box-shadow-color)">
    <!-- 输入框顶部选项栏 -->
    <nav class="flex-between-center p-[10px_22px] select-none">
      <nav class="input-options flex-y-center">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#smiling-face"></use></svg>
            </div>
          </template>
          <span>表情</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center gap-2px mr-12px">
              <svg><use href="#screenshot"></use></svg>
              <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
            </div>
          </template>
          <span>截图</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center gap-2px mr-12px">
              <svg><use href="#file2"></use></svg>
              <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
            </div>
          </template>
          <span>文件</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#photo"></use></svg>
            </div>
          </template>
          <span>图片</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#shake"></use></svg>
            </div>
          </template>
          <span>窗口抖动</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#red-packet"></use></svg>
            </div>
          </template>
          <span>红包</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#voice"></use></svg>
            </div>
          </template>
          <span>语音信息</span>
        </n-popover>
      </nav>

      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg class="w-22px h-22px cursor-pointer"><use href="#history"></use></svg>
          </div>
        </template>
        <span>聊天记录</span>
      </n-popover>
    </nav>

    <!-- 输入框及其发送按钮 -->
    <div class="pl-20px flex flex-col items-end gap-6px">
      <MsgInput />
    </div>
  </main>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.input-options {
  svg {
    width: 22px;
    height: 22px;
    cursor: pointer;
    &:hover {
      color: #059669;
    }
  }
}

:deep(.n-input .n-input-wrapper) {
  padding: 0;
}
</style>
