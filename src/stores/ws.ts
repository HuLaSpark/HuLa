import { defineStore } from 'pinia'

export enum LoginStatus {
  Init,
  Waiting,
  Success
}

export const useWsLoginStore = defineStore('wsLogin', () => {
  const loginQrCode = ref<string>()
  const loginStatus = ref(LoginStatus.Init)
  function resetLoginState() {
    loginQrCode.value = undefined
    loginStatus.value = LoginStatus.Init
  }

  return {
    loginQrCode,
    loginStatus,
    resetLoginState
  }
})
