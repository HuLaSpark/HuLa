import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import type { IKeyboardDidShowDetail } from '../mobile/mobile-client/interface/adapter'

export type SafeArea = {
  bottom: number
  left: number
  right: number
  top: number
}

export const useMobileStore = defineStore(StoresEnum.MOBILE, () => {
  const initBottomTabBarPosition = ref<DOMRect>({
    height: 0,
    width: 0,
    x: 0,
    y: 0,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    toJSON: () => {}
  })

  const bottomTabBarPosition = ref<DOMRect>({
    height: 0,
    width: 0,
    x: 0,
    y: 0,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    toJSON: () => {}
  })

  const safeArea = ref<SafeArea>({
    bottom: -1,
    left: -1,
    right: -1,
    top: -1
  })

  const isFullScreen = ref<boolean>(true)

  const updateSafeArea = (newSafeArea: SafeArea) => {
    safeArea.value = newSafeArea

    // 自动修改当前状态是否为全屏
    if (newSafeArea.bottom === 0) {
      isFullScreen.value = false
    } else {
      isFullScreen.value = true
    }
  }

  const updateTabBarPosition = (options: { newPosition: DOMRect; isInit: boolean }) => {
    bottomTabBarPosition.value = options.newPosition
    if (options.isInit) {
      initBottomTabBarPosition.value = options.newPosition
    }
  }

  const keyboardDetail = reactive<IKeyboardDidShowDetail>({
    height: 0,
    visibleHeight: 0,
    screenHeight: 0,
    bottomInset: 0,
    timestamp: 0,
    keyboardVisible: false
  })

  const updateKeyboardDetail = (newDetail: IKeyboardDidShowDetail) => {
    // 判断弹出的键盘基础参数跟之前一样，那就不需要重新覆盖，就不会触发外部可能存在的watch监听
    if (newDetail.height === keyboardDetail.height && newDetail.bottomInset === keyboardDetail.bottomInset) {
      return
    }

    Object.assign(keyboardDetail, newDetail)
  }

  const updateKeyboardState = (state: boolean) => {
    Object.assign(keyboardDetail, {
      ...keyboardDetail,
      keyboardVisible: state
    })
  }

  const currentChatRoom: any = ref({})

  const updateCurrentChatRoom = (item: any) => {
    currentChatRoom.value = item
  }

  return {
    safeArea,
    updateSafeArea,
    updateTabBarPosition,
    bottomTabBarPosition,
    initBottomTabBarPosition,
    isFullScreen,
    keyboardDetail,
    updateKeyboardDetail,
    updateKeyboardState,
    currentChatRoom,
    updateCurrentChatRoom
  }
})
