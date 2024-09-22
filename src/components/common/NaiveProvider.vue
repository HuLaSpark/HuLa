<template>
  <n-config-provider
    :theme-overrides="themes.content === ThemeEnum.DARK ? darkThemeOverrides : lightThemeOverrides"
    :theme="globalTheme"
    :locale="zhCN"
    :date-locale="dateZhCN">
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider :max="notificMax">
          <n-message-provider :max="messageMax">
            <n-modal-provider>
              <slot></slot>
              <naive-provider-content />
            </n-modal-provider>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { setting } from '@/stores/setting.ts'
import { dateZhCN, darkTheme, lightTheme, GlobalThemeOverrides, zhCN } from 'naive-ui'
import { ThemeEnum } from '@/enums'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
/**监听深色主题颜色变化*/
const globalTheme = ref<any>(themes.value.content)
const prefers = matchMedia('(prefers-color-scheme: dark)')

/** 跟随系统主题模式切换主题 */
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

const commonTheme: GlobalThemeOverrides = {
  Input: {
    borderRadius: '10px',
    borderHover: '0',
    border: '0',
    borderDisabled: '0',
    borderFocus: '0',
    boxShadowFocus: '0'
  },
  Checkbox: {
    colorChecked: '#13987f',
    borderChecked: '1px solid #13987f',
    borderFocus: '1px solid #13987f',
    boxShadowFocus: '0 0 0 2px rgba(19, 152, 127, 0.3)'
  },
  Tag: {
    borderRadius: '4px'
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusSmall: '6px',
    colorPrimary: '#13987f'
  },
  Tabs: {
    tabTextColorSegment: '#707070',
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
  },
  Switch: {
    railColorActive: '#13987f',
    loadingColor: '#13987f',
    boxShadowFocus: '0 0 0 2px rgba(19, 152, 127, 0.3)'
  },
  Radio: {
    boxShadowActive: 'inset 0 0 0 1px #13987f',
    boxShadowFocus: 'inset 0 0 0 1px #13987f,0 0 0 2px rgba(19, 152, 127, 0.3)',
    boxShadowHover: 'inset 0 0 0 1px #13987f',
    dotColorActive: '#13987f'
  },
  Message: {
    iconColorSuccess: '#13987f',
    iconColorLoading: '#13987f',
    loadingColor: '#13987f',
    borderRadius: '8px'
  },
  Slider: {
    handleSize: '12px',
    fontSize: '10px',
    markFontSize: '8px',
    fillColor: '#13987f',
    fillColorHover: '#13987f',
    indicatorBorderRadius: '8px'
  }
}

/** 浅色模式的主题颜色 */
const lightThemeOverrides: GlobalThemeOverrides = {
  ...commonTheme,
  Scrollbar: {
    color: '#d5d5d5',
    colorHover: '#c5c5c5'
  }
}

/** 深色模式的主题颜色 */
const darkThemeOverrides: GlobalThemeOverrides = {
  ...commonTheme,
  Scrollbar: {
    color: 'rgba(255, 255, 255, 0.2)',
    colorHover: 'rgba(255, 255, 255, 0.3)'
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
  window.$modal = useModal()
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
