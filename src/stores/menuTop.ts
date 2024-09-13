import { defineStore } from 'pinia'
import { PluginEnum, StoresEnum } from '@/enums'
import { usePluginsStore } from '@/stores/plugins.ts'

export const useMenuTopStore = defineStore(
  StoresEnum.MENUTOP,
  () => {
    const { getPluginType } = usePluginsStore()
    const pluginType = getPluginType(PluginEnum.BUILTIN)
    // 初始状态
    const initialState: OPT.L.Common[] = [
      {
        url: 'message',
        icon: 'message',
        iconAction: 'message-action'
      },
      {
        url: 'friendsList',
        icon: 'avatar',
        iconAction: 'avatar-action'
      }
    ]

    const menuTop = ref<STO.Plugins<PluginEnum>[]>(initialState as any)

    onBeforeMount(() => {
      if (!localStorage.getItem(StoresEnum.MENUTOP)) {
        menuTop.value.push(pluginType)
      }
    })

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
