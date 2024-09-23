<template>
  <n-flex vertical :size="40">
    <!-- 通用设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">外观设置</span>
      <n-flex align="center" :size="20" class="item">
        <n-flex
          vertical
          align="center"
          class="w-120px h-100px"
          :size="0"
          @click="activeItem = item.code"
          v-for="(item, index) in topicsList"
          :key="index">
          <div
            @click="handleTheme(item.code)"
            class="size-full rounded-8px cursor-pointer custom-shadow"
            :class="{ 'outline outline-2 outline-[--border-active-color] outline-offset': activeItem === item.code }">
            <component :is="item.model" />
          </div>
          <span class="text-12px pt-8px color-[--text-color]">{{ item.title }}</span>
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 系统设置 -->
    <n-flex v-if="type() === 'windows'" vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">系统</span>

      <n-flex class="item" :size="15" vertical>
        <!-- 关闭面板 -->
        <n-flex v-if="type() === 'windows'" align="center" justify="space-between">
          <span>关闭主面板</span>

          <label class="text-(14px #707070) flex gap-6px lh-16px items-center">
            <n-radio :checked="tips.type === CloseBxEnum.HIDE" @change="tips.type = CloseBxEnum.HIDE" />
            <span>最小化到系统托盘</span>
          </label>
          <label class="text-(14px #707070) flex gap-6px lh-16px items-center">
            <n-radio :checked="tips.type === CloseBxEnum.CLOSE" @change="tips.type = CloseBxEnum.CLOSE" />
            <span>直接退出程序</span>
          </label>

          <label class="text-(12px #909090) flex gap-6px justify-end items-center">
            <n-checkbox size="small" v-model:checked="tips.notTips" />
            <span>是否关闭提示</span>
          </label>
        </n-flex>

        <span v-if="type() === 'windows'" class="w-full h-1px bg-[--line-color]"></span>

        <!-- ESC关闭面板 -->
        <n-flex v-if="type() === 'windows'" align="center" justify="space-between">
          <span>是否启用ESC关闭窗口</span>

          <n-switch size="small" v-model:value="escClose" />
        </n-flex>
      </n-flex>
    </n-flex>

    <!--  聊天设置  -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">聊天</span>

      <n-flex class="item" :size="15" vertical>
        <!-- 发送信息 -->
        <n-flex align="center" justify="space-between">
          <span>发送信息快捷键</span>
          <n-select
            class="w-140px"
            size="small"
            label-field="value"
            v-model:value="chat.sendKey"
            :options="sendOptions" />
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <!-- 双击打开独立会话 -->
        <n-flex align="center" justify="space-between">
          <span>双击会话列表打开独立聊天窗口</span>

          <n-switch size="small" v-model:value="chat.isDouble" />
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 界面设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">界面</span>

      <n-flex class="item" :size="15" vertical>
        <!-- 发送信息 -->
        <n-flex align="center" justify="space-between">
          <span>是否开启阴影</span>

          <n-switch size="small" v-model:value="page.shadow" />
        </n-flex>

        <!-- 字体 -->
        <n-flex align="center" justify="space-between">
          <span>字体样式</span>
          <n-select
            class="w-140px"
            size="small"
            label-field="label"
            v-model:value="page.fonts"
            :options="fontOptions" />
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { setting } from '@/stores/setting.ts'
import { CloseBxEnum } from '@/enums'
import { topicsList } from './model.tsx'
import { sendOptions, fontOptions } from './config.ts'
import { type } from '@tauri-apps/plugin-os'

const settingStore = setting()
const { themes, tips, escClose, chat, page } = unref(settingStore)
const activeItem = ref<string>(themes.pattern)

/** 切换主题 */
const handleTheme = (code: string) => {
  if (code === themes.pattern) return
  settingStore.toggleTheme(code)
}
</script>

<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full p-12px box-border border-(solid 1px [--line-color]) custom-shadow;
}
</style>
