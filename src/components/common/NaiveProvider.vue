<template>
  <n-config-provider
    :theme-overrides="themeOverrides"
    :theme="globalTheme"
    :locale="NLanguage"
    :date-locale="NDataLanguage">
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
import { dateZhCN, darkTheme, GlobalThemeOverrides, zhCN } from 'naive-ui'

const themeStore = theme()
const { EYE_THEME } = storeToRefs(themeStore)
/*调整naive ui的国际化*/
const NLanguage = ref(zhCN)
const NDataLanguage = ref(dateZhCN)
provide('NLanguage', NLanguage)
provide('NDataLanguage', NDataLanguage)
/*监听深色主题颜色变化*/
const globalTheme = ref<any>(EYE_THEME.value)
watchEffect(() => {
  globalTheme.value = EYE_THEME.value ? darkTheme : null
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
