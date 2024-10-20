import { defineStore } from 'pinia'
import { PluginEnum, StoresEnum } from '@/enums'

export const useMenuTopStore = defineStore(
  StoresEnum.MENUTOP,
  () => {
    // 初始状态
    const initialState: OPT.L.Common[] = [
      {
        url: 'message',
        icon: 'message',
        iconAction: 'message-action',
        title: '消息列表',
        shortTitle: '消息'
      },
      {
        url: 'friendsList',
        icon: 'avatar',
        iconAction: 'avatar-action',
        title: '好友列表',
        shortTitle: '好友'
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
