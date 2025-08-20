import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ImUrlEnum, StoresEnum } from '@/enums'
import type { UserInfoType } from '@/services/types'

export const useUserStore = defineStore(StoresEnum.USER, () => {
  const userInfo = ref<Partial<UserInfoType>>({})
  const isSign = ref(false)

  const getUserDetailAction = () => {
    invoke('im_request_command', {
      url: ImUrlEnum.GET_USER_INFO_DETAIL,
      method: 'GET'
    })
      .then((res: any) => {
        userInfo.value = { ...userInfo.value, ...res }
      })
      .catch((e) => {
        console.error('获取用户详情失败:', e)
      })
  }

  return { userInfo, isSign, getUserDetailAction }
})
