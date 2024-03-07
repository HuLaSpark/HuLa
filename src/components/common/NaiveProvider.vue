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
import { CrossTabTypeEnum, ThemeEnum } from '@/enums'

const themeStore = theme()
const { THEME, PATTERN } = storeToRefs(themeStore)
/*监听深色主题颜色变化*/
const globalTheme = ref<any>(THEME.value)
const prefers = matchMedia('(prefers-color-scheme: dark)')

/* 跟随系统主题模式切换主题 */
const followOS = () => {
  globalTheme.value = prefers.matches ? darkTheme : lightTheme
  document.documentElement.dataset.theme = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
  THEME.value = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
}

/* 监听其他标签页的变化 */
listenMsg((msgInfo: any) => {
  if (msgInfo.type === CrossTabTypeEnum.THEME) {
    if (msgInfo.content === ThemeEnum.OS) {
      // 赋值给ui组件库的主题
      globalTheme.value = prefers.matches ? darkTheme : lightTheme
      // 给全局的dataset.theme赋值主题
      document.documentElement.dataset.theme = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
      // 修改localStorage中的THEME和设置中选择(PATTERN)
      THEME.value = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
      PATTERN.value = ThemeEnum.OS
    } else {
      globalTheme.value = msgInfo.content === ThemeEnum.DARK ? darkTheme : lightTheme
      // 判断msgInfo.content是否是深色还是浅色
      document.documentElement.dataset.theme = msgInfo.content || ThemeEnum.LIGHT
    }
  }
})

watchEffect(() => {
  if (PATTERN.value === ThemeEnum.OS) {
    followOS()
    prefers.addEventListener('change', followOS)
  } else {
    globalTheme.value = THEME.value === ThemeEnum.DARK ? darkTheme : lightTheme
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
    padding: '5px'
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
