import { defineStore } from 'pinia'
import { PluginEnum, StoresEnum } from '@/enums'
import { pluginsList } from '@/layout/left/config.tsx'

export const usePluginsStore = defineStore(
  StoresEnum.PLUGINS,
  () => {
    /** 插件内容 */
    const plugins = ref(pluginsList.value.filter((p) => p.state === PluginEnum.BUILTIN) as STO.Plugins<PluginEnum>[])
    /** 插件查看模式 */
    const viewMode = ref<string>('card')

    /**
     * 设置插件
     * @param newPlugin 插件数据
     * @param newPlugin 插件数据
     */
    const addPlugin = (newPlugin: STO.Plugins<PluginEnum>) => {
      const index = plugins.value.findIndex((i) => i.title === newPlugin.title)
      index === -1 && plugins.value.push(newPlugin)
    }

    /**
     * 删除插件
     * @param p 插件数据
     * @param p 插件数据
     */
    const removePlugin = (p: STO.Plugins<PluginEnum>) => {
      const index = plugins.value.findIndex((i: STO.Plugins<PluginEnum>) => i.title === p.title)
      plugins.value.splice(index, 1)
    }

    /**
     * 更新插件状态
     * @param p 插件
     */
    const updatePlugin = (p: STO.Plugins<PluginEnum>) => {
      const index = plugins.value.findIndex((i) => i.title === p.title)
      index !== -1 && (plugins.value[index] = p)
    }

    onBeforeMount(() => {
      // 读取本地存储的插件数据
      if (localStorage.getItem(StoresEnum.PLUGINS)) {
        plugins.value = []
        JSON.parse(localStorage.getItem(StoresEnum.PLUGINS)!)['plugins']?.map((item: STO.Plugins<PluginEnum>) =>
          plugins.value.push(item)
        )
      }
    })

    return {
      plugins,
      viewMode,
      addPlugin,
      removePlugin,
      updatePlugin
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
