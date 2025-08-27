import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { UserInfoType } from '@/services/types'
import { getUserDetail } from '@/utils/ImRequestUtils'

export const useUserStore = defineStore(
  StoresEnum.USER,
  () => {
    const userInfo = ref<Partial<UserInfoType>>({})
    const isSign = ref(false)

    const getUserDetailAction = () => {
      getUserDetail()
        .then((res: any) => {
          userInfo.value = { ...userInfo.value, ...res }
        })
        .catch((e) => {
          console.error('获取用户详情失败:', e)
        })
    }

    return { userInfo, isSign, getUserDetailAction }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
