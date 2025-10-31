import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { UserInfoType } from '@/services/types'
import { getUserDetail } from '@/utils/ImRequestUtils'
import * as PathUtil from '@/utils/PathUtil'
import { useGlobalStore } from './global'

export const useUserStore = defineStore(
  StoresEnum.USER,
  () => {
    const userInfo = ref<UserInfoType>()
    const globalStore = useGlobalStore()

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

    const getUserRoomDir = async () => {
      return await PathUtil.getUserVideosDir(userInfo.value!.uid, globalStore.currentSessionRoomId)
    }

    const getUserRoomAbsoluteDir = async () => {
      return await PathUtil.getUserAbsoluteVideosDir(userInfo.value!.uid, globalStore.currentSessionRoomId)
    }

    return { userInfo, getUserDetailAction, isMe, getUserRoomDir, getUserRoomAbsoluteDir }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
