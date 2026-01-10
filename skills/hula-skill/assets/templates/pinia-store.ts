import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

// Add the enum entry in src/enums/index.ts before using this store.
export const useExampleStore = defineStore(StoresEnum.EXAMPLE, () => {
  const items = ref<string[]>([])

  const addItem = (value: string) => {
    items.value.push(value)
  }

  return { items, addItem }
})
