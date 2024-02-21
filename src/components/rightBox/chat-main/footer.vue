<template>
  <!-- 底部栏 -->
  <main
    class="wh-full bg-[--right-bg-color] color-[--icon-color] mt-6px"
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
      <ContextMenu class="relative w-full h-100px" @select="handleSelect($event.label)" :menu="menuList">
        <n-input
          class="absolute"
          :placeholder="null as any"
          style="border: 0; background: var(--right-bg-color)"
          type="textarea"
          size="small"
          autofocus
          v-model:value="contactInput"
          :autosize="{
            minRows: 4,
            maxRows: 4
          }" />
      </ContextMenu>

      <n-config-provider :theme="lightTheme">
        <n-button-group size="small" class="pr-20px">
          <n-button color="#059669" :disabled="contactInput.length === 0" class="w-65px">发送</n-button>
          <n-button color="#059669" class="p-[0_6px]">
            <template #icon>
              <svg class="w-22px h-22px"><use href="#down"></use></svg>
            </template>
          </n-button>
        </n-button-group>
      </n-config-provider>
    </div>
  </main>
</template>

<script setup lang="ts">
import { lightTheme } from 'naive-ui'

const menuList = ref([
  { label: '剪切', icon: 'screenshot', disabled: true },
  { label: '复制', icon: 'copy', disabled: true },
  { label: '粘贴', icon: 'intersection' },
  { label: '另存为', icon: 'download', disabled: true },
  { label: '全部选择', icon: 'check-one' }
])
const contactInput = ref('')

const handleSelect = (event: MouseEvent) => {
  console.log(event)
}
</script>

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
