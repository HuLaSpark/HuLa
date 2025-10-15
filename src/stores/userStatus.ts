import Colorthief from 'colorthief'
import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

const colorthief = new Colorthief()

// 状态图标颜色
const ensureStateColor = (state?: STO.UserState) => {
  if (!state || state.bgColor || !state.url) return

  const img = new Image()
  img.src = state.url
  img.onload = async () => {
    const colors = await colorthief.getColor(img, 3)
    state.bgColor = `rgba(${colors.join(',')}, 0.4)`
  }
}

export const useUserStatusStore = defineStore(
  StoresEnum.USER_STATE,
  () => {
    /** 在线状态列表 */
    const stateList = ref<STO.UserState[]>([])

    const stateId = ref<string>('1')

    const currentState = computed(() => {
      const item = stateList.value.find((state: { id: string }) => state.id === stateId.value)

      if (!item) {
        const defaultItem = stateList.value.find((state: { id: string }) => state.id === '1')
        if (defaultItem) {
          ensureStateColor(defaultItem)
          return defaultItem
        }
      }

      if (item) {
        ensureStateColor(item)
      }
      return item as STO.UserState
    })

    watch(
      stateList,
      (list) => {
        list.forEach((state: any) => ensureStateColor(state))
      },
      { immediate: true }
    )

    return {
      stateList,
      stateId,
      currentState
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)
