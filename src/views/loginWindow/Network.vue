<template>
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy data-tauri-drag-region />

    <n-flex vertical :size="12" align="center" class="pt-10px">
      <span class="text-(16px #70938c) font-bold textFont">网络设置</span>

      <n-tabs type="line" animated justify-content="center" @update:value="handleTab">
        <n-tab-pane name="api" tab="API">
          <n-flex vertical :size="10" align="center" class="pt-10px">
            <n-flex vertical :size="8" justify="center">
              <p class="text-12px">类型</p>
              <n-select class="min-w-240px" v-model:value="savedProxy.apiType" :options="apiOptions" />

              <n-collapse-transition :show="savedProxy.apiType === 'http' || savedProxy.apiType === 'https'">
                <n-flex vertical :size="10" justify="center">
                  <p class="text-12px pt-6px">IP或域名</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.apiIp"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="127.0.0.1或hulaspark.com" />

                  <p class="text-12px pt-6px">端口</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.apiPort"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="443" />
                  <p class="text-12px pt-6px">后缀</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.apiSuffix"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="api" />
                </n-flex>
              </n-collapse-transition>
            </n-flex>
          </n-flex>
        </n-tab-pane>
        <n-tab-pane name="ws" tab="WebSocket">
          <n-flex vertical :size="10" align="center" class="pt-10px">
            <n-flex vertical :size="8" justify="center">
              <p class="text-12px">类型</p>
              <n-select class="min-w-240px" v-model:value="savedProxy.wsType" :options="wsOptions" />

              <n-collapse-transition :show="savedProxy.wsType === 'ws' || savedProxy.wsType === 'wss'">
                <n-flex vertical :size="10" justify="center">
                  <p class="text-12px pt-6px">IP或域名</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.wsIp"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="127.0.0.1或hulaspark.com" />

                  <p class="text-12px pt-6px">端口</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.wsPort"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="443" />
                  <p class="text-12px pt-6px">后缀</p>
                  <n-input
                    class="rounded-6px text-12px"
                    v-model:value="savedProxy.wsSuffix"
                    type="text"
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="websocket" />
                </n-flex>
              </n-collapse-transition>
            </n-flex>
          </n-flex>
        </n-tab-pane>
      </n-tabs>

      <n-flex align="center" justify="center" :size="40" class="pt-10px">
        <p @click="proxyTest" class="text-(14px #13987f) cursor-pointer">测试</p>
        <p @click="handleSave" class="text-(14px #13987f) cursor-pointer">保存</p>
        <p @click="router.push('/login')" class="text-(14px #707070) cursor-pointer">返回</p>
      </n-flex>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import router from '@/router'
import { invoke } from '@tauri-apps/api/core'

const apiOptions = [
  {
    label: '不使用(默认为官方地址)',
    value: ''
  },
  {
    label: 'HTTP',
    value: 'http'
  },
  {
    label: 'HTTPS',
    value: 'https'
  }
]

const wsOptions = [
  {
    label: '不使用(默认为官方地址)',
    value: ''
  },
  {
    label: 'WS',
    value: 'ws'
  },
  {
    label: 'WSS',
    value: 'wss'
  }
]

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
  let proxySettings = localStorage.getItem('proxySettings')
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
      window.$message.warning('请填写完整的网络设置信息')
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
        apiSuffix: savedProxy.apiSuffix
      }
    } else {
      // 保存到本地存储
      proxySettings = {
        ...savedProxy,
        wsType: savedProxy.wsType,
        wsIp: savedProxy.wsIp,
        wsPort: savedProxy.wsPort,
        wsSuffix: savedProxy.wsSuffix
      }
    }
    const settings = JSON.stringify(proxySettings)
    localStorage.setItem('proxySettings', settings)

    window.$message.success('网络设置保存成功')
    setTimeout(() => {
      location.reload()
    }, 1000)
  } catch (error) {
    window.$message.error('网络设置失败：' + error)
  }
}

// 测试网络连接
const proxyTest = async () => {
  if (
    (savedProxy.apiType && (!savedProxy.apiIp || !savedProxy.apiPort)) ||
    (savedProxy.wsType && (!savedProxy.wsIp || !savedProxy.wsPort))
  ) {
    window.$message.warning('请填写完整的网络信息')
    return
  }

  try {
    window.$message.loading('正在测试网络连接...', {
      duration: 0
    })

    const result = await invoke(proxy.value === 'api' ? 'test_api_proxy' : 'test_ws_proxy', {
      proxyType: proxy.value === 'api' ? savedProxy.apiType : savedProxy.wsType,
      proxyHost: proxy.value === 'api' ? savedProxy.apiIp : savedProxy.wsIp,
      proxyPort: Number(proxy.value === 'api' ? savedProxy.apiPort : savedProxy.wsPort),
      proxySuffix: proxy.value === 'api' ? savedProxy.apiSuffix : savedProxy.wsSuffix
    })

    if (result) {
      window.$message.success('网络连接测试成功')
    } else {
      window.$message.error('网络连接测试失败')
    }
  } catch (error) {
    // 显示具体的错误信息
    window.$message.error(`网络测试失败: ${error}`)
  } finally {
    window.$message.destroyAll() // 清除loading消息
  }
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

:deep(.hover-box) {
  @apply w-28px h24px flex-center hover:bg-#e7e7e7;
  svg {
    color: #404040;
  }
}
:deep(.action-close) {
  svg {
    color: #404040;
  }
}
</style>
