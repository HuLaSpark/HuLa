import { defineStore } from 'pinia'
import { PluginEnum, StoresEnum } from '@/enums'
import { pluginsList } from '@/layout/left/config.tsx'

export const usePluginsStore = defineStore(
  StoresEnum.PLUGINS,
  () => {
    /** 插件内容 */
    const plugins = ref<STO.Plugins<PluginEnum>[]>([])
    /** 插件查看模式 */
    const viewMode = ref<string>('card')

    /**
     * 设置插件
     * @param newPlugins 插件数据
     */
    const setPlugins = (newPlugins: STO.Plugins<PluginEnum>[]) => {
      plugins.value = newPlugins
    }

    /**
     * 获取特定类型的插件
     * @param P 插件类型
     */
    const getPluginType = (P: PluginEnum) => {
      if (Object.keys(plugins.value).length === 0) {
        return pluginsList.value[P]
      } else {
        return plugins.value[P]
      }
    }

    /**
     * 更新插件状态
     * @param P 插件
     */
    const updatePlugins = (P: STO.Plugins<PluginEnum>) => {
      Object.values(plugins.value).find((item: STO.Plugins<PluginEnum>) => {
        if (item.title === P.title) {
          // 修改对应项插件状态
          item.state = P.state
          item.isAdd = P.isAdd
          setPlugins(plugins.value)
        }
      })
    }

    onBeforeMount(() => {
      // 读取本地存储的插件数据
      if (!localStorage.getItem(StoresEnum.PLUGINS)) {
        setPlugins(pluginsList.value)
      } else {
        Object.assign(pluginsList.value, JSON.parse(localStorage.getItem(StoresEnum.PLUGINS)!))
      }
    })

    return {
      plugins,
      viewMode,
      setPlugins,
      getPluginType,
      updatePlugins
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
