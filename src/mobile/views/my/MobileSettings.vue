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

    <template #container>
      <div class="flex flex-col">
        <div
          class="flex flex-col p-20px gap-20px bg-[url('@/assets/mobile/chat-home/background.webp')] bg-cover bg-center">
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
import { info } from '@tauri-apps/plugin-log'
import { ThemeEnum } from '@/enums'
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user'
import { useLogin } from '@/hooks/useLogin'
import { showDialog } from 'vant'

const globalStore = useGlobalStore()
const { isTrayMenuShow } = storeToRefs(globalStore)
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

const { logout } = useLogin()

// 退出登录逻辑
async function handleLogout() {
  showDialog({
    title: '退出登录',
    message: '确定要退出登录吗？',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(() => {
      settingStore.toggleLogin(false, false)
      info('登出账号')
      isTrayMenuShow.value = false
      logout()
      router.push('/mobile/login')
    })
    .catch(() => {
      info('用户点击取消')
    })
}

// 你可以根据需要导出或操作 settings 数据
</script>

<style lang="scss" scoped></style>
