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
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { dateZhCN, darkTheme, lightTheme, GlobalThemeOverrides, zhCN } from 'naive-ui'
import { ThemeEnum } from '@/enums'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
/*监听深色主题颜色变化*/
const globalTheme = ref<any>(themes.value.content)
const prefers = matchMedia('(prefers-color-scheme: dark)')

/* 跟随系统主题模式切换主题 */
const followOS = () => {
  globalTheme.value = prefers.matches ? darkTheme : lightTheme
  document.documentElement.dataset.theme = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
  themes.value.content = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
}

watchEffect(() => {
  if (themes.value.pattern === ThemeEnum.OS) {
    followOS()
    themes.value.pattern = ThemeEnum.OS
    prefers.addEventListener('change', followOS)
  } else {
    // 判断content是否是深色还是浅色
    document.documentElement.dataset.theme = themes.value.content || ThemeEnum.LIGHT
    globalTheme.value = themes.value.content === ThemeEnum.DARK ? darkTheme : lightTheme
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
  },
  Popover: {
    padding: '5px',
    borderRadius: '8px'
  },
  Dropdown: {
    borderRadius: '8px'
  },
  Avatar: {
    border: '1px solid #fff'
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
