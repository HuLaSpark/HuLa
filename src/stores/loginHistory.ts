import { ref } from 'vue'
import { defineStore } from 'pinia'
import { StoresEnum } from '../enums'

export const useLoginHistoriesStore = defineStore(
  StoresEnum.LOGIN_HISTORY,
  () => {
    const loginHistories = ref<STO.Setting['login']['accountInfo'][]>([
      {
        account: 'admin',
        password: 'admin',
        name: '超级GG帮',
        avatar: 'https://picsum.photos/140?1',
        uid: 123456,
        token: 'test'
      },
      {
        account: 'hula1',
        password: 'hula1',
        name: '二狗子',
        avatar: 'https://picsum.photos/140?2',
        uid: 123456,
        token: 'test'
      },
      {
        account: 'hula2',
        password: 'hula2',
        name: '李山离',
        avatar: 'https://picsum.photos/140?3',
        uid: 123456,
        token: 'test'
      },
      {
        account: 'hula3',
        password: 'hula3',
        name: '牛什么呢',
        avatar: 'https://picsum.photos/140?4',
        uid: 123456,
        token: 'test'
      }
    ])

    const addLoginHistory = (loginHistory: STO.Setting['login']['accountInfo']) => {
      const index = loginHistories.value.findIndex((i) => i.account === loginHistory.account)
      index === -1 && loginHistories.value.push(loginHistory)
    }

    const removeLoginHistory = (loginHistory: STO.Setting['login']['accountInfo']) => {
      const index = loginHistories.value.findIndex((i) => i.account === loginHistory.account)
      index !== -1 && loginHistories.value.splice(index, 1)
    }

    return { loginHistories, addLoginHistory, removeLoginHistory }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
