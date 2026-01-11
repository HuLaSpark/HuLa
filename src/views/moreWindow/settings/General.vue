<template>
  <n-flex vertical :size="40">
    <!-- 通用设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">{{ t('setting.general.appearance.title') }}</span>
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
    <n-flex v-if="isWindows()" vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">{{ t('setting.general.system.title') }}</span>

      <n-flex class="item" :size="12" vertical>
        <!-- 关闭面板 -->
        <n-flex v-if="isWindows()" align="center" justify="space-between" :wrap="false">
          <span>{{ t('setting.general.system.close_panel') }}</span>

          <label class="text-(14px #707070) flex gap-6px lh-16px items-center">
            <n-radio :value="CloseBxEnum.HIDE" />
            <span>{{ t('setting.general.system.close_options.minimize_to_tray') }}</span>
          </label>
          <label class="text-(14px #707070) flex gap-6px lh-16px items-center">
            <n-radio :value="CloseBxEnum.CLOSE" />
            <span>{{ t('setting.general.system.close_options.exit_program') }}</span>
          </label>

          <label class="text-(12px #909090) flex gap-6px justify-end items-center">
            <n-checkbox size="small" v-model:checked="tips.notTips" />
            <span>{{ t('setting.general.system.close_prompt') }}</span>
          </label>
        </n-flex>

        <span v-if="isWindows()" class="w-full h-1px bg-[--line-color]"></span>

        <!-- ESC关闭面板 -->
        <n-flex v-if="isWindows()" align="center" justify="space-between">
          <span>{{ t('setting.general.system.esc_close_window') }}</span>

          <n-switch size="small" v-model:value="escClose" />
        </n-flex>
      </n-flex>
    </n-flex>

    <!--  聊天设置  -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">{{ t('setting.general.chat.title') }}</span>

      <n-flex class="item" :size="12" vertical>
        <!-- 双击打开独立会话 -->
        <!-- <n-flex align="center" justify="space-between">
          <span>双击会话列表打开独立聊天窗口</span>

          <n-switch size="small" v-model:value="chat.isDouble" />
        </n-flex> -->

        <!-- 翻译api选项 -->
        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.general.chat.translate_service') }}</span>

          <n-select
            class="w-140px"
            size="small"
            label-field="label"
            v-model:value="chat.translate"
            :options="translateOptions" />
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 界面设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">{{ t('setting.general.ui.title') }}</span>

      <n-flex class="item" :size="12" vertical>
        <!-- 字体 -->
        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.general.ui.language') }}</span>
          <n-select class="w-140px" size="small" label-field="label" v-model:value="page.lang" :options="langOptions" />
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.general.ui.blur') }}</span>

          <n-switch size="small" v-model:value="page.blur" />
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.general.ui.shadow') }}</span>

          <n-switch size="small" v-model:value="page.shadow" />
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <!-- 字体 -->
        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.general.ui.font') }}</span>
          <n-select
            class="w-140px"
            size="small"
            label-field="label"
            v-model:value="page.fonts"
            :options="fontOptions" />
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <!-- 菜单显示模式 -->
        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.general.ui.menu_name') }}</span>

          <n-switch size="small" v-model:value="showText" />
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { invoke } from '@tauri-apps/api/core'
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { NSwitch } from 'naive-ui'
import { CloseBxEnum, ShowModeEnum } from '@/enums'
import { useSettingStore } from '@/stores/setting.ts'
import { isWindows } from '@/utils/PlatformConstants'
import { useFontOptions, useTranslateOptions, langOptions } from './config.ts'
import { useTopicsList } from './model.tsx'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const { themes, tips, chat, page } = settingStore
const { showMode, escClose } = storeToRefs(settingStore)
const activeItem = ref<string>(themes.pattern)
const topicsList = useTopicsList()
const translateOptions = useTranslateOptions()
const fontOptions = useFontOptions()

const showText = computed({
  get: () => showMode.value === ShowModeEnum.TEXT,
  set: async (v: any) => {
    settingStore.setShowMode(v ? ShowModeEnum.TEXT : ShowModeEnum.ICON)
    await setHomeHeight()
    await emitTo(appWindow.label, 'startResize')
  }
})

/** 切换主题 */
const handleTheme = (code: string) => {
  settingStore.toggleTheme(code)
}

/** 调整主界面高度 */
const setHomeHeight = async () => {
  invoke('set_height', { height: showMode.value === ShowModeEnum.TEXT ? 505 : 423 })
}
</script>
<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full p-12px box-border border-(solid 1px [--line-color]) custom-shadow;
}
</style>
