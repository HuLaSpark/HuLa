<template>
  <n-config-provider :theme="naiveTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy data-tauri-drag-region />

    <n-flex vertical :size="12" align="center" class="pt-10px">
      <span class="text-(16px #70938c) textFont">{{ t('login.network.title') }}</span>

      <n-tabs type="line" animated justify-content="center" @update:value="handleTab">
        <n-tab-pane name="api" :tab="t('login.network.tabs.api')">
          <n-flex vertical :size="10" align="center" class="pt-10px">
            <n-flex vertical :size="8" justify="center">
              <p class="text-12px">{{ t('login.network.fields.type') }}</p>
              <n-select class="min-w-240px" v-model:value="savedProxy.apiType" :options="apiOptions" />

              <n-collapse-transition :show="savedProxy.apiType === 'http' || savedProxy.apiType === 'https'">
                <n-flex vertical :size="10" justify="center">
                  <p class="text-12px pt-6px">{{ t('login.network.fields.host') }}</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.apiIp"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    :placeholder="t('login.network.placeholder.host')" />

                  <p class="text-12px pt-6px">{{ t('login.network.fields.port') }}</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.apiPort"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    :placeholder="t('login.network.placeholder.port')" />
                  <p class="text-12px pt-6px">{{ t('login.network.fields.suffix') }}</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.apiSuffix"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    :placeholder="t('login.network.placeholder.api_suffix')" />
                </n-flex>
              </n-collapse-transition>
            </n-flex>
          </n-flex>
        </n-tab-pane>
        <n-tab-pane name="ws" :tab="t('login.network.tabs.ws')">
          <n-flex vertical :size="10" align="center" class="pt-10px">
            <n-flex vertical :size="8" justify="center">
              <p class="text-12px">{{ t('login.network.fields.type') }}</p>
              <n-select class="min-w-240px" v-model:value="savedProxy.wsType" :options="wsOptions" />

              <n-collapse-transition :show="savedProxy.wsType === 'ws' || savedProxy.wsType === 'wss'">
                <n-flex vertical :size="10" justify="center">
                  <p class="text-12px pt-6px">{{ t('login.network.fields.host') }}</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.wsIp"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    :placeholder="t('login.network.placeholder.host')" />

                  <p class="text-12px pt-6px">{{ t('login.network.fields.port') }}</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.wsPort"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    :placeholder="t('login.network.placeholder.port')" />
                  <p class="text-12px pt-6px">{{ t('login.network.fields.suffix') }}</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.wsSuffix"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    :placeholder="t('login.network.placeholder.ws_suffix')" />
                </n-flex>
              </n-collapse-transition>
            </n-flex>
          </n-flex>
        </n-tab-pane>
      </n-tabs>

      <n-flex align="center" justify="center" :size="40" class="pt-10px">
        <p @click="handleSave" class="text-(14px #13987f) cursor-pointer">{{ t('login.network.actions.save') }}</p>
        <p @click="router.push('/login')" class="text-(14px #707070) cursor-pointer">
          {{ t('login.network.actions.back') }}
        </p>
      </n-flex>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { darkTheme, lightTheme } from 'naive-ui'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { updateSettings } from '@/services/tauriCommand'
import { useSettingStore } from '@/stores/setting'
import type { ProxySettings } from '@/typings/global'
import { addSlashToHead } from '@/utils/StringUtils.ts'

const { t } = useI18n()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const naiveTheme = computed(() => (themes.value.content === 'dark' ? darkTheme : lightTheme))

const apiOptions = computed(() => [
  {
    label: t('login.network.api.options.none'),
    value: ''
  },
  {
    label: t('login.network.api.options.http'),
    value: 'http'
  },
  {
    label: t('login.network.api.options.https'),
    value: 'https'
  }
])

const wsOptions = computed(() => [
  {
    label: t('login.network.ws.options.none'),
    value: ''
  },
  {
    label: t('login.network.ws.options.ws'),
    value: 'ws'
  },
  {
    label: t('login.network.ws.options.wss'),
    value: 'wss'
  }
])

const proxy = ref('api')
const savedProxy = reactive({
  apiType: '',
  apiIp: '',
  apiPort: '',
  apiSuffix: '',
  wsType: '',
  wsIp: '',
  wsPort: '',
  wsSuffix: ''
})

// 从本地存储加载设置
onMounted(() => {
  const proxySettings = localStorage.getItem('proxySettings')
  if (proxySettings) {
    const parse = JSON.parse(proxySettings)
    savedProxy.apiType = parse.apiType
    savedProxy.apiIp = parse.apiIp
    savedProxy.apiPort = parse.apiPort
    savedProxy.apiSuffix = parse.apiSuffix
    savedProxy.wsType = parse.wsType
    savedProxy.wsIp = parse.wsIp
    savedProxy.wsPort = parse.wsPort
    savedProxy.wsSuffix = parse.wsSuffix
  }
})

const handleTab = async (tab: string) => {
  if (tab === 'api') {
    proxy.value = 'api'
  } else {
    proxy.value = 'ws'
  }
}

// 保存设置
const handleSave = async () => {
  try {
    if (
      (savedProxy.apiType && (!savedProxy.apiIp || !savedProxy.apiPort)) ||
      (savedProxy.wsType && (!savedProxy.wsIp || !savedProxy.wsPort))
    ) {
      window.$message.warning(t('login.network.messages.incomplete'))
      return
    }
    let proxySettings
    if (proxy.value === 'api') {
      // 保存到本地存储
      proxySettings = {
        ...savedProxy,
        apiType: savedProxy.apiType,
        apiIp: savedProxy.apiIp,
        apiPort: savedProxy.apiPort,
        apiSuffix: savedProxy.apiSuffix ? addSlashToHead(savedProxy.apiSuffix) : ''
      }
    } else {
      // 保存到本地存储
      proxySettings = {
        ...savedProxy,
        wsType: savedProxy.wsType,
        wsIp: savedProxy.wsIp,
        wsPort: savedProxy.wsPort,
        wsSuffix: savedProxy.wsSuffix ? addSlashToHead(savedProxy.wsSuffix) : ''
      }
    }
    const settings = JSON.stringify(proxySettings)
    localStorage.setItem('proxySettings', settings)
    await updateTauriSettings(proxySettings)
    console.log('settings', proxySettings)

    window.$message.success(t('login.network.messages.save_success'))
  } catch (error) {
    window.$message.error(t('login.network.messages.save_failed', { error }))
  }
}

const updateTauriSettings = async (proxySettings: ProxySettings) => {
  const baseUrl =
    proxySettings.apiType + '://' + proxySettings.apiIp + ':' + proxySettings.apiPort + proxySettings.apiSuffix
  const wsUrl = proxySettings.wsType + '://' + proxySettings.wsIp + ':' + proxySettings.wsPort + proxySettings.wsSuffix

  await updateSettings({ baseUrl, wsUrl }).catch((err) => {
    window.$message.error(t('login.network.messages.save_failed', { error: err }))
  })
}
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';

.textFont {
  font-family: AliFangYuan, sans-serif !important;
}

:deep(.n-input .n-input__input-el) {
  padding: 0;
  height: 30px;
  line-height: 30px;
}

:deep(.n-tabs .n-tabs-nav.n-tabs-nav--line-type.n-tabs-nav--top .n-tabs-nav-scroll-content) {
  border-bottom: 1px solid transparent;
}
</style>
