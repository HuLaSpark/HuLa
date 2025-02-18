import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import Colorthief from 'colorthief'

const colorthief = new Colorthief()

export const useUserStatusStore = defineStore(
  StoresEnum.USER_STATE,
  () => {
    /** 在线状态列表 */
    const stateList = ref<STO.UserState[]>([])

    const stateId = ref<number>(1)

    const currentState = computed(() => {
      const id = stateId.value === 0 ? 1 : stateId.value
      const item = stateList.value.find((state) => state.id === id)!
      console.log(item)

      const img = new Image()
      img.src = item.url
      img.onload = async () => {
        const colors = await colorthief.getColor(img, 3)
        item.bgColor = `rgba(${colors.join(',')}, 0.4)`
      }
      return item as STO.UserState
    })

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
