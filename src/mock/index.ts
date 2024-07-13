import { MockItem } from '@/services/types.ts'

const avatars = 'https://picsum.photos/140'

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
  Array.from({ length: 20 }, (_, i) => {
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

/** 模拟照片墙 */
const imgList = Array.from({ length: 10 }, (_, i) => {
  return {
    url: `${avatars}?${i}`
  }
})
/** 模拟动态内容 */
export const dynamicList = Array.from({ length: 10 }, (_, i) => {
  return {
    id: i,
    avatar: `${avatars}?${i}`,
    user: `泰勒斯威夫特 ${i}`,
    img: imgList,
    isAuth: i % 2 === 0
  }
})

/** 动态评论 */
export const dynamicCommentList = Array.from({ length: 50 }, (_, i) => {
  return {
    id: i,
    avatar: `${avatars}?${i}`,
    user: `泰勒斯威夫特${i}`,
    content: '点赞了你的动态'
  }
})
