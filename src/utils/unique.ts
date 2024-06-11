import type { UserItem } from '@/services/types'

export const uniqueUserList = (arr: UserItem[]) => {
  return Object.values(Object.fromEntries(arr.map((item) => [item.uid, item])))
}
