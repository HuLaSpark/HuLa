import { defineStore } from 'pinia'

type IState = {
  loginInfo: {
    avatarUrl: string
    email: string
    nickname: string
    ipaddress: string
    username: string
    token: string
  }
}

export const userStore = defineStore('localUserInfo', {
  state: (): IState =>
    <IState>{
      loginInfo: {}
    },
  getters: {
    getBearerToken(): any {
      return this.loginInfo.token ? this.loginInfo.token : ''
    }
  },
  actions: {
    setLoginInfo(loginInfo: any) {
      this.loginInfo = loginInfo
    },
    logout() {
      this.$reset()
      //删除localStorage中的用户信息
      localStorage.removeItem('localUserInfo')
    }
  }
})
