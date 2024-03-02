import { MockItem } from '@/services/types.ts'

const avatars = 'https://picsum.photos/60'

// TODO 生成随机英文字符串的函数（只用于测试） (nyh -> 2024-02-24 23:26:04)
// type为1为群聊，2为好友
const generateRandomString = (length: number, type: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const charactersLength = characters.length
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  if (type === 1) {
    return result + '群聊'
  } else {
    return result + '好友'
  }
}

export const MockList = ref<MockItem[]>(
  Array.from({ length: 5 }, (_, i) => {
    const type = Math.round(Math.random()) + 1
    return {
      key: i,
      avatar: `${avatars}?${i}`,
      type: type,
      accountId: i,
      accountName: generateRandomString(Math.floor(Math.random() * 10) + 1, type)
    }
  })
)
