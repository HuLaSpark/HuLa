<template>
  <n-config-provider :theme-overrides="themeOverrides" :theme="globalTheme" :locale="zhCN" :date-locale="dateZhCN">
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider :max="notificMax">
          <n-message-provider :max="messageMax">
            <slot></slot>
            <naive-provider-content />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { theme } from '@/stores/theme.ts'
import { storeToRefs } from 'pinia'
import { dateZhCN, darkTheme, lightTheme, GlobalThemeOverrides, zhCN } from 'naive-ui'
import { listenMsg } from '@/common/CrossTabMsg.ts'

const themeStore = theme()
const { THEME, PATTERN } = storeToRefs(themeStore)
/*监听深色主题颜色变化*/
const globalTheme = ref<any>(THEME.value)
const prefers = matchMedia('(prefers-color-scheme: dark)')

/* 跟随系统主题模式切换主题 */
const followOS = () => {
  globalTheme.value = prefers.matches ? darkTheme : lightTheme
  document.documentElement.dataset.theme = prefers.matches ? 'dark' : 'light'
  THEME.value = prefers.matches ? 'dark' : 'light'
}

/* 监听其他标签页的变化 */
listenMsg((msgInfo: any) => {
  if (msgInfo.content === 'os') {
    globalTheme.value = prefers.matches ? darkTheme : lightTheme
    document.documentElement.dataset.theme = prefers.matches ? 'dark' : 'light'
    THEME.value = prefers.matches ? 'dark' : 'light'
    PATTERN.value = 'os'
  } else {
    globalTheme.value = msgInfo.content === 'dark' ? darkTheme : lightTheme
    document.documentElement.dataset.theme = msgInfo.content === 'dark' ? 'dark' : 'light'
  }
})

watchEffect(() => {
  if (PATTERN.value === 'os') {
    followOS()
    prefers.addEventListener('change', followOS)
  } else {
    globalTheme.value = THEME.value === 'dark' ? darkTheme : lightTheme
    prefers.removeEventListener('change', followOS)
  }
})

/*调整naive ui的primary的主题颜色和样式*/
const themeOverrides: GlobalThemeOverrides = {
  Input: {
    borderRadius: '10px',
    borderHover: '0',
    border: '0',
    borderDisabled: '0',
    borderFocus: '0',
    boxShadowFocus: '0'
  },
  Checkbox: {
    colorChecked: '#059669',
    borderChecked: '1px solid #059669',
    borderFocus: '1px solid #059669',
    boxShadowFocus: '0 0 0 2px rgba(5, 150, 105, 0.3)'
  },
  Tag: {
    borderRadius: '4px'
  },
  Button: {
    borderRadiusMedium: '10px'
  },
  Tabs: {
    tabTextColorSegment: '#707070',
    tabTextColorActiveSegment: '#059669',
    tabTextColorHoverSegment: '#059669',
    tabPaddingMediumSegment: '4px'
  }
}

const { notificMax, messageMax } = defineProps<{
  notificMax?: number
  messageMax?: number
}>()
defineOptions({ name: 'NaiveProvider' })

// 挂载naive组件的方法至window, 以便在路由钩子函数和请求函数里面调用
const registerNaiveTools = () => {
  window.$loadingBar = useLoadingBar()
  window.$dialog = useDialog()
  window.$message = useMessage()
  window.$notification = useNotification()
}

const NaiveProviderContent = defineComponent({
  name: 'NaiveProviderContent',
  setup() {
    registerNaiveTools()
  },
  render() {
    return h('div')
  }
})
</script>
<style scoped></style>
