<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="设置" />
    </template>

    <template #container="{ height }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: height + 'px' }" class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px">
          <!-- 设置项 -->
          <div
            v-for="item in settings"
            :key="item.key"
            class="flex justify-between items-center bg-white p-12px rounded-lg shadow-sm">
            <div class="text-base">{{ item.label }}</div>
            <div>
              <!-- 根据 type 渲染对应组件 -->
              <n-switch v-if="item.type === 'switch'" v-model:value="item.value" />
              <n-input v-else-if="item.type === 'input'" v-model="item.value" placeholder="请输入" class="w-40" />
              <n-select
                v-else-if="item.type === 'select'"
                v-model="item.value"
                :options="item.options"
                placeholder="请选择"
                class="w-40" />
            </div>
          </div>

          <!-- 退出登录按钮 -->
          <div class="mt-auto flex justify-center mb-20px">
            <n-button type="error" @click="handleLogout">退出登录</n-button>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { info } from '@tauri-apps/plugin-log'
import { NInput, NSelect, NSwitch } from 'naive-ui'
import { EventEnum, TauriCommand, ThemeEnum } from '@/enums'
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user'
import { invokeSilently } from '@/utils/TauriInvokeHandler'

const globalStore = useGlobalStore()
const { isTrayMenuShow } = storeToRefs(globalStore)
const dialog = useDialog()
const settingStore = useSettingStore()
const userStore = useUserStore()

// 定义设置项
const settings = reactive([
  {
    key: 'notifications',
    label: '消息通知',
    type: 'switch',
    value: computed({
      get: () => true,
      set: () => {
        /* 更新通知设置 */
      }
    })
  },
  {
    key: 'username',
    label: '昵称',
    type: 'input',
    value: computed({
      get: () => userStore.userInfo?.name || '',
      set: () => {}
    })
  },
  {
    key: 'theme',
    label: '界面主题',
    type: 'select',
    value: computed({
      get: () => settingStore.themes.content,
      set: (val) => settingStore.toggleTheme(val)
    }),
    options: [
      { label: '浅色', value: ThemeEnum.LIGHT },
      { label: '深色', value: ThemeEnum.DARK }
    ]
  },
  {
    key: 'language',
    label: '应用语言',
    type: 'select',
    value: computed({
      get: () => 'zh',
      set: () => {}
    }),
    options: [
      { label: '中文', value: 'zh' },
      { label: 'English', value: 'en' },
      { label: '日本語', value: 'ja' }
    ]
  }
])
// 退出登录逻辑
async function handleLogout() {
  dialog.error({
    title: '提示',
    content: '确定要退出登录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      info('登出账号')
      isTrayMenuShow.value = false
      try {
        // ws 退出连接
        await invokeSilently('ws_disconnect')
        await invokeSilently(TauriCommand.REMOVE_TOKENS)
        await invokeSilently(TauriCommand.UPDATE_USER_LAST_OPT_TIME)
        // 发送登出事件

        await emit(EventEnum.LOGOUT)
        router.push('/mobile/login')
      } catch (error) {
        console.error('创建登录窗口失败:', error)
      }
    },
    onNegativeClick: () => {
      console.log('用户点击了取消')
    }
  })
}

// 你可以根据需要导出或操作 settings 数据
</script>

<style lang="scss" scoped></style>
