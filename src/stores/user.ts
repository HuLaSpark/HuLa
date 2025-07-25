import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import apis from '@/services/apis'
import type { UserInfoType } from '@/services/types'

export const useUserStore = defineStore(StoresEnum.USER, () => {
  const userInfo = ref<Partial<UserInfoType>>({})
  const isSign = ref(false)

  const getUserDetailAction = () => {
    apis
      .getUserDetail()
      .then((res) => {
        userInfo.value = { ...userInfo.value, ...res }
      })
      .catch(() => {
        // 删除缓存
        localStorage.removeItem('TOKEN')
        localStorage.removeItem('REFRESH_TOKEN')
      })
  }

  return { userInfo, isSign, getUserDetailAction }
})
