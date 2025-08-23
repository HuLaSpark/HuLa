import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { ConfigType } from '@/services/types'
import * as ImRequestUtils from '@/utils/ImRequestUtils'

export const useConfigStore = defineStore(StoresEnum.CONFIG, () => {
  const config = ref<ConfigType>({} as any)

  /** 初始化配置 */
  const initConfig = async () => {
    const res = await ImRequestUtils.initConfig()
    config.value = res
  }

  /** 获取七牛配置 */
  const getQiNiuConfig = () => config.value.qiNiu

  return { config, initConfig, getQiNiuConfig }
})
