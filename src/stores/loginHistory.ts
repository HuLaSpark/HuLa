import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { UserInfoType } from '@/services/types.ts'

export const useLoginHistoriesStore = defineStore(
  StoresEnum.LOGIN_HISTORY,
  () => {
    const loginHistories = ref<UserInfoType[]>([])

    const getLoginHistoryIndex = (loginHistory: UserInfoType) => {
      return loginHistories.value.findIndex((i) => i.account === loginHistory.account)
    }

    const addLoginHistory = (loginHistory: UserInfoType) => {
      const index = getLoginHistoryIndex(loginHistory)
      index === -1 && loginHistories.value.push(loginHistory)
    }

    const updateLoginHistory = (loginHistory: UserInfoType) => {
      const index = getLoginHistoryIndex(loginHistory)
      index !== -1 && (loginHistories.value[index] = loginHistory)
    }

    const removeLoginHistory = (loginHistory: UserInfoType) => {
      const index = getLoginHistoryIndex(loginHistory)
      index !== -1 && loginHistories.value.splice(index, 1)
    }

    return { loginHistories, addLoginHistory, updateLoginHistory, removeLoginHistory }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
