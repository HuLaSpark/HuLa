<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar border :isOfficial="false" :hidden-right="true" :room-name="t('mobile_setting.title')" />
    </template>

    <template #container>
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% absolute top-0 -z-1" alt="hula" />
      <div class="flex flex-col z-1">
        <div class="flex flex-col p-20px gap-20px">
          <!-- 设置项 -->
          <div
            v-for="item in settings"
            :key="item.key"
            class="flex justify-between items-center bg-card text-card-foreground ring-1 p-12px rounded-lg shadow-sm">
            <div class="text-base">{{ item.label }}</div>
            <div>
              <!-- 根据 type 渲染对应组件 -->
              <n-switch v-if="item.type === 'switch'" v-model:value="item.value" />
              <n-input v-else-if="item.type === 'input'" v-model:value="item.value" placeholder="请输入" class="w-40" />
              <n-select
                v-else-if="item.type === 'select'"
                v-model:value="item.value"
                :options="item.options"
                placeholder="请选择"
                class="w-40" />
            </div>
          </div>

          <!-- 退出登录按钮 -->
          <div class="mt-auto flex justify-center mb-20px">
            <n-button type="error" @click="handleLogout" :disabled="isLoggingOut" :loading="isLoggingOut">
              {{ t('mobile_setting.button.logout') }}
            </n-button>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { info } from '@tauri-apps/plugin-log'
import { ThemeEnum } from '@/enums'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user'
import { useLogin } from '@/hooks/useLogin'
import { showDialog } from 'vant'
import * as ImRequestUtils from '@/utils/ImRequestUtils'
import router from '@/router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const globalStore = useGlobalStore()
const { isTrayMenuShow } = storeToRefs(globalStore)
const settingStore = useSettingStore()
const userStore = useUserStore()

// 定义设置项
const settings = reactive([
  {
    key: 'notifications',
    label: computed(() => t('mobile_setting.silent_label')),
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
    label: computed(() => t('mobile_setting.nickname')),
    type: 'input',
    value: computed({
      get: () => userStore.userInfo?.name || '',
      set: () => {}
    })
  },
  {
    key: 'theme',
    label: computed(() => t('mobile_setting.theme')),
    type: 'select',
    value: computed({
      get: () => settingStore.themes.content,
      set: (val) => settingStore.toggleTheme(val)
    }),
    options: [
      { label: computed(() => t('mobile_setting.themes.light')), value: ThemeEnum.LIGHT },
      { label: computed(() => t('mobile_setting.themes.dark')), value: ThemeEnum.DARK }
    ]
  },
  {
    key: 'language',
    label: computed(() => t('mobile_setting.language')),
    type: 'select',
    value: computed({
      get: () => settingStore.page.lang,
      set: (v) => {
        settingStore.page.lang = v
      }
    }),
    options: [
      {
        label: 'Automatic',
        value: 'AUTO'
      },
      {
        label: '简体中文',
        value: 'zh-CN'
      },
      {
        label: 'English',
        value: 'en'
      }
    ]
  }
])

const { logout, resetLoginState } = useLogin()

// 登出处理状态标志
const isLoggingOut = ref(false)

// 退出登录逻辑
async function handleLogout() {
  // 防止重复点击
  if (isLoggingOut.value) return
  isLoggingOut.value = true

  let logoutSuccess = false

  showDialog({
    title: '退出登录',
    message: '确定要退出登录吗？',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(async () => {
      try {
        await ImRequestUtils.logout({ autoLogin: true })
        logoutSuccess = true
      } catch (error) {
        console.error('服务器登出失败：', error)
      }

      // 无论服务器登出是否成功，都执行本地状态清理
      try {
        // 2. 重置登录状态
        await resetLoginState()
        // 3. 最后调用登出方法(这会创建登录窗口或发送登出事件)
        await logout()

        settingStore.toggleLogin(false, false)
        info('登出账号')
        isTrayMenuShow.value = false

        if (logoutSuccess) {
          window.$message.success('登出成功')
        }
        await router.push('/mobile/login')
      } catch (localError) {
        console.error('本地登出清理失败：', localError)
        window.$message.error('本地登出清理失败，请重启应用')
      }
    })
    .catch(() => {
      info('用户点击取消')
    })
    .finally(() => {
      // 无论成功还是失败，都重置标志
      isLoggingOut.value = false
    })
}

// 你可以根据需要导出或操作 settings 数据
</script>

<style lang="scss" scoped></style>
