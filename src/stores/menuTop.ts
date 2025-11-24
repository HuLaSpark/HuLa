import { defineStore } from 'pinia'
import { type PluginEnum, StoresEnum } from '@/enums'
import { useI18n } from 'vue-i18n'

export const useMenuTopStore = defineStore(
  StoresEnum.MENUTOP,
  () => {
    const { t } = useI18n()
    // 初始状态
    const initialState: OPT.L.Common[] = [
      {
        url: 'message',
        icon: 'message',
        iconAction: 'message-action',
        title: t('home.action.message'),
        shortTitle: t('home.action.message_short_title')
      },
      {
        url: 'friendsList',
        icon: 'avatar',
        iconAction: 'avatar-action',
        title: t('home.action.contact'),
        shortTitle: t('home.action.contact_short_title')
      }
    ]

    const menuTop = initialState as STO.Plugins<PluginEnum>[]

    return {
      menuTop
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
