import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { UserInfoType } from '@/services/types'
import { getUserDetail } from '@/utils/ImRequestUtils'

export const useUserStore = defineStore(
  StoresEnum.USER,
  () => {
    const userInfo = ref<UserInfoType>()

    const getUserDetailAction = () => {
      getUserDetail()
        .then((res: any) => {
          userInfo.value = { ...userInfo.value, ...res }
        })
        .catch((e) => {
          console.error('获取用户详情失败:', e)
        })
    }

    const isMe = computed(() => (id: string) => {
      return userInfo.value?.uid === id
    })

    return { userInfo, getUserDetailAction, isMe }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
