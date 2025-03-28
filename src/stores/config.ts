import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import apis from '@/services/apis'
import { ConfigType } from '@/services/types'

export const useConfigStore = defineStore(StoresEnum.CONFIG, () => {
  const config = ref<ConfigType>({} as any)

  /** 初始化配置 */
  const initConfig = async () => {
    const res = await apis.initConfig()
    config.value = res
  }

  /** 获取七牛配置 */
  const getQiNiuConfig = () => config.value.qiNiu

  return { config, initConfig, getQiNiuConfig }
})
