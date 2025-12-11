import { defineStore } from 'pinia'
import { PluginEnum, StoresEnum } from '@/enums'
import { usePluginsList } from '@/layout/left/config.tsx'

export const usePluginsStore = defineStore(
  StoresEnum.PLUGINS,
  () => {
    const pluginsList = usePluginsList()
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
      const index = plugins.value.findIndex((i) => i.url === newPlugin.url)
      index === -1 && plugins.value.push(newPlugin)
    }

    /**
     * 删除插件
     * @param p 插件数据
     * @param p 插件数据
     */
    const removePlugin = (p: STO.Plugins<PluginEnum>) => {
      const index = plugins.value.findIndex((i: STO.Plugins<PluginEnum>) => i.url === p.url)
      plugins.value.splice(index, 1)
    }

    /**
     * 更新插件状态
     * @param p 插件
     */
    const updatePlugin = (p: STO.Plugins<PluginEnum>) => {
      const index = plugins.value.findIndex((i) => i.url === p.url)
      index !== -1 && (plugins.value[index] = p)
    }

    const syncPluginsWithLocale = (latest: STO.Plugins<PluginEnum>[]) => {
      plugins.value = plugins.value.map((plugin) => {
        const updated = latest.find((p) => p.url === plugin.url)
        return updated
          ? {
              ...plugin,
              size: updated.size ? { ...plugin.size, ...updated.size } : plugin.size,
              window: updated.window ? { ...plugin.window, ...updated.window } : plugin.window,
              title: updated.title,
              shortTitle: updated.shortTitle
            }
          : plugin
      })
    }

    watch(pluginsList, (latest) => syncPluginsWithLocale(latest), { immediate: true })

    onBeforeMount(() => {
      // 读取本地存储的插件数据
      if (localStorage.getItem(StoresEnum.PLUGINS)) {
        plugins.value = []
        JSON.parse(localStorage.getItem(StoresEnum.PLUGINS)!)['plugins']?.map((item: STO.Plugins<PluginEnum>) =>
          plugins.value.push(item)
        )
        syncPluginsWithLocale(pluginsList.value)
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
