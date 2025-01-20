<template>
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy data-tauri-drag-region />

    <n-flex vertical :size="25" align="center" class="pt-30px">
      <span class="text-(16px #70938c) font-bold textFont">网络代理设置</span>
      <n-flex vertical :size="10" justify="center">
        <p class="text-12px">类型</p>
        <n-select class="min-w-240px" v-model:value="proxyType" :options="options" />

        <n-collapse-transition :show="proxyType === 'http'">
          <n-flex vertical :size="10" justify="center">
            <p class="text-12px pt-14px">IP地址</p>
            <n-input class="rounded-6px text-12px" v-model:value="IP" type="text" placeholder="例如：127.0.0.1" />

            <p class="text-12px pt-14px">端口号</p>
            <n-input
              class="rounded-6px text-12px"
              v-model:value="port"
              type="text"
              placeholder="HTTP:7890 或 SOCKS5:7891" />
          </n-flex>

          <p @click="proxyTest" class="text-(14px #13987f center) cursor-pointer pt-20px">网络代理测试</p>
        </n-collapse-transition>
      </n-flex>

      <n-flex align="center" justify="center" :size="40" class="pt-10px">
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

const options = [
  {
    label: '不使用代理',
    value: ''
  },
  {
    label: 'HTTP代理',
    value: 'http'
  },
  {
    label: 'SOCKS5代理',
    value: 'socks5'
  }
]

const proxyType = ref(options[0].value)
const IP = ref('')
const port = ref('')

// 从本地存储加载代理设置
onMounted(() => {
  const savedProxy = localStorage.getItem('proxySettings')
  if (savedProxy) {
    const settings = JSON.parse(savedProxy)
    proxyType.value = settings.type
    IP.value = settings.ip
    port.value = settings.port
  }
})

// 保存代理设置
const handleSave = async () => {
  try {
    if (proxyType.value && (!IP.value || !port.value)) {
      window.$message.warning('请填写完整的代理信息')
      return
    }

    // 保存到本地存储
    const proxySettings = {
      type: proxyType.value,
      ip: IP.value,
      port: port.value
    }
    localStorage.setItem('proxySettings', JSON.stringify(proxySettings))

    window.$message.success('代理设置保存成功')
    router.push('/login')
  } catch (error) {
    window.$message.error('代理设置失败：' + error)
  }
}

// 测试代理连接
const proxyTest = async () => {
  if (proxyType.value && (!IP.value || !port.value)) {
    window.$message.warning('请填写完整的代理信息')
    return
  }

  try {
    window.$message.loading('正在测试代理连接...', {
      duration: 0
    })

    const result = await invoke('test_proxy', {
      proxyType: proxyType.value,
      proxyHost: IP.value,
      proxyPort: Number(port.value)
    })

    if (result) {
      window.$message.success('代理连接测试成功')
    } else {
      window.$message.error('代理连接测试失败')
    }
  } catch (error) {
    // 显示具体的错误信息
    window.$message.error(`代理测试失败: ${error}`)
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
</style>
