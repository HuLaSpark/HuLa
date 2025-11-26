import { computed } from 'vue'
import { MacOsKeyEnum, WinKeyEnum } from '@/enums'
import { isWindows } from '@/utils/PlatformConstants'
import { useI18n } from 'vue-i18n'

const useSideOptions = () => {
  const { t } = useI18n()

  return computed<OPT.L.SettingSide[]>(() => [
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
      label: t('setting.theme.title'),
      icon: 'platte',
      versionStatus: 'setting.common.tag_new'
    }
  ])
}

/** 发送按钮快捷键的选项 */
const useSendOptions = () => {
  const { t } = useI18n()
  const key = computed(() => {
    return `${isWindows() ? WinKeyEnum.CTRL : MacOsKeyEnum['⌘']}`
  })

  return computed(() => [
    {
      label: t('setting.shortcut.send_message_shortcut_option', { key: 'Enter' }),
      value: 'Enter'
    },
    {
      label: t('setting.shortcut.send_message_shortcut_option', { key: key.value }),
      value: `${key.value}+Enter`
    }
  ])
}

/** 翻译提供商的选项 */
const useTranslateOptions = () => {
  const { t } = useI18n()
  return computed(() => [
    {
      label: t('setting.general.chat.translate_options.tencent'),
      value: 'tencent'
    },
    {
      label: t('setting.general.chat.translate_options.youdao'),
      value: 'youdao'
    }
  ])
}

/** 字体 */
const useFontOptions = () => {
  const { t } = useI18n()
  return computed(() => [
    {
      label: t('setting.general.ui.font_options.PingFang'),
      value: 'PingFang'
    },
    {
      label: t('setting.general.ui.font_options.AliFangYuan'),
      value: 'AliFangYuan'
    }
  ])
}

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

export { useSideOptions, useSendOptions, useFontOptions, useTranslateOptions, langOptions }
