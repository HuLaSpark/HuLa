import { MacOsKeyEnum, WinKeyEnum } from '@/enums'
import { isWindows } from '@/utils/PlatformConstants'
import { useI18nGlobal } from '~/src/services/i18n'

const key = computed(() => {
  return `${isWindows() ? WinKeyEnum.CTRL : MacOsKeyEnum['⌘']}`
})

const { t } = useI18nGlobal()

/** 侧边栏选项 */
const sideOptions = ref<OPT.L.SettingSide[]>([
  {
    url: '/general',
    label: t('setting.general.title'),
    icon: 'setting-config'
  },
  {
    url: '/notification',
    label: t('setting.notice.title'),
    icon: 'remind'
  },
  {
    url: '/shortcut',
    label: t('setting.shortcut.title'),
    icon: 'enter-the-keyboard'
  },
  {
    url: '/manageStore',
    label: t('setting.storage.title'),
    icon: 'mini-sd-card'
  },
  {
    url: '/loginSetting',
    label: t('setting.login.title'),
    icon: 'settings'
  },
  {
    url: '/versatile',
    label: t('setting.theme.title'), //'超级变变变'
    icon: 'platte',
    versionStatus: 'New'
  }
])

/** 发送按钮快捷键的选项 */
const sendOptions = [
  {
    label: t('setting.shortcut.send_message_shortcut_option', { key: 'Enter' }),
    value: 'Enter'
  },
  {
    label: t('setting.shortcut.send_message_shortcut_option', { key: key.value }),
    value: `${key.value}+Enter`
  }
]

/** 翻译提供商的选项 */
const translateOptions = [
  {
    label: '腾讯云翻译',
    value: 'tencent'
  },
  {
    label: '有道云翻译',
    value: 'youdao'
  }
]

/** 字体 */
const fontOptions = [
  {
    label: '苹方',
    value: 'PingFang'
  },
  {
    label: '阿里妈妈方圆体',
    value: 'AliFangYuan'
  }
]

const langOptions = [
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

export { sideOptions, sendOptions, fontOptions, translateOptions, langOptions }
